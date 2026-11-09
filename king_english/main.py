"""CLI entry point: `python -m king_english.main`."""
from __future__ import annotations

import argparse
import random

from . import persona
from .pronunciation import score_pronunciation


class IO:
    """Input/output abstraction so the app also runs without mic/speakers."""

    def __init__(self, use_voice: bool, whisper_model: str):
        self.use_voice = use_voice
        self.transcriber = None
        if use_voice:
            from .stt import Transcriber

            print("(Whisperモデルを読み込み中…)")
            self.transcriber = Transcriber(whisper_model)

    def listen(self, prompt: str = "あなた") -> tuple[str, dict[int, float]]:
        if self.use_voice:
            from .audio import record_until_silence

            input(f"[Enterで録音開始 → 話し終えると自動で止まるわ] ")
            print("🎙  Listening...")
            audio = record_until_silence()
            text, conf = self.transcriber.transcribe(audio)
            print(f"{prompt}(認識): {text}")
            return text, conf
        text = input(f"{prompt}> ").strip()
        return text, {}

    def say_en(self, text: str) -> None:
        print(f"King: {text}")
        if self.use_voice:
            from .tts import speak_en

            speak_en(text)

    def say_ja(self, text: str) -> None:
        print(f"キング: {text}")
        if self.use_voice:
            from .tts import speak_ja

            speak_ja(text)


def run_chat(io: IO, level: str, model: str) -> None:
    from .llm import Conversation

    convo = Conversation(level=level, model=model)
    io.say_ja(persona.GREETING_JA)
    io.say_en(persona.GREETING_EN)
    print("(終了: 'quit' / 空入力2回)")
    empty = 0
    while True:
        text, _ = io.listen()
        if text.lower() in {"quit", "exit"}:
            break
        if not text:
            empty += 1
            if empty >= 2:
                break
            continue
        empty = 0
        turn = convo.say(text)
        if turn.has_mistake:
            print(f"  ✏️  添削: {turn.corrected}")
        if turn.feedback_ja:
            io.say_ja(turn.feedback_ja)
        io.say_en(turn.reply_en)
    io.say_ja("今日はここまでね。お疲れさま、トレーナー。……ま、まあ、少しは上達したんじゃないかしら？")


def run_pronunciation(io: IO, level: str) -> None:
    sentences = persona.PRACTICE_SENTENCES[level][:]
    random.shuffle(sentences)
    io.say_ja("発音チェックよ。私が読む文をそのまま声に出しなさい。")
    for target in sentences:
        while True:
            io.say_en(target)
            print(f"👉 {target}")
            heard, conf = io.listen()
            if heard.lower() in {"quit", "exit"}:
                return
            res = score_pronunciation(target, heard, conf)
            print(f"  スコア: {res.score}/100")
            for w in res.missed:
                got = w.heard or "(聞き取れず)"
                print(f"   ✗ {w.target}  → {got}")
            if res.score >= 85:
                io.say_ja(persona.PRON_PERFECT_JA)
                break
            io.say_ja(persona.PRON_RETRY_JA)
            if not io.use_voice and not heard:
                break
    io.say_ja("全部終わったわ。おーっほっほっほ！")


def main() -> None:
    p = argparse.ArgumentParser(description="King Halo English practice voiceroid")
    p.add_argument("--mode", choices=["chat", "pronunciation"], default="chat")
    p.add_argument("--level", choices=list(persona.LEVELS), default="intermediate")
    p.add_argument("--text", action="store_true", help="マイク/音声なし(キーボード入力のみ)")
    p.add_argument("--whisper", default="base.en", help="faster-whisperのモデルサイズ")
    p.add_argument("--model", default=None, help="Claudeモデル(既定: claude-haiku-5-5)")
    args = p.parse_args()

    io = IO(use_voice=not args.text, whisper_model=args.whisper)
    if args.mode == "chat":
        from .llm import DEFAULT_MODEL

        run_chat(io, args.level, args.model or DEFAULT_MODEL)
    else:
        run_pronunciation(io, args.level)


if __name__ == "__main__":
    main()
