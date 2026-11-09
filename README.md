# King English — 英語練習ボイスロイド

ウマ娘「キングヘイロー」風の口調で、英語の自由会話・添削・発音チェックを手伝ってくれるローカル音声アプリ。

## 構成
- STT: faster-whisper (ローカル、単語ごとの信頼度で発音を評価)
- 会話/添削: Claude API (`ANTHROPIC_API_KEY` が必要)
- TTS: 英語は edge-tts、日本語は VOICEVOX(起動していれば) または edge-tts

## セットアップ
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

## 使い方
```bash
python -m king_english.main --mode chat --level intermediate          # 自由会話+添削
python -m king_english.main --mode pronunciation --level beginner      # 発音チェック
python -m king_english.main --text                                     # マイク無し(キーボード)
```
VOICEVOX を使う場合はエンジンを起動し `VOICEVOX_SPEAKER` に話者IDを指定。
環境変数: `KING_MODEL`, `KING_EN_VOICE`, `KING_JA_VOICE`, `VOICEVOX_URL`。

## テスト
```bash
pytest
```

※ 「キングヘイロー」は権利者のキャラクターです。個人利用の範囲で、公式音声の無断利用は避けてください。
