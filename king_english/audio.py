"""Microphone recording (energy-based endpointing) and playback."""
from __future__ import annotations

import numpy as np

SAMPLE_RATE = 16000


def record_until_silence(
    max_seconds: float = 20.0,
    silence_seconds: float = 1.2,
    threshold: float = 0.015,
) -> np.ndarray:
    """Record mono audio; stop after `silence_seconds` of quiet following speech."""
    import sounddevice as sd

    block = int(SAMPLE_RATE * 0.1)
    chunks: list[np.ndarray] = []
    heard_speech = False
    quiet = 0.0
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32") as stream:
        for _ in range(int(max_seconds / 0.1)):
            data, _ = stream.read(block)
            data = data[:, 0]
            chunks.append(data)
            if np.sqrt(np.mean(data**2)) > threshold:
                heard_speech, quiet = True, 0.0
            elif heard_speech:
                quiet += 0.1
                if quiet >= silence_seconds:
                    break
    return np.concatenate(chunks) if chunks else np.zeros(0, dtype="float32")


def play_file(path: str) -> None:
    import pygame

    if not pygame.mixer.get_init():
        pygame.mixer.init()
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        pygame.time.wait(50)
