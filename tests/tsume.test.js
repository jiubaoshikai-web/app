// node tests/tsume.test.js
const assert = require('assert');
const S = require('../tsume/shogi.js');
const PROBLEMS = require('../tsume/problems.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  -', name); }

test('perft (平手初期局面)', () => {
  const s = S.parseSfen('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b -');
  assert.deepStrictEqual([1, 2, 3].map((d) => S.perft(s, d)), [30, 900, 25470]);
});

test('二歩は打てない', () => {
  const s = S.parseSfen('4k4/9/9/9/9/9/4P4/9/9 b P');
  const drops = S.legalMoves(s).filter((m) => m.drop === 'P');
  assert.ok(drops.length > 0);
  assert.ok(drops.every((m) => m.to % 9 !== 4));
});

test('行き所のない駒は打てない', () => {
  const s = S.parseSfen('4k4/9/9/9/9/9/9/9/9 b PLN');
  const bad = S.legalMoves(s).filter((m) => m.drop && Math.floor(m.to / 9) === 0 &&
    (m.drop === 'P' || m.drop === 'L' || m.drop === 'N'));
  assert.strictEqual(bad.length, 0);
  assert.ok(S.legalMoves(s).filter((m) => m.drop === 'N' && Math.floor(m.to / 9) === 1).length === 0);
});

test('打ち歩詰めは禁止', () => {
  // 1一玉。3二金が2一・2二を押さえ、1五香が1二を支える。▲1二歩打は詰みだが反則
  const s = S.parseSfen('8k/6G2/9/9/8L/9/9/9/9 b P');
  assert.ok(S.givesCheck(s, { from: -1, to: 17, drop: 'P', promote: false }));
  assert.ok(S.legalMoves(S.applyMove(s, { from: -1, to: 17, drop: 'P', promote: false })).length === 0);
  assert.strictEqual(S.legalMoves(s).filter((x) => x.drop === 'P' && x.to === 17).length, 0);
});

test('自玉を王手にさらす手は指せない(玉方)', () => {
  const s = S.parseSfen('4k4/9/9/9/4R4/9/9/9/9 w -');
  // 5筋に飛車の利き。玉は5筋に残れない
  const ms = S.legalMoves(s);
  assert.ok(ms.length > 0);
  assert.ok(ms.every((m) => m.to % 9 !== 4));
});

test('成り・不成の選択', () => {
  const s = S.parseSfen('4k4/9/9/2B6/9/9/9/9/9 b -');
  const prom = S.legalMoves(s).filter((m) => m.from === 3 * 9 + 2 && Math.floor(m.to / 9) <= 2);
  assert.ok(prom.some((m) => m.promote) && prom.some((m) => !m.promote));
});

test('収録問題: 最短手数どおり・初手が一意・玉方は王手されていない', () => {
  assert.ok(PROBLEMS.length >= 10);
  const ids = new Set();
  for (const p of PROBLEMS) {
    assert.ok(!ids.has(p.id), 'duplicate id ' + p.id); ids.add(p.id);
    assert.strictEqual(p.ply, p.moves * 2 - 1);
    const s = S.parseSfen(p.sfen);
    assert.strictEqual(s.turn, 'b');
    assert.ok(!S.inCheck(s, 'w'), p.id + ' 開始時に玉方が王手されている');
    assert.strictEqual(S.minMate(s, p.moves), p.moves, p.id + ' 最短手数が違う');
    assert.strictEqual(S.winningMoves(s, p.moves).length, 1, p.id + ' 初手が一意でない');
    const pv = S.principalVariation(s, p.moves);
    assert.strictEqual(pv.length, p.ply, p.id + ' 手順の長さ');
  }
});

console.log(`\n${passed} tests passed`);
