/* 収録問題。moves = 攻方の手数(1手詰=1, 3手詰=2, 5手詰=3)
 * すべて tests/tsume.test.js で「最短手数・解の一意性」を検証済み。
 * 玉方の持駒はなし(簡易ルール)。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TSUME_PROBLEMS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return [
    // ---- 1手詰 ----
    { id: 'p1-1', ply: 1, moves: 1, title: '頭金', sfen: '9/5kS2/4R4/9/9/9/9/9/9 b G' },
    { id: 'p1-2', ply: 1, moves: 1, title: '腹金', sfen: '9/8k/7Lg/9/9/9/9/9/9 b G' },
    { id: 'p1-3', ply: 1, moves: 1, title: '桂の援軍', sfen: '7k1/9/9/7N1/6R2/9/9/9/9 b G' },
    { id: 'p1-4', ply: 1, moves: 1, title: '銀の一撃', sfen: '4k4/6R2/9/3L5/9/9/9/9/9 b S' },
    { id: 'p1-5', ply: 1, moves: 1, title: '端の金', sfen: 'pk7/p8/9/9/2R6/9/9/9/9 b G' },
    { id: 'p1-6', ply: 1, moves: 1, title: '香打ち', sfen: '8k/9/8+S/4B4/9/9/9/9/9 b L' },
    // ---- 3手詰 ----
    { id: 'p3-1', ply: 3, moves: 2, title: '飛車と銀', sfen: '4k4/9/3B5/9/9/9/9/9/9 b RS' },
    { id: 'p3-2', ply: 3, moves: 2, title: '角の誘導', sfen: '1k7/1B7/1L7/9/9/9/9/9/9 b S' },
    { id: 'p3-3', ply: 3, moves: 2, title: '飛銀の連携', sfen: '1Sk6/9/9/1R7/9/9/9/9/9 b RS' },
    { id: 'p3-4', ply: 3, moves: 2, title: '桂と角', sfen: '2k6/9/9/N8/3R5/9/9/9/9 b B' },
    { id: 'p3-5', ply: 3, moves: 2, title: '隅の追い込み', sfen: '9/B8/k8/9/9/9/9/9/9 b RG' },
    // ---- 5手詰 ----
    { id: 'p5-1', ply: 5, moves: 3, title: '龍の追撃', sfen: '8k/9/9/6R2/9/9/9/9/9 b R' },
    { id: 'p5-2', ply: 5, moves: 3, title: '二枚飛車', sfen: '7k1/9/9/9/9/9/9/9/9 b 2RG' },
    { id: 'p5-3', ply: 5, moves: 3, title: '大駒三枚', sfen: '4g4/5kn2/7S1/4S4/9/9/9/9/9 b RBS' },
    { id: 'p5-4', ply: 5, moves: 3, title: '香銀金の寄せ', sfen: '9/9/1k7/3L5/2+S6/9/9/9/9 b GSL' },
  ];
});
