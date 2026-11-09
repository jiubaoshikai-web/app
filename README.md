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
VOICEVOX を使う場合はエンジンを起動し `VOICEVOX_SPEAKER` に話者IDを指定。
環境変数: `KING_MODEL`, `KING_EN_VOICE`, `KING_JA_VOICE`, `VOICEVOX_URL`。

## 詰将棋 (tsume/)
サーバー不要のブラウザアプリ。`tsume/index.html` を開くだけで遊べるわ(またはお好みの静的サーバーで配信)。
```bash
python -m http.server 8080 -d tsume    # → http://127.0.0.1:8080
node tests/tsume.test.js               # エンジン・収録問題の検証
```
- 1手詰 / 3手詰 / 5手詰 を収録(全問、最短手数・初手の一意性をテストで検証済み)
- 駒を選ぶと動ける升がハイライト。持駒は盤の下から選んで打つ。成/不成の選択あり
- 王手でない手・詰まない王手は自動で差し戻し、正しい手なら玉方が最善(最長抵抗)で応じる
- ヒント(2段階) / 一手戻す / やり直し / 解答表示、キングヘイロー風の応援メッセージ
- 簡易ルール: 玉方の持駒はなし。二歩・行き所のない駒・打ち歩詰めは反則として判定
- 問題追加は `tsume/problems.js` に SFEN(`盤面 b 持駒`)を足し、テストを通すだけ

## テスト
```bash
pytest
node tests/pron.test.js
node tests/tsume.test.js
```

※ 「キングヘイロー」は権利者のキャラクターです。個人利用の範囲で、公式音声の無断利用は避けてください。
