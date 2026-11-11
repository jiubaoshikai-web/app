"""Tiny local web server: serves web/ and proxies chat to the Claude API.

The API key stays on the server; the browser only talks to 127.0.0.1.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import persona
from .llm import DEFAULT_MODEL, Conversation

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
MAX_BODY = 64 * 1024
MAX_MESSAGES = 40
MAX_CHARS = 1000


class BadRequest(ValueError):
    pass


def config_payload() -> dict:
    return {
        "levels": persona.LEVELS,
        "sentences": persona.PRACTICE_SENTENCES,
        "greeting_ja": persona.GREETING_JA,
        "greeting_en": persona.GREETING_EN,
        "pron_perfect_ja": persona.PRON_PERFECT_JA,
        "pron_retry_ja": persona.PRON_RETRY_JA,
    }


def handle_chat(payload: dict, client=None, model: str = DEFAULT_MODEL) -> dict:
    """payload: {level, messages:[{role,content}...]} ending with a user message."""
    level = payload.get("level", "intermediate")
    messages = payload.get("messages")
    if level not in persona.LEVELS:
        raise BadRequest("invalid level")
    if not isinstance(messages, list) or not messages or len(messages) > MAX_MESSAGES:
        raise BadRequest("invalid messages")
    clean = []
    for i, m in enumerate(messages):
        want = "user" if i % 2 == 0 else "assistant"
        if not isinstance(m, dict) or m.get("role") != want or not isinstance(m.get("content"), str):
            raise BadRequest("messages must alternate user/assistant, starting with user")
        content = m["content"].strip()
        if not content or len(content) > MAX_CHARS * (3 if want == "assistant" else 1):
            raise BadRequest("invalid message content")
        clean.append({"role": want, "content": content})
    if clean[-1]["role"] != "user":
        raise BadRequest("last message must be from user")

    convo = Conversation(level=level, model=model, client=client)
    convo.history = clean[:-1]
    turn = convo.say(clean[-1]["content"])
    return {
        "reply_en": turn.reply_en,
        "corrected": turn.corrected,
        "feedback_ja": turn.feedback_ja,
        "has_mistake": turn.has_mistake,
        "raw": turn.raw,
    }


def make_handler(model: str):
    class Handler(BaseHTTPRequestHandler):
        def _json(self, code: int, obj: dict) -> None:
            body = json.dumps(obj, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/api/config":
                return self._json(200, config_payload())
            rel = "index.html" if path == "/" else path.lstrip("/")
            f = (WEB_DIR / rel).resolve()
            if WEB_DIR not in f.parents or not f.is_file():
                return self._json(404, {"error": "not found"})
            data = f.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(f.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            if self.path != "/api/chat":
                return self._json(404, {"error": "not found"})
            # Same-origin only: block cross-site pages from spending the API key.
            origin = self.headers.get("Origin")
            if origin and origin.split("://", 1)[-1] != self.headers.get("Host"):
                return self._json(403, {"error": "forbidden origin"})
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n <= 0 or n > MAX_BODY:
                    raise BadRequest("bad body size")
                payload = json.loads(self.rfile.read(n))
                if not isinstance(payload, dict):
                    raise BadRequest("payload must be an object")
                self._json(200, handle_chat(payload, model=model))
            except (BadRequest, json.JSONDecodeError) as e:
                self._json(400, {"error": str(e)})
            except Exception as e:  # API/network failure
                self._json(502, {"error": f"upstream error: {type(e).__name__}"})

        def log_message(self, *a):
            pass

    return Handler


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--model", default=DEFAULT_MODEL)
    args = p.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args.model))
    print(f"King English: http://127.0.0.1:{args.port}  (Chrome / Edge 推奨)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
