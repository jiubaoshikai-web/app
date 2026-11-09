const assert = require('assert'); const P = require('../web/pron.js');
let r = P.score('I would like a coffee.', 'i would like a coffee'); assert.strictEqual(r.score, 100);
r = P.score('I would like a coffee', 'I would like coffee');
assert.deepStrictEqual(r.words.filter(w => !w.ok).map(w => w.target), ['a']); assert(r.score < 100);
r = P.score('three thirsty thrushes', 'tree thirsty thrushes');
assert.deepStrictEqual(r.words.filter(w => !w.ok).map(w => w.target), ['three']); assert(r.score > 60 && r.score < 100);
assert.strictEqual(P.score('hello', '').score, 0);
console.log('pron.js ok');
