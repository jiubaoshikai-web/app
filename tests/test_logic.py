from king_english.llm import parse_turn
from king_english.pronunciation import score_pronunciation


def test_perfect():
    r = score_pronunciation("I would like a coffee.", "i would like a coffee")
    assert r.score == 100 and not r.missed


def test_missing_and_wrong_word():
    r = score_pronunciation("I would like a coffee", "I would like coffee")
    assert r.score < 100
    assert [w.target for w in r.missed] == ["a"]
    r2 = score_pronunciation("three thirsty thrushes", "tree thirsty thrushes")
    assert [w.target for w in r2.missed] == ["three"]
    assert 60 < r2.score < 100


def test_low_confidence_flags_word():
    r = score_pronunciation("hello world", "hello world", {0: 0.95, 1: 0.3})
    assert [w.target for w in r.missed] == ["world"]
    assert r.score == 85


def test_parse_turn_fenced_json():
    raw = '```json\n{"reply_en":"Hi!","corrected":"I am fine.","feedback_ja":"よろしい","has_mistake":true}\n```'
    t = parse_turn(raw, "I fine")
    assert t.reply_en == "Hi!" and t.has_mistake and t.corrected == "I am fine."


def test_parse_turn_fallback():
    t = parse_turn("Just plain text", "hello")
    assert t.reply_en == "Just plain text" and t.corrected == "hello"
