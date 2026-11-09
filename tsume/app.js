(function () {
  'use strict';
  const S = window.Shogi;
  const PROBLEMS = window.TSUME_PROBLEMS;
  const $ = (id) => document.getElementById(id);

  const LEVELS = [
    { ply: 1, label: '1手詰' },
    { ply: 3, label: '3手詰' },
    { ply: 5, label: '5手詰' },
  ];

  const SAY = {
    start: ['一流の詰将棋、見せてもらうわよ!', 'さあ、この King に相応しい一手を指しなさい!', '落ち着いて、王手の連続よ。'],
    good: ['そうよ、その調子!', 'ふふん、いい手じゃない。', 'おーっほっほっほ! 悪くないわ。'],
    solved: ['詰みよ!おーっほっほっほ! さすが一流ね!', 'お見事! この King が認めてあげるわ!', '完璧な詰みね。一流のウマ娘にふさわしい腕前だわ!'],
    notCheck: ['王手になっていないじゃない! 詰将棋は王手の連続よ。', 'ちょっと、それは王手じゃないわよ!'],
    wrong: ['その王手では詰まないわ… もう一度考えなさい!', 'うっ、逃げられちゃうわよ。落ち着いて読み直しなさい!', 'まだまだ一流には遠いわね。でも諦めないで!'],
    hint1: ['しょうがないわね、この駒に注目なさい。'],
    hint2: ['まったく…ここまで教えてあげるのは特別よ!'],
    answer: ['解答よ。しっかり復習なさい!'],
  };
  const say = (kind, cls) => {
    const arr = SAY[kind];
    const el = $('say');
    el.textContent = arr[Math.floor(Math.random() * arr.length)];
    el.className = 'bubble' + (cls ? ' ' + cls : '');
  };

  let level = LEVELS[0].ply;
  let problem = null;
  let state = null;
  let history = [];      // 攻方が指す前の局面(元に戻す用)
  let selected = null;   // {kind:'board', idx} | {kind:'hand', piece}
  let pendingPromo = null;
  let busy = false;
  let solved = false;
  let hintStage = 0;
  let lastMove = null;
  let hintMove = null;
  let remaining = 0;

  const store = {
    get() { try { return JSON.parse(localStorage.getItem('tsume-solved') || '{}'); } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem('tsume-solved', JSON.stringify(o)); } catch (e) { /* ignore */ } },
  };

  function buildStatic() {
    const files = $('files'), ranks = $('ranks');
    for (let f = 9; f >= 1; f--) { const d = document.createElement('div'); d.textContent = S.ZEN[f]; files.appendChild(d); }
    for (let r = 1; r <= 9; r++) { const d = document.createElement('div'); d.textContent = S.KAN[r]; ranks.appendChild(d); }
    $('tabs').innerHTML = '';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.textContent = lv.label; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(lv.ply === level));
      b.onclick = () => { level = lv.ply; renderPicker(); loadProblem(PROBLEMS.find((p) => p.ply === level)); };
      $('tabs').appendChild(b);
    });
  }

  function renderPicker() {
    [...$('tabs').children].forEach((b, i) => b.setAttribute('aria-selected', String(LEVELS[i].ply === level)));
    const done = store.get();
    const list = $('list');
    list.innerHTML = '';
    PROBLEMS.filter((p) => p.ply === level).forEach((p, i) => {
      const b = document.createElement('button');
      b.textContent = (i + 1) + '. ' + p.title;
      if (problem && p.id === problem.id) b.classList.add('current');
      if (done[p.id]) b.classList.add('solved');
      b.onclick = () => loadProblem(p);
      list.appendChild(b);
    });
  }

  function pieceEl(p, small) {
    const t = S.typeOf(p);
    const el = document.createElement('div');
    el.className = 'piece ' + S.sideOf(p) + (t[0] === '+' ? ' promo' : '') + (small ? ' small' : '');
    el.textContent = S.pieceName(p);
    return el;
  }

  function legalNow() { return S.legalMoves(state); }

  function render() {
    const board = $('board');
    board.innerHTML = '';
    const moves = (selected && !busy && !solved) ? legalNow().filter((m) =>
      selected.kind === 'board' ? m.from === selected.idx : (m.drop === selected.piece)) : [];
    const tgt = new Map();
    moves.forEach((m) => tgt.set(m.to, true));
    for (let i = 0; i < 81; i++) {
      const c = document.createElement('div');
      c.className = 'cell';
      if (lastMove && lastMove.to === i) c.classList.add('last');
      if (tgt.has(i)) { c.classList.add('target'); if (state.board[i]) c.classList.add('cap'); }
      if (selected && selected.kind === 'board' && selected.idx === i) c.classList.add('selected');
      if (hintMove && !hintMove.drop && hintMove.from === i && hintStage >= 1) c.classList.add('hint');
      if (hintMove && hintStage >= 2 && hintMove.to === i) c.classList.add('hint');
      if (state.board[i]) c.appendChild(pieceEl(state.board[i]));
      c.onclick = () => onCell(i);
      board.appendChild(c);
    }
    const hand = $('hand');
    hand.innerHTML = '';
    const types = S.HAND_TYPES.filter((t) => state.hands.b[t]);
    if (!types.length) { hand.innerHTML = '<span class="hand-empty">なし</span>'; }
    types.forEach((t) => {
      const w = document.createElement('div');
      w.className = 'hand-item';
      if (selected && selected.kind === 'hand' && selected.piece === t) w.classList.add('selected');
      if (hintMove && hintMove.drop === t && hintStage >= 1) w.classList.add('hint');
      w.appendChild(pieceEl(t, true));
      if (state.hands.b[t] > 1) { const n = document.createElement('span'); n.className = 'count'; n.textContent = state.hands.b[t]; w.appendChild(n); }
      w.onclick = () => onHand(t);
      hand.appendChild(w);
    });
    $('btn-undo').disabled = busy || solved || history.length === 0;
    $('btn-hint').disabled = busy || solved;
  }

  function loadProblem(p) {
    problem = p;
    level = p.ply;
    state = S.parseSfen(p.sfen);
    history = []; selected = null; pendingPromo = null; busy = false; solved = false;
    hintStage = 0; hintMove = null; lastMove = null; remaining = p.moves;
    $('title').textContent = '第' + (PROBLEMS.filter((q) => q.ply === p.ply).indexOf(p) + 1) + '問 ' + p.title + '(' + p.ply + '手詰)';
    $('answer').hidden = true; $('promo').hidden = true;
    say('start');
    renderPicker(); render();
  }

  function onHand(t) {
    if (busy || solved) return;
    selected = (selected && selected.kind === 'hand' && selected.piece === t) ? null : { kind: 'hand', piece: t };
    $('promo').hidden = true; pendingPromo = null;
    render();
  }

  function onCell(i) {
    if (busy || solved) return;
    const p = state.board[i];
    if (selected) {
      const cands = legalNow().filter((m) => m.to === i && (selected.kind === 'board' ? m.from === selected.idx : m.drop === selected.piece));
      if (cands.length === 1) { selected = null; return attempt(cands[0]); }
      if (cands.length === 2) { // 成/不成
        pendingPromo = cands; $('promo').hidden = false; return render();
      }
    }
    $('promo').hidden = true; pendingPromo = null;
    if (p && S.sideOf(p) === 'b') {
      selected = (selected && selected.kind === 'board' && selected.idx === i) ? null : { kind: 'board', idx: i };
    } else selected = null;
    render();
  }

  $('promo').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !pendingPromo) return;
    const m = pendingPromo.find((x) => x.promote === (b.dataset.p === '1'));
    $('promo').hidden = true; pendingPromo = null; selected = null;
    attempt(m);
  });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function attempt(m) {
    busy = true; hintStage = 0; hintMove = null;
    const before = state;
    const k = S.minMate(before, remaining) || remaining;
    const after = S.applyMove(before, m);
    lastMove = m; state = after; render();
    const replies = S.legalMoves(after);
    const check = S.inCheck(after, 'w');
    const good = check && (replies.length === 0 ||
      (k > 1 && replies.every((r) => S.isMateIn(S.applyMove(after, r), k - 1))));
    if (!check || !good) {
      say(check ? 'wrong' : 'notCheck', 'bad');
      await wait(900);
      state = before; lastMove = null; busy = false; render();
      return;
    }
    history.push({ state: before, remaining });
    if (replies.length === 0) {
      solved = true; busy = false;
      const done = store.get(); done[problem.id] = true; store.set(done);
      say('solved', 'good'); renderPicker(); render();
      return;
    }
    say('good', 'good');
    await wait(650);
    const d = S.bestDefense(after, k - 1);
    state = S.applyMove(after, d); lastMove = d; remaining = k - 1;
    busy = false; render();
  }

  $('btn-hint').onclick = () => {
    if (busy || solved) return;
    const k = S.minMate(state, remaining) || remaining;
    hintMove = S.winningMoves(state, k)[0];
    hintStage = Math.min(2, hintStage + 1);
    if (hintStage === 2) {
      $('say').textContent = S.moveText(state, hintMove) + ' …よ。ここまで教えてあげるのは特別なんだから!';
      $('say').className = 'bubble';
    } else say('hint1');
    render();
  };

  $('btn-undo').onclick = () => {
    if (busy || solved || !history.length) return;
    const h = history.pop();
    state = h.state; remaining = h.remaining; selected = null; lastMove = null; hintStage = 0; hintMove = null;
    $('say').textContent = 'いいわ、一手戻してあげる。今度は慎重にね。'; $('say').className = 'bubble';
    render();
  };

  $('btn-reset').onclick = () => loadProblem(problem);

  $('btn-answer').onclick = () => {
    const start = S.parseSfen(problem.sfen);
    const pv = S.principalVariation(start, problem.moves);
    $('answer').textContent = '解答: ' + pv.map((x) => x.text).join(' ');
    $('answer').hidden = false;
    say('answer');
  };

  $('btn-next').onclick = () => {
    const same = PROBLEMS.filter((p) => p.ply === level);
    const i = same.indexOf(problem);
    const next = same[(i + 1) % same.length];
    loadProblem(next);
  };

  buildStatic();
  loadProblem(PROBLEMS[0]);
})();
