"""Pronunciation scoring: compare recognised speech against a target sentence."""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field


def normalize_words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


@dataclass
class WordResult:
    target: str
    heard: str | None
    ok: bool
    confidence: float | None = None


@dataclass
class PronunciationResult:
    score: int
    words: list[WordResult] = field(default_factory=list)

    @property
    def missed(self) -> list[WordResult]:
        return [w for w in self.words if not w.ok]


def score_pronunciation(
    target: str,
    heard: str,
    heard_confidences: dict[int, float] | None = None,
    low_conf: float = 0.6,
) -> PronunciationResult:
    """Align heard words with target words.

    `heard_confidences` maps index in the *heard* word list to ASR probability;
    words recognised correctly but with low confidence are flagged as unclear.
    Score = 100 * mean(per-word credit) over target words.
    """
    t_words = normalize_words(target)
    h_words = normalize_words(heard)
    heard_confidences = heard_confidences or {}
    if not t_words:
        return PronunciationResult(0, [])

    sm = difflib.SequenceMatcher(a=t_words, b=h_words, autojunk=False)
    results: list[WordResult] = []
    credit = 0.0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                conf = heard_confidences.get(j1 + k)
                unclear = conf is not None and conf < low_conf
                results.append(WordResult(t_words[i1 + k], h_words[j1 + k], not unclear, conf))
                credit += 0.7 if unclear else 1.0
        elif tag == "replace":
            for k in range(i2 - i1):
                heard_w = h_words[j1 + k] if j1 + k < j2 else None
                sim = difflib.SequenceMatcher(a=t_words[i1 + k], b=heard_w or "").ratio()
                results.append(WordResult(t_words[i1 + k], heard_w, False))
                credit += 0.5 * sim  # near-miss gets partial credit
        elif tag == "delete":
            for k in range(i2 - i1):
                results.append(WordResult(t_words[i1 + k], None, False))
        # "insert": extra heard words carry no credit but no extra penalty
    return PronunciationResult(round(100 * credit / len(t_words)), results)
