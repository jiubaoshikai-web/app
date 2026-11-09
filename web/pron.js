// Pronunciation scoring (browser mirror of king_english/pronunciation.py).
(function (root) {
  function normalize(t) { return (t.toLowerCase().match(/[a-z0-9']+/g)) || []; }
  function sim(a, b) { // 1 - levenshtein/maxlen
    const m = a.length, n = b.length; if (!m && !n) return 1;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return 1 - d[m][n] / Math.max(m, n);
  }
  // Align by maximising credit: exact=1, near-miss=0.5*similarity (only if >=0.5), skips=0.
  function score(target, heard) {
    const t = normalize(target), h = normalize(heard);
    if (!t.length) return { score: 0, words: [] };
    const credit = (a, b) => a === b ? 1 : (sim(a, b) >= 0.5 ? 0.5 * sim(a, b) : 0);
    const D = Array.from({ length: t.length + 1 }, () => Array(h.length + 1).fill(0));
    for (let i = 1; i <= t.length; i++) for (let j = 1; j <= h.length; j++)
      D[i][j] = Math.max(D[i-1][j], D[i][j-1], D[i-1][j-1] + credit(t[i-1], h[j-1]));
    const words = []; let i = t.length, j = h.length;
    while (i > 0) {
      if (j > 0 && D[i][j] === D[i-1][j-1] + credit(t[i-1], h[j-1]) && credit(t[i-1], h[j-1]) > 0) {
        words.unshift({ target: t[i-1], heard: h[j-1], ok: t[i-1] === h[j-1] }); i--; j--;
      } else if (j > 0 && D[i][j] === D[i][j-1] && D[i][j] !== D[i-1][j]) { j--; }
      else { words.unshift({ target: t[i-1], heard: null, ok: false }); i--; }
    }
    return { score: Math.round(100 * D[t.length][h.length] / t.length), words };
  }
  const api = { normalize, score };
  if (typeof module !== 'undefined') module.exports = api; else root.Pron = api;
})(this);
