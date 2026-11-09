"""Text-to-speech.

English: edge-tts (neural voices, needs internet).
Japanese: VOICEVOX engine if running locally (set VOICEVOX_SPEAKER to pick a
character voice), otherwise edge-tts Japanese voice.
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
import urllib.parse
import urllib.request

from .audio import play_file

EN_VOICE = os.environ.get("KING_EN_VOICE", "en-US-AriaNeural")
JA_VOICE = os.environ.get("KING_JA_VOICE", "ja-JP-NanamiNeural")
VOICEVOX_URL = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021")
VOICEVOX_SPEAKER = int(os.environ.get("VOICEVOX_SPEAKER", "0"))  # 0 = 四国めたん(あまあま)等、環境で変更


async def _edge_save(text: str, voice: str, path: str, rate: str) -> None:
    import edge_tts

    await edge_tts.Communicate(text, voice, rate=rate).save(path)


def _voicevox_available() -> bool:
    try:
        urllib.request.urlopen(f"{VOICEVOX_URL}/version", timeout=0.5)
        return True
    except Exception:
        return False


def _voicevox_wav(text: str) -> bytes:
    q = urllib.parse.urlencode({"text": text, "speaker": VOICEVOX_SPEAKER})
    req = urllib.request.Request(f"{VOICEVOX_URL}/audio_query?{q}", method="POST")
    query = urllib.request.urlopen(req, timeout=10).read()
    q2 = urllib.parse.urlencode({"speaker": VOICEVOX_SPEAKER})
    req2 = urllib.request.Request(
        f"{VOICEVOX_URL}/synthesis?{q2}",
        data=query,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return urllib.request.urlopen(req2, timeout=30).read()


def speak_en(text: str, rate: str = "+0%") -> None:
    if not text:
        return
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "en.mp3")
        asyncio.run(_edge_save(text, EN_VOICE, path, rate))
        play_file(path)


def speak_ja(text: str) -> None:
    if not text:
        return
    with tempfile.TemporaryDirectory() as d:
        if _voicevox_available():
            path = os.path.join(d, "ja.wav")
            with open(path, "wb") as f:
                f.write(_voicevox_wav(text))
        else:
            path = os.path.join(d, "ja.mp3")
            asyncio.run(_edge_save(text, JA_VOICE, path, "+0%"))
        play_file(path)
