// Prueba del núcleo de la liga (hándicap, copas, premios) contra un respaldo de Firestore.
// Uso: node pruebas/test_liga.js [respaldos/firestore_matches_AAAA-MM-DD.json]
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 1) El script principal debe ser sintácticamente válido
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach(s => new Function(s));

// 2) Núcleo puro
const core = html.match(/\/\* === LIGA-CORE-START ===[\s\S]*?LIGA-CORE-END === \*\//)[0];
const api = new Function(core + '; return { LIGA, computeLiga, ligaExpected, ligaVentaja, ligaGames, localDateStr };')();

const val = v => {
  const [k, x] = Object.entries(v)[0];
  if (k === 'integerValue') return +x;
  if (k === 'doubleValue') return x;
  if (k === 'nullValue') return null;
  if (k === 'arrayValue') return (x.values || []).map(val);
  if (k === 'mapValue') return Object.fromEntries(Object.entries(x.fields || {}).map(([a, b]) => [a, val(b)]));
  return x;
};
const dir = path.join(root, 'respaldos');
const file = process.argv[2] || path.join(dir, fs.readdirSync(dir).filter(f => f.includes('matches')).sort().pop());
let matches = JSON.parse(fs.readFileSync(file, 'utf8')).documents.map(d => ({
  id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields).map(([a, b]) => [a, val(b)]))
}));
matches = matches.filter(m => m.id !== 'm_1795478338683_y5xfh');   // duplicado borrado el 23-nov-2026

const today = process.argv[3] || api.localDateStr();
const L = api.computeLiga(matches, [], today);
const nm = id => id.replace('p_', '');
const f0 = v => (v >= 0 ? '+' : '') + v.toFixed(0);

// Invariantes
const ids = Object.keys(L.ratings);
const sum = ids.reduce((s, p) => s + L.ratings[p], 0);
assert(Math.abs(sum - api.LIGA.INIT * ids.length) < 1e-6, 'el nivel total debe conservarse');
// Cada fecha suma cero, salvo lo que agrega el comodín (dobla solo a quien lo usa, por diseño)
const comodinExtra = f => f.rounds.reduce((s, r) => s + (r.x2 || []).reduce((t, p) =>
  t + (r.teamA.includes(p) ? 1 : -1) * r.delta * r.base, 0), 0);
L.fechas.forEach(f => assert(Math.abs(Object.values(f.pts).reduce((s, v) => s + v, 0) - comodinExtra(f)) < 1e-6, 'cada fecha suma cero (sin el extra del comodín)'));
assert(Math.abs(api.ligaExpected(1000, 1000) - 0.5) < 1e-12);
// Caso de manual: iguales, 12 games, 8-4 -> +12 / -12
const T = api.computeLiga([{ id: 'x', date: '2026-01-05', modality: 'americana',
  rounds: [{ teamA: ['a', 'b'], teamB: ['c', 'd'], sets: [{ a: 8, b: 4 }] }] }], [], '2026-01-06');
assert.strictEqual(Math.round(T.ratings.a), 1012); assert.strictEqual(Math.round(T.ratings.c), 988);
// Un partido 'libre' o sin games no mueve nada
const T2 = api.computeLiga([{ id: 'y', date: '2026-01-05', modality: 'libre', rounds: [] }], ['a'], '2026-01-06');
assert.strictEqual(T2.fechas.length, 0); assert.strictEqual(T2.ratings.a, 1000);

// --- Modalidades ---
const mk = extra => api.computeLiga([{ id: 'x', date: '2026-01-05', modality: 'americana',
  rounds: [{ teamA: ['a', 'b'], teamB: ['c', 'd'], sets: [{ a: 8, b: 4 }], ...extra }] }], [], '2026-01-06');
// Final: copa doble para los cuatro, el nivel no se dobla
let X = mk({ final: true });
assert.strictEqual(Math.round(X.fechas[0].pts.a), 24); assert.strictEqual(Math.round(X.fechas[0].pts.c), -24);
assert.strictEqual(Math.round(X.ratings.a), 1012);
// Comodín: dobla solo al que lo usa (gane o pierda); en la final no cuenta
X = mk({ x2: ['a', 'c'] });
assert.deepStrictEqual(['a', 'b', 'c', 'd'].map(p => Math.round(X.fechas[0].pts[p])), [24, 12, -24, -12]);
assert.strictEqual(Math.round(X.ratings.a), 1012); assert.strictEqual(Math.round(X.ratings.c), 988);
X = mk({ final: true, x2: ['a'] });
assert.strictEqual(Math.round(X.fechas[0].pts.a), 24);
// Comodín asimétrico: la fecha deja de sumar cero, pero el invariante corregido se cumple
X = mk({ x2: ['b'] });
assert.deepStrictEqual(['a', 'b', 'c', 'd'].map(p => Math.round(X.fechas[0].pts[p])), [12, 24, -12, -12]);
assert(Math.abs(Object.values(X.fechas[0].pts).reduce((s, v) => s + v, 0) - comodinExtra(X.fechas[0])) < 1e-6);
// Empates: figura, cuchara y copa se comparten, sin depender del orden de los jugadores
const fijo = (tA, tB, date) => ({ id: 'f' + date, date, modality: 'fijo', rounds: [{ teamA: tA, teamB: tB, sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }] }] });
for (const [tA, tB] of [[['a', 'b'], ['c', 'd']], [['b', 'a'], ['d', 'c']]]) {
  const F = api.computeLiga(['2026-01-05', '2026-01-12', '2026-01-19', '2026-02-02', '2026-02-09'].map(d => fijo(tA, tB, d)), [], '2026-03-01');
  const aw = F.fechas[3].awards;
  assert.deepStrictEqual([...aw.figura.pids].sort(), ['a', 'b']);
  assert.deepStrictEqual([...aw.cuchara.pids].sort(), ['c', 'd']);
  const feb = F.copas.find(c => c.key === '2026-02');
  assert.deepStrictEqual([...feb.champions].sort(), ['a', 'b']);
  assert.strictEqual(F.vitrina.a.copas, 1); assert.strictEqual(F.vitrina.b.copas, 1);
  assert.strictEqual(F.vitrina.a.figura, 2); assert.strictEqual(F.vitrina.b.figura, 2);
}
// Ventaja: se descuenta del marcador de la cancha antes de puntuar (8-4 con 2 de ventaja para B = 8-2 real)
assert.deepStrictEqual(api.ligaGames({ sets: [{ a: 8, b: 4 }], adv: { team: 'B', n: 2 } }), { a: 8, b: 2, n: 10 });
X = mk({ adv: { team: 'B', n: 2 } });
assert.strictEqual(Math.round(X.ratings.a), 1018);   // 6 * (8 - 5)
// Ventaja calculada: iguales -> ninguna; favorito claro -> para el otro equipo
assert.strictEqual(api.ligaVentaja(['a', 'b'], ['c', 'd'], {}, 9), null);
assert.deepStrictEqual(api.ligaVentaja(['a', 'b'], ['c', 'd'], { a: 1223, b: 947, c: 934, d: 896 }, 9), { team: 'B', n: 4 });   // e = 0,73 -> 9 * 0,45 = 4,1
// Por puntos: 3 por punto y expectativa más plana
X = api.computeLiga([{ id: 'x', date: '2026-01-05', modality: 'americana',
  rounds: [{ teamA: ['a', 'b'], teamB: ['c', 'd'], sets: [{ a: 24, b: 16 }], unit: 'puntos' }] }], [], '2026-01-06');
assert.strictEqual(Math.round(X.ratings.a), 1012);   // 3 * (24 - 20)
assert(api.ligaExpected(1100, 900, 'puntos') < api.ligaExpected(1100, 900));

console.log('Nivel:', ids.sort((a, b) => L.ratings[b] - L.ratings[a]).map(p => `${nm(p)} ${L.ratings[p].toFixed(0)}`).join(' · '));
L.copas.forEach(c => {
  console.log(`\n== ${c.key} [${c.status}] fechas=${c.nFechas} campeón=${c.champions.length ? c.champions.map(nm).join('+') : '-'}`);
  console.log('   pts:', Object.entries(c.nFechas ? c.pts : c.ptsAll).sort((a, b) => b[1] - a[1]).map(([p, v]) => `${nm(p)} ${f0(v)}`).join(' · '));
  c.fechas.forEach(f => {
    const a = f.awards || {};
    console.log(`   F${f.n} ${f.date}${f.calib ? ' (calib)' : ''}:`, Object.entries(f.pts).sort((x, y) => y[1] - x[1]).map(([p, v]) => `${nm(p)} ${f0(v)}`).join(' '));
    f.rounds.forEach(r => console.log(`        ${r.teamA.map(nm).join('+')} vs ${r.teamB.map(nm).join('+')}  real ${r.a}-${r.b}  esp ${r.expA.toFixed(1)}-${r.expB.toFixed(1)}  ${f0(r.delta)}`));
    console.log('        premios:', [a.figura && 'figura ' + a.figura.pids.map(nm).join('+'), a.mata && 'mata ' + a.mata.team.map(nm).join('+') + ` (${a.mata.got} vs esp ${a.mata.exp.toFixed(1)})`,
      a.paliza && 'paliza ' + a.paliza.team.map(nm).join('+') + ' ' + a.paliza.score, a.cuchara && 'cuchara ' + a.cuchara.pids.map(nm).join('+')].filter(Boolean).join(' | '));
  });
});
console.log('\nVitrina:', JSON.stringify(Object.fromEntries(Object.entries(L.vitrina).map(([p, v]) => [nm(p), v]))));
console.log('\nOK: todas las comprobaciones pasaron');
