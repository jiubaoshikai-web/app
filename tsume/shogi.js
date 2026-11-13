/* 将棋エンジン(詰将棋用)
 * 盤面: 81要素の配列。index = 段(0=一段目..8=九段目)*9 + 列(0=9筋..8=1筋)
 * 駒: 大文字=先手(攻方) / 小文字=後手(玉方) / '+' が付くと成駒
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Shogi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const KING = ORTH.concat(DIAG);
  const GOLD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
  const STEPS = {
    P: [[-1, 0]],
    N: [[-2, -1], [-2, 1]],
    S: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]],
    G: GOLD, '+P': GOLD, '+L': GOLD, '+N': GOLD, '+S': GOLD,
    K: KING, '+B': ORTH, '+R': DIAG,
  };
  const SLIDES = {
    L: [[-1, 0]], B: DIAG, '+B': DIAG, R: ORTH, '+R': ORTH,
  };
  const PROMOTABLE = { P: 1, L: 1, N: 1, S: 1, B: 1, R: 1 };
  const HAND_TYPES = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

  const NAMES = {
    P: '歩', L: '香', N: '桂', S: '銀', G: '金', B: '角', R: '飛', K: '玉',
    '+P': 'と', '+L': '杏', '+N': '圭', '+S': '全', '+B': '馬', '+R': '龍',
  };
  const ZEN = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
  const KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function sideOf(p) { return p === p.toUpperCase() ? 'b' : 'w'; }
  function typeOf(p) { return (p[0] === '+' ? '+' : '') + p.replace('+', '').toUpperCase(); }
  function baseOf(p) { return p.replace('+', '').toUpperCase(); }
  function other(side) { return side === 'b' ? 'w' : 'b'; }
  function fileOf(idx) { return 9 - (idx % 9); }
  function rankOf(idx) { return Math.floor(idx / 9) + 1; }

  function inZone(side, row) { return side === 'b' ? row <= 2 : row >= 6; }
  function mustPromote(side, type, row) {
    if (type === 'P' || type === 'L') return side === 'b' ? row === 0 : row === 8;
    if (type === 'N') return side === 'b' ? row <= 1 : row >= 7;
    return false;
  }

  function parseSfen(sfen) {
    const parts = sfen.trim().split(/\s+/);
    const board = new Array(81).fill(null);
    const rows = parts[0].split('/');
    if (rows.length !== 9) throw new Error('bad sfen rows: ' + sfen);
    rows.forEach((row, r) => {
      let c = 0, promo = false;
      for (const ch of row) {
        if (ch === '+') { promo = true; continue; }
        if (/[1-9]/.test(ch)) { c += +ch; continue; }
        board[r * 9 + c] = (promo ? '+' : '') + ch;
        promo = false;
        c++;
      }
      if (c !== 9) throw new Error('bad sfen row width: ' + row);
    });
    const hands = { b: {}, w: {} };
    const hs = parts[2] || '-';
    if (hs !== '-') {
      let n = '';
      for (const ch of hs) {
        if (/[0-9]/.test(ch)) { n += ch; continue; }
        const side = sideOf(ch);
        const t = ch.toUpperCase();
        hands[side][t] = (hands[side][t] || 0) + (n ? +n : 1);
        n = '';
      }
    }
    return { board, hands, turn: parts[1] === 'w' ? 'w' : 'b' };
  }

  function targets(board, i, p) {
    const side = sideOf(p), t = typeOf(p), sg = side === 'b' ? 1 : -1;
    const r = Math.floor(i / 9), c = i % 9;
    const out = [];
    const steps = STEPS[t];
    if (steps) {
      for (const [dr, dc] of steps) {
        const nr = r + dr * sg, nc = c + dc * sg;
        if (nr < 0 || nr > 8 || nc < 0 || nc > 8) continue;
        const q = board[nr * 9 + nc];
        if (!q || sideOf(q) !== side) out.push(nr * 9 + nc);
      }
    }
    const slides = SLIDES[t];
    if (slides) {
      for (const [dr, dc] of slides) {
        let nr = r + dr * sg, nc = c + dc * sg;
        while (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
          const q = board[nr * 9 + nc];
          if (!q) out.push(nr * 9 + nc);
          else { if (sideOf(q) !== side) out.push(nr * 9 + nc); break; }
          nr += dr * sg; nc += dc * sg;
        }
      }
    }
    return out;
  }

  function pseudoMoves(state) {
    const side = state.turn, b = state.board, moves = [];
    for (let i = 0; i < 81; i++) {
      const p = b[i];
      if (!p || sideOf(p) !== side) continue;
      const t = typeOf(p), fr = Math.floor(i / 9);
      for (const to of targets(b, i, p)) {
        const r = Math.floor(to / 9);
        if (PROMOTABLE[t] && (inZone(side, r) || inZone(side, fr))) {
          moves.push({ from: i, to, drop: null, promote: true });
          if (!mustPromote(side, t, r)) moves.push({ from: i, to, drop: null, promote: false });
        } else {
          moves.push({ from: i, to, drop: null, promote: false });
        }
      }
    }
    const hand = state.hands[side];
    for (const t of HAND_TYPES) {
      if (!hand[t]) continue;
      const mine = side === 'b' ? t : t.toLowerCase();
      for (let to = 0; to < 81; to++) {
        if (b[to]) continue;
        const r = Math.floor(to / 9), c = to % 9;
        if (mustPromote(side, t, r) && (t === 'P' || t === 'L' || t === 'N')) continue;
        if (t === 'P') {
          let dup = false;
          for (let rr = 0; rr < 9; rr++) if (b[rr * 9 + c] === mine) { dup = true; break; }
          if (dup) continue; // 二歩
        }
        moves.push({ from: -1, to, drop: t, promote: false });
      }
    }
    return moves;
  }

  function applyMove(state, m) {
    const b = state.board.slice();
    const hands = { b: Object.assign({}, state.hands.b), w: Object.assign({}, state.hands.w) };
    const side = state.turn;
    if (m.drop) {
      b[m.to] = side === 'b' ? m.drop : m.drop.toLowerCase();
      hands[side][m.drop]--;
      if (!hands[side][m.drop]) delete hands[side][m.drop];
    } else {
      let p = b[m.from];
      const cap = b[m.to];
      if (cap) {
        const base = baseOf(cap);
        hands[side][base] = (hands[side][base] || 0) + 1;
      }
      if (m.promote) p = '+' + p;
      b[m.from] = null;
      b[m.to] = p;
    }
    return { board: b, hands, turn: other(side) };
  }

  function inCheck(state, side) {
    const king = side === 'b' ? 'K' : 'k';
    const ki = state.board.indexOf(king);
    if (ki < 0) return false;
    const foe = other(side);
    for (let i = 0; i < 81; i++) {
      const p = state.board[i];
      if (!p || sideOf(p) !== foe) continue;
      if (targets(state.board, i, p).includes(ki)) return true;
    }
    return false;
  }

  function legalMoves(state, opts) {
    const side = state.turn, out = [];
    for (const m of pseudoMoves(state)) {
      const ns = applyMove(state, m);
      if (inCheck(ns, side)) continue;
      if (m.drop === 'P' && !(opts && opts.skipUchifu) &&
          inCheck(ns, ns.turn) && legalMoves(ns, { skipUchifu: true }).length === 0) continue; // 打ち歩詰め
      out.push(m);
    }
    return out;
  }

  function givesCheck(state, m) {
    const ns = applyMove(state, m);
    return inCheck(ns, ns.turn);
  }

  /* ---- 詰み探索 (攻方の手番) ---- */
  function checkingMoves(state) {
    return legalMoves(state).filter((m) => givesCheck(state, m));
  }

  // n 手(攻方の手数)以内で詰むか。手数は 1 手詰=1, 3 手詰=2, 5 手詰=3
  function isMateIn(state, n) {
    if (n < 1) return false;
    for (const m of checkingMoves(state)) {
      const s2 = applyMove(state, m);
      const replies = legalMoves(s2);
      if (replies.length === 0) return true;
      if (n > 1 && replies.every((r) => isMateIn(applyMove(s2, r), n - 1))) return true;
    }
    return false;
  }

  function winningMoves(state, n) {
    const out = [];
    for (const m of checkingMoves(state)) {
      const s2 = applyMove(state, m);
      const replies = legalMoves(s2);
      if (replies.length === 0 ||
          (n > 1 && replies.every((r) => isMateIn(applyMove(s2, r), n - 1)))) out.push(m);
    }
    return out;
  }

  function minMate(state, maxN) {
    for (let n = 1; n <= maxN; n++) if (isMateIn(state, n)) return n;
    return 0;
  }

  // 玉方の最善(最長抵抗)の応手。state は玉方の手番、n は残り攻方手数
  function bestDefense(state, n) {
    let best = null, bestK = -1;
    for (const r of legalMoves(state)) {
      const k = minMate(applyMove(state, r), n);
      if (k > bestK) { bestK = k; best = r; }
    }
    return best;
  }

  function principalVariation(state, n) {
    const out = [];
    let s = state, k = minMate(s, n);
    while (k > 0) {
      const m = winningMoves(s, k)[0];
      out.push({ move: m, text: moveText(s, m) });
      s = applyMove(s, m);
      const replies = legalMoves(s);
      if (replies.length === 0) break;
      const d = bestDefense(s, k - 1);
      out.push({ move: d, text: moveText(s, d) });
      s = applyMove(s, d);
      k = k - 1;
    }
    return out;
  }

  function pieceName(p) {
    const t = typeOf(p);
    if (t === 'K') return sideOf(p) === 'b' ? '王' : '玉';
    return NAMES[t];
  }

  function moveText(state, m) {
    const mark = state.turn === 'b' ? '▲' : '△';
    const dest = ZEN[fileOf(m.to)] + KAN[rankOf(m.to)];
    if (m.drop) return mark + dest + NAMES[m.drop] + '打';
    const p = state.board[m.from];
    return mark + dest + pieceName(p) + (m.promote ? '成' : '') +
      '(' + fileOf(m.from) + rankOf(m.from) + ')';
  }

  function perft(state, depth) {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of legalMoves(state)) n += perft(applyMove(state, m), depth - 1);
    return n;
  }

  return {
    HAND_TYPES, NAMES, ZEN, KAN,
    sideOf, typeOf, baseOf, other, fileOf, rankOf, pieceName,
    parseSfen, legalMoves, applyMove, inCheck, givesCheck,
    checkingMoves, isMateIn, winningMoves, minMate, bestDefense,
    principalVariation, moveText, perft,
  };
});
