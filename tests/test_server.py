import pytest

from king_english.server import BadRequest, handle_chat


class FakeClient:
    class messages:
        calls = []

        @classmethod
        def create(cls, **kw):
            cls.calls.append({**kw, "messages": list(kw["messages"])})
            block = type("B", (), {"type": "text", "text": '{"reply_en":"Nice!","corrected":"I am fine.","feedback_ja":"ok","has_mistake":true}'})
            return type("R", (), {"content": [block]})


def test_handle_chat_roundtrip():
    out = handle_chat({"level": "beginner", "messages": [{"role": "user", "content": "I fine"}]}, client=FakeClient)
    assert out["reply_en"] == "Nice!" and out["has_mistake"] and out["raw"].startswith("{")
    assert FakeClient.messages.calls[-1]["messages"] == [{"role": "user", "content": "I fine"}]


def test_history_is_passed():
    msgs = [{"role": "user", "content": "a"}, {"role": "assistant", "content": "{}"}, {"role": "user", "content": "b"}]
    handle_chat({"messages": msgs}, client=FakeClient)
    assert len(FakeClient.messages.calls[-1]["messages"]) == 3


@pytest.mark.parametrize("payload", [
    {"level": "god", "messages": [{"role": "user", "content": "x"}]},
    {"messages": []},
    {"messages": [{"role": "assistant", "content": "x"}]},
    {"messages": [{"role": "user", "content": "x"}, {"role": "user", "content": "y"}]},
    {"messages": [{"role": "user", "content": "x" * 5000}]},
    {"messages": "hi"},
])
def test_rejects_bad_payload(payload):
    with pytest.raises(BadRequest):
        handle_chat(payload, client=FakeClient)
