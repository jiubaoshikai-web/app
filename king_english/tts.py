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

# 声の調整 (明るく元気なアイドル風に寄せたいときは pitch を上げ、rate を少し速く)
# edge-tts: pitch は "+20Hz" 形式, rate は "+10%" 形式
EN_PITCH = os.environ.get("KING_EN_PITCH", "+0Hz")
EN_RATE = os.environ.get("KING_EN_RATE", "+0%")
JA_PITCH = os.environ.get("KING_JA_PITCH", "+0Hz")
JA_RATE = os.environ.get("KING_JA_RATE", "+0%")
# VOICEVOX: speed 1.0 / pitch 0.0 / intonation 1.0 が標準
VV_SPEED = float(os.environ.get("VOICEVOX_SPEED", "1.0"))
VV_PITCH = float(os.environ.get("VOICEVOX_PITCH", "0.0"))
VV_INTONATION = float(os.environ.get("VOICEVOX_INTONATION", "1.0"))


async def _edge_save(text: str, voice: str, path: str, rate: str, pitch: str) -> None:
    import edge_tts

    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)


def _voicevox_available() -> bool:
    try:
        urllib.request.urlopen(f"{VOICEVOX_URL}/version", timeout=0.5)
        return True
    except Exception:
        return False


def _voicevox_wav(text: str) -> bytes:
    q = urllib.parse.urlencode({"text": text, "speaker": VOICEVOX_SPEAKER})
    req = urllib.request.Request(f"{VOICEVOX_URL}/audio_query?{q}", method="POST")
    query = json.loads(urllib.request.urlopen(req, timeout=10).read())
    query["speedScale"] = VV_SPEED
    query["pitchScale"] = VV_PITCH
    query["intonationScale"] = VV_INTONATION
    query = json.dumps(query).encode()
    q2 = urllib.parse.urlencode({"speaker": VOICEVOX_SPEAKER})
    req2 = urllib.request.Request(
        f"{VOICEVOX_URL}/synthesis?{q2}",
        data=query,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return urllib.request.urlopen(req2, timeout=30).read()


def speak_en(text: str) -> None:
    if not text:
        return
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "en.mp3")
        asyncio.run(_edge_save(text, EN_VOICE, path, EN_RATE, EN_PITCH))
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
            asyncio.run(_edge_save(text, JA_VOICE, path, JA_RATE, JA_PITCH))
        play_file(path)
