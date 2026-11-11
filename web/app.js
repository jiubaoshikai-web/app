const $ = (id) => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let cfg, history = [], recog = null, listening = false, sentenceIdx = 0, order = [];

function add(cls, html) {
  const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html;
  $('log').appendChild(d); $('log').scrollTop = 1e9; return d;
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pickVoice(lang) {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith(lang));
  return vs.find((v) => /natural|google|samantha|kyoko|nanami/i.test(v.name)) || vs[0];
}
function speak(text, lang) {
  return new Promise((res) => {
    if (!$('voiceOut').checked || !text) return res();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang;
    const v = pickVoice(lang.slice(0, 2)); if (v) u.voice = v;
    u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
  });
}
async function kingJa(t) { add('king', esc(t)); await speak(t, 'ja-JP'); }
async function kingEn(t) { add('king', esc(t)); await speak(t, 'en-US'); }

async function chatSend(text) {
  add('me', esc(text));
  history.push({ role: 'user', content: text });
  const wait = add('fb', '考え中…');
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: $('level').value, messages: history }) });
    const j = await r.json(); wait.remove();
    if (!r.ok) throw new Error(j.error || r.status);
    history.push({ role: 'assistant', content: j.raw || j.reply_en });
    if (j.has_mistake) add('fb', `✏️ <span class="corr">${esc(j.corrected)}</span>`);
    if (j.feedback_ja) await kingJa(j.feedback_ja);
    await kingEn(j.reply_en);
  } catch (e) {
    wait.remove(); history.pop(); add('fb', 'エラーよ: ' + esc(String(e.message || e)));
  }
}

function startPron() {
  order = [...(cfg.sentences[$('level').value])].sort(() => Math.random() - .5); sentenceIdx = 0; showTarget();
}
function showTarget() {
  $('target').textContent = order[sentenceIdx % order.length]; $('result').textContent = '';
  speak($('target').textContent, 'en-US');
}
async function pronCheck(heard) {
  const target = order[sentenceIdx % order.length];
  const r = Pron.score(target, heard);
  $('result').innerHTML = `スコア <b>${r.score}</b>/100　` + r.words.map((w) =>
    `<span class="${w.ok ? 'w-ok' : 'w-ng'}">${esc(w.target)}${w.ok ? '' : '→' + esc(w.heard || '∅')}</span>`).join(' ');
  await kingJa(r.score >= 85 ? cfg.pron_perfect_ja : cfg.pron_retry_ja);
}

function onText(text) {
  text = text.trim(); if (!text) return;
  if ($('mode').value === 'chat') chatSend(text); else pronCheck(text);
}

function toggleMic() {
  if (!SR) return;
  if (listening) { recog.stop(); return; }
  recog = new SR(); recog.lang = 'en-US'; recog.interimResults = false; recog.maxAlternatives = 1;
  recog.onstart = () => { listening = true; $('mic').classList.add('rec'); $('mic').textContent = '■ 停止'; };
  recog.onend = () => { listening = false; $('mic').classList.remove('rec'); $('mic').textContent = '🎙 話す'; };
  recog.onerror = (e) => add('fb', '音声認識エラー: ' + esc(e.error));
  recog.onresult = (e) => onText(e.results[0][0].transcript);
  speechSynthesis.cancel(); recog.start();
}

async function init() {
  cfg = await (await fetch('/api/config')).json();
  for (const [k, v] of Object.entries(cfg.levels)) $('level').add(new Option(v, k, false, k === 'intermediate'));
  if (!SR) { $('warn').hidden = false; $('mic').disabled = true; }
  $('mic').onclick = toggleMic;
  $('form').onsubmit = (e) => { e.preventDefault(); onText($('text').value); $('text').value = ''; };
  $('nextBtn').onclick = () => { sentenceIdx++; showTarget(); };
  const reset = () => {
    speechSynthesis.cancel(); $('log').innerHTML = ''; history = [];
    const pron = $('mode').value === 'pron'; $('pronBox').hidden = !pron;
    if (pron) { kingJa('発音チェックよ。表示された文を声に出しなさい。'); startPron(); }
    else { kingJa(cfg.greeting_ja).then(() => kingEn(cfg.greeting_en)); }
  };
  $('mode').onchange = reset; $('level').onchange = reset;
  document.body.addEventListener('click', function once() { // browsers need a gesture before speech
    document.body.removeEventListener('click', once); }, { once: true });
  add('king', esc(cfg.greeting_ja)); add('king', esc(cfg.greeting_en));
  speechSynthesis.getVoices();
}
init();
