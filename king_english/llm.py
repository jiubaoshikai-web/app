"""Conversation engine backed by the Anthropic API."""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass

from .persona import CHAT_SYSTEM_PROMPT, LEVELS

DEFAULT_MODEL = os.environ.get("KING_MODEL", "claude-haiku-5-5")


@dataclass
class Turn:
    reply_en: str
    corrected: str
    feedback_ja: str
    has_mistake: bool
    raw: str = ""


def parse_turn(raw: str, fallback_user_text: str = "") -> Turn:
    """Parse the model's JSON output; tolerate code fences and stray text."""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            return Turn(
                reply_en=str(data.get("reply_en", "")).strip(),
                corrected=str(data.get("corrected", fallback_user_text)).strip(),
                feedback_ja=str(data.get("feedback_ja", "")).strip(),
                has_mistake=bool(data.get("has_mistake", False)),
                raw=raw,
            )
        except json.JSONDecodeError:
            pass
    # Fallback: treat the whole thing as the English reply.
    return Turn(reply_en=text, corrected=fallback_user_text, feedback_ja="", has_mistake=False, raw=raw)


class Conversation:
    def __init__(self, level: str = "intermediate", model: str = DEFAULT_MODEL, client=None):
        if level not in LEVELS:
            raise ValueError(f"level must be one of {list(LEVELS)}")
        if client is None:
            import anthropic

            client = anthropic.Anthropic()
        self.client = client
        self.model = model
        self.system = CHAT_SYSTEM_PROMPT.format(level=LEVELS[level])
        self.history: list[dict] = []

    def say(self, user_text: str) -> Turn:
        self.history.append({"role": "user", "content": user_text})
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=600,
            system=self.system,
            messages=self.history,
        )
        raw = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
        turn = parse_turn(raw, user_text)
        # Keep history compact: store only the English reply as the assistant turn.
        self.history.append({"role": "assistant", "content": raw})
        return turn
