"""Speech-to-text via faster-whisper (local)."""
from __future__ import annotations

import numpy as np

from .audio import SAMPLE_RATE


class Transcriber:
    def __init__(self, model_size: str = "base.en"):
        from faster_whisper import WhisperModel

        self.model = WhisperModel(model_size, device="auto", compute_type="auto")

    def transcribe(self, audio: np.ndarray) -> tuple[str, dict[int, float]]:
        """Return (text, {word_index: probability})."""
        segments, _ = self.model.transcribe(
            audio.astype(np.float32), language="en", word_timestamps=True, beam_size=5
        )
        words, conf = [], {}
        from .pronunciation import normalize_words

        for seg in segments:
            for w in seg.words or []:
                for piece in normalize_words(w.word):
                    conf[len(words)] = float(w.probability)
                    words.append(piece)
        return " ".join(words), conf
