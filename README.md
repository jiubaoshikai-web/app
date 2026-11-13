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

## ブラウザ版 (おすすめ)
```bash
pip install anthropic            # ブラウザ版はこれだけでOK
export ANTHROPIC_API_KEY=sk-ant-...
python -m king_english.server    # → http://127.0.0.1:8000 を Chrome / Edge で開く
```
- 音声認識・読み上げはブラウザ標準(Web Speech API)。マイクを許可してね。
- APIキーはサーバー側だけで使い、ブラウザには渡さない(127.0.0.1のみ待受、同一オリジンのみ許可)。
- 音声認識非対応のブラウザでも、入力欄にタイプすれば使えるわ。

## 使い方 (ターミナル版)
```bash
python -m king_english.main --mode chat --level intermediate          # 自由会話+添削
python -m king_english.main --mode pronunciation --level beginner      # 発音チェック
python -m king_english.main --text                                     # マイク無し(キーボード)
```
### 声の調整
- ブラウザ版: 画面の「🎚 声の設定」で声の種類・高さ・速さを変えられるわ(「元気なアイドル風」ボタンで高め＆やや速めに)。設定はブラウザに保存されるの。
- ターミナル版: `KING_JA_PITCH=+30Hz KING_JA_RATE=+10%`(edge-tts)、`VOICEVOX_PITCH` / `VOICEVOX_SPEED` / `VOICEVOX_INTONATION`(VOICEVOX)で調整。
- 特定の声優・キャラクターの声を複製する機能はないわ。声質を寄せたいときは、VOICEVOXなど利用規約上問題のない音声の中から話者を選んでね。

VOICEVOX を使う場合はエンジンを起動し `VOICEVOX_SPEAKER` に話者IDを指定。
環境変数: `KING_MODEL`, `KING_EN_VOICE`, `KING_JA_VOICE`, `VOICEVOX_URL`。

## テスト
```bash
pytest
node tests/pron.test.js
```

※ 「キングヘイロー」は権利者のキャラクターです。個人利用の範囲で、公式音声の無断利用は避けてください。
