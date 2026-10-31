// Đồ thị hàm số y = f(x) (chương trình 2018): hàm bậc hai; khảo sát hàm bậc ba, phân thức bậc nhất/bậc nhất,
// phân thức bậc hai/bậc nhất; hàm lượng giác; hàm mũ, lôgarit.
// Lớp lõi, không phụ thuộc giao diện: đọc hệ số, phân tích (tập xác định, tiệm cận, cực trị, giao trục),
// lập bảng biến thiên, các bước vẽ cho học sinh theo dõi, và giải hệ số từ những gì AI đọc được trên ảnh đồ thị.
//
// Tài liệu đồ thị: goc = { loai: 'do-thi', tham_so: { ham, he_so: { a: '1', b: '-3', ... }, khung: null | { x0, x1, y0, y1 } } }
// Hệ số lưu đúng chữ thầy gõ ('1/2', '√2', 'π/3') để mở lại vẫn thấy như cũ.

import { nhanDang } from './do-dac.js';

const PI = Math.PI;
const VO_CUC = 1e6;

// ---------- Các loại hàm ----------

// tham: tên các hệ số theo thứ tự; mau: hệ số mẫu khi tạo mới
export const HAM = {
  'bac-hai': { ten: 'Hàm số bậc hai', cong_thuc: 'y = ax² + bx + c', tham: ['a', 'b', 'c'], mau: { a: '1', b: '-2', c: '-3' } },
  'bac-ba': { ten: 'Hàm số bậc ba', cong_thuc: 'y = ax³ + bx² + cx + d', tham: ['a', 'b', 'c', 'd'], mau: { a: '1', b: '0', c: '-3', d: '1' } },
  'nhat-nhat': { ten: 'Hàm phân thức (ax + b)/(cx + d)', cong_thuc: 'y = (ax + b)/(cx + d)', tham: ['a', 'b', 'c', 'd'], mau: { a: '2', b: '1', c: '1', d: '-1' } },
  'hai-nhat': { ten: 'Hàm phân thức (ax² + bx + c)/(mx + n)', cong_thuc: 'y = (ax² + bx + c)/(mx + n)', tham: ['a', 'b', 'c', 'm', 'n'], mau: { a: '1', b: '0', c: '1', m: '1', n: '0' } },
  'sin': { ten: 'Hàm số y = sin x', cong_thuc: 'y = A·sin(ωx + φ) + k', tham: ['A', 'w', 'p', 'k'], mau: { A: '1', w: '1', p: '0', k: '0' } },
  'cos': { ten: 'Hàm số y = cos x', cong_thuc: 'y = A·cos(ωx + φ) + k', tham: ['A', 'w', 'p', 'k'], mau: { A: '1', w: '1', p: '0', k: '0' } },
  'tan': { ten: 'Hàm số y = tan x', cong_thuc: 'y = A·tan(ωx + φ) + k', tham: ['A', 'w', 'p', 'k'], mau: { A: '1', w: '1', p: '0', k: '0' } },
  'cot': { ten: 'Hàm số y = cot x', cong_thuc: 'y = A·cot(ωx + φ) + k', tham: ['A', 'w', 'p', 'k'], mau: { A: '1', w: '1', p: '0', k: '0' } },
  'mu': { ten: 'Hàm số mũ y = aˣ', cong_thuc: 'y = aˣ (a > 0, a ≠ 1)', tham: ['a'], mau: { a: '2' } },
  'log': { ten: 'Hàm số lôgarit y = logₐx', cong_thuc: 'y = logₐx (a > 0, a ≠ 1)', tham: ['a'], mau: { a: '2' } }
};
// Tên hiện ở ô nhập của hệ số lượng giác
export const NHAN_THAM = { w: 'ω', p: 'φ' };
export const LA_LUONG_GIAC = h => ['sin', 'cos', 'tan', 'cot'].includes(h);

// ---------- Đọc số: "1/2", "−3", "√2", "2π/3", "3√2/2", "1,5" ----------

export function docSo(chuoi) {
  const s = String(chuoi ?? '').trim().replace(/−/g, '-').replace(/×/g, '*').replace(/:/g, '/').replace(/pi/gi, 'π').replace(/,/g, '.').replace(/\s+/g, '');
  if (!s) throw new Error('Chưa nhập hệ số');
  let i = 0;
  const xem = () => s[i];
  const loi = () => { throw new Error(`Không đọc được số "${chuoi}"`); };
  const batDauAtom = c => c !== undefined && (/[0-9.(√πe]/.test(c));
  function bieuThuc() {
    let v = hang();
    while (xem() === '+' || xem() === '-') { const d = s[i++]; const w = hang(); v = d === '+' ? v + w : v - w; }
    return v;
  }
  function hang() {
    let v = thuaSo();
    for (;;) {
      if (xem() === '*') { i++; v *= thuaSo(); }
      else if (xem() === '/') { i++; const w = thuaSo(); if (w === 0) throw new Error('Chia cho 0'); v /= w; }
      else if (batDauAtom(xem())) v *= luyThua(); // 2π, 3√2: nhân ngầm
      else return v;
    }
  }
  function thuaSo() {
    if (xem() === '-') { i++; return -thuaSo(); }
    if (xem() === '+') { i++; return thuaSo(); }
    return luyThua();
  }
  function luyThua() { const v = atom(); if (xem() === '^') { i++; return v ** thuaSo(); } return v; }
  function atom() {
    const c = xem();
    if (c === '(') { i++; const v = bieuThuc(); if (xem() !== ')') loi(); i++; return v; }
    if (c === 'π') { i++; return PI; }
    if (c === 'e') { i++; return Math.E; }
    if (c === '√') { i++; const v = atom(); if (v < 0) throw new Error('Căn của số âm'); return Math.sqrt(v); }
    const m = /^\d*\.?\d+/.exec(s.slice(i));
    if (!m) loi();
    i += m[0].length;
    return +m[0];
  }
  const v = bieuThuc();
  if (i !== s.length || !Number.isFinite(v)) loi();
  return v;
}

// ---------- Viết số đẹp: 1/2, −√3/2, 2π/3 ----------

const soThap = x => (+x.toFixed(3)).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export function dep(x) {
  if (!Number.isFinite(x)) return x > 0 ? '+∞' : '−∞';
  if (Math.abs(x) < 1e-10) return '0';
  const am = x < 0 ? '−' : '';
  const r = nhanDang(Math.abs(x));
  if (!r || r.q > 12) return am + soThap(Math.abs(x));
  const tu = r.n === 1 ? String(r.p) : `${r.p === 1 ? '' : r.p}√${r.n}`;
  return am + (r.q === 1 ? tu : `${tu}/${r.q}`);
}

// Số là bội hữu tỉ của π (hoành độ trên đồ thị lượng giác): π/2, −3π/4, 2π
export function depPi(x) {
  if (Math.abs(x) < 1e-10) return '0';
  const r = nhanDang(Math.abs(x) / PI);
  if (!r || r.n !== 1 || r.q > 12) return dep(x);
  return (x < 0 ? '−' : '') + (r.p === 1 ? '' : r.p) + 'π' + (r.q === 1 ? '' : '/' + r.q);
}

// Số viết lại để lưu thành hệ số (chữ đọc lại được bằng docSo)
export const thanhChu = (x, pi = false) => (pi ? depPi(x) : dep(x)).replace('+∞', '1e9').replace('−∞', '-1e9');

// Đa thức: [[hệ số, số mũ], ...] → "x³ − 3x + 1"
export function vietDaThuc(cac, bien = 'x') {
  const mu = { 0: '', 1: '', 2: '²', 3: '³', 4: '⁴' };
  let s = '';
  for (const [c, k] of cac) {
    if (Math.abs(c) < 1e-12) continue;
    const tri = Math.abs(c), dau = c < 0 ? '−' : '+';
    let so = k > 0 && Math.abs(tri - 1) < 1e-12 ? '' : dep(tri);
    // Hệ số phân số đứng trước biến: viết (1/2)x² cho khỏi đọc nhầm thành 1/(2x²)
    if (k > 0 && so.includes('/')) so = `(${so})`;
    const hang = `${so}${k > 0 ? bien + mu[k] : ''}`;
    s += s ? ` ${dau} ${hang}` : `${c < 0 ? '−' : ''}${hang}`;
  }
  return s || '0';
}

// ---------- Tạo đồ thị: đọc hệ số, kiểm tra điều kiện, phân tích ----------

export function taoDoThi(thamSo) {
  const ham = thamSo?.ham;
  const kieu = HAM[ham];
  if (!kieu) throw new Error('Không biết loại hàm: ' + ham);
  const h = {};
  for (const t of kieu.tham) {
    try { h[t] = docSo(thamSo.he_so?.[t] ?? kieu.mau[t]); }
    catch (e) { throw new Error(`Hệ số ${NHAN_THAM[t] || t}: ${e.message}`); }
  }
  const pt = PHAN_TICH[ham](h);
  return { ham, h, ...pt, khung: khungNhin(ham, h, pt, thamSo.khung) };
}

const nghiemBac2 = (a, b, c) => {
  if (Math.abs(a) < 1e-14) return Math.abs(b) < 1e-14 ? [] : [-c / b];
  const D = b * b - 4 * a * c;
  if (D < -1e-12) return [];
  if (Math.abs(D) <= 1e-12) return [-b / (2 * a)];
  const r = Math.sqrt(D);
  return [(-b - r) / (2 * a), (-b + r) / (2 * a)].sort((u, v) => u - v);
};

// Nghiệm thực của đa thức bậc ba: tìm đổi dấu trên lưới trong cận Cauchy rồi chia đôi; nghiệm kép (chạm trục) lấy từ cực trị
function nghiemBac3(a, b, c, d, cucTri) {
  const f = x => ((a * x + b) * x + c) * x + d;
  const R = 1 + Math.max(Math.abs(b / a), Math.abs(c / a), Math.abs(d / a));
  const ds = [];
  const N = 4000;
  let x0 = -R, f0 = f(x0);
  for (let i = 1; i <= N; i++) {
    const x1 = -R + 2 * R * i / N, f1 = f(x1);
    if (f0 === 0) ds.push(x0);
    else if (f0 * f1 < 0) {
      let lo = x0, hi = x1;
      for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
      ds.push((lo + hi) / 2);
    }
    x0 = x1; f0 = f1;
  }
  for (const x of cucTri) if (Math.abs(f(x)) < 1e-9) ds.push(x);
  return gonNghiem(ds);
}
const gonNghiem = ds => ds.sort((u, v) => u - v).filter((x, i, m) => i === 0 || Math.abs(x - m[i - 1]) > 1e-7).map(x => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x));

const diem = (x, y) => ({ x, y });
// Phân thức: tử, mẫu có nhiều hạng tử thì đặt trong ngoặc
const ngoac = s => (/ [+−] /.test(s) ? `(${s})` : s);
const phanThuc = (tu, mau) => `${ngoac(tu)}/${ngoac(mau)}`;

const PHAN_TICH = {
  'bac-hai': ({ a, b, c }) => {
    if (Math.abs(a) < 1e-14) throw new Error('Hệ số a phải khác 0');
    const f = x => (a * x + b) * x + c, df = x => 2 * a * x + b;
    const xd = -b / (2 * a);
    return {
      f, df, congThuc: 'y = ' + vietDaThuc([[a, 2], [b, 1], [c, 0]]), daoHam: "y' = " + vietDaThuc([[2 * a, 1], [b, 0]]),
      txd: 'D = ℝ', cucTri: [{ ...diem(xd, f(xd)), loai: a > 0 ? 'ct' : 'cd' }], giaoOx: nghiemBac2(a, b, c), giaoOy: c,
      tcd: [], tcn: [], tcx: null, cucCot: [], doiXung: { loai: 'truc', x: xd }, dacBiet: []
    };
  },
  'bac-ba': ({ a, b, c, d }) => {
    if (Math.abs(a) < 1e-14) throw new Error('Hệ số a phải khác 0');
    const f = x => ((a * x + b) * x + c) * x + d, df = x => (3 * a * x + 2 * b) * x + c;
    const ng = nghiemBac2(3 * a, 2 * b, c);
    const cucTri = ng.length === 2 ? ng.map((x, i) => ({ ...diem(x, f(x)), loai: (i === 0) === (a > 0) ? 'cd' : 'ct' })) : [];
    // Một nghiệm kép của y': y' không đổi dấu, điểm có tiếp tuyến nằm ngang (không phải cực trị)
    const dung = ng.length === 1 ? [{ ...diem(ng[0], f(ng[0])), loai: 'dung' }] : [];
    const xu = -b / (3 * a);
    return {
      f, df, congThuc: 'y = ' + vietDaThuc([[a, 3], [b, 2], [c, 1], [d, 0]]), daoHam: "y' = " + vietDaThuc([[3 * a, 2], [2 * b, 1], [c, 0]]),
      txd: 'D = ℝ', cucTri: [...cucTri, ...dung], giaoOx: nghiemBac3(a, b, c, d, ng), giaoOy: d,
      tcd: [], tcn: [], tcx: null, cucCot: [], doiXung: { loai: 'tam', x: xu, y: f(xu) }, dacBiet: []
    };
  },
  'nhat-nhat': ({ a, b, c, d }) => {
    if (Math.abs(c) < 1e-14) throw new Error('Hệ số c phải khác 0 (c = 0 thì là hàm bậc nhất)');
    const D = a * d - b * c;
    if (Math.abs(D) < 1e-12) throw new Error('ad − bc = 0: hàm số là hằng số (trừ một điểm), không khảo sát được');
    const f = x => (a * x + b) / (c * x + d), df = x => D / (c * x + d) ** 2;
    const x0 = -d / c;
    return {
      f, df, congThuc: `y = ${phanThuc(vietDaThuc([[a, 1], [b, 0]]), vietDaThuc([[c, 1], [d, 0]]))}`,
      daoHam: `y' = ${dep(D)}/(${vietDaThuc([[c, 1], [d, 0]])})²`,
      txd: `D = ℝ \\ {${dep(x0)}}`, cucTri: [], giaoOx: Math.abs(a) > 1e-14 ? [-b / a] : [], giaoOy: Math.abs(d) > 1e-14 ? b / d : null,
      tcd: [x0], tcn: [a / c], tcx: null, cucCot: [x0], doiXung: { loai: 'tam', x: x0, y: a / c }, dacBiet: []
    };
  },
  'hai-nhat': ({ a, b, c, m, n }) => {
    if (Math.abs(m) < 1e-14) throw new Error('Hệ số m phải khác 0');
    if (Math.abs(a) < 1e-14) throw new Error('Hệ số a phải khác 0 (a = 0 thì là phân thức bậc nhất/bậc nhất)');
    const x0 = -n / m;
    if (Math.abs((a * x0 + b) * x0 + c) < 1e-12) throw new Error('Tử số chia hết cho mẫu: rút gọn được thành hàm bậc nhất');
    const f = x => ((a * x + b) * x + c) / (m * x + n);
    const tu = [a * m, 2 * a * n, b * n - c * m]; // tử của y'
    const df = x => (tu[0] * x * x + tu[1] * x + tu[2]) / (m * x + n) ** 2;
    const ng = nghiemBac2(...tu);
    const cucTri = ng.length === 2 ? ng.map((x, i) => ({ ...diem(x, f(x)), loai: (i === 0) === (tu[0] > 0) ? 'cd' : 'ct' })) : [];
    const p = a / m, q = (b * m - a * n) / (m * m);
    const ox = nghiemBac2(a, b, c);
    return {
      f, df, congThuc: `y = ${phanThuc(vietDaThuc([[a, 2], [b, 1], [c, 0]]), vietDaThuc([[m, 1], [n, 0]]))}`,
      daoHam: `y' = (${vietDaThuc([[tu[0], 2], [tu[1], 1], [tu[2], 0]])})/(${vietDaThuc([[m, 1], [n, 0]])})²`,
      txd: `D = ℝ \\ {${dep(x0)}}`, cucTri, giaoOx: ox, giaoOy: Math.abs(n) > 1e-14 ? c / n : null,
      tcd: [x0], tcn: [], tcx: { p, q }, cucCot: [x0], doiXung: { loai: 'tam', x: x0, y: p * x0 + q }, dacBiet: []
    };
  },
  'sin': h => luongGiac('sin', h), 'cos': h => luongGiac('cos', h), 'tan': h => luongGiac('tan', h), 'cot': h => luongGiac('cot', h),
  'mu': ({ a }) => {
    if (!(a > 0) || Math.abs(a - 1) < 1e-12) throw new Error('Cơ số a phải dương và khác 1');
    const f = x => a ** x, df = x => a ** x * Math.log(a);
    return {
      f, df, congThuc: `y = ${coSo(a)}ˣ`, daoHam: `y' = ${coSo(a)}ˣ·ln${lnCua(a)}`, txd: 'D = ℝ',
      cucTri: [], giaoOx: [], giaoOy: 1, tcd: [], tcn: [0], tcx: null, cucCot: [], doiXung: null,
      dacBiet: [diem(1, a), diem(-1, 1 / a)], mien: [-Infinity, Infinity]
    };
  },
  'log': ({ a }) => {
    if (!(a > 0) || Math.abs(a - 1) < 1e-12) throw new Error('Cơ số a phải dương và khác 1');
    const f = x => (x > 0 ? Math.log(x) / Math.log(a) : NaN), df = x => 1 / (x * Math.log(a));
    return {
      f, df, congThuc: `y = log${chiSoDuoi(dep(a))}x`, daoHam: `y' = 1/(x·ln${lnCua(a)})`, txd: 'D = (0; +∞)',
      cucTri: [], giaoOx: [1], giaoOy: null, tcd: [0], tcn: [], tcx: null, cucCot: [], doiXung: null,
      dacBiet: [diem(a, 1), diem(1 / a, -1)], mien: [0, Infinity]
    };
  }
};

// Cơ số không nguyên đặt trong ngoặc: (1/2)ˣ, ln(1/2); số nguyên: 2ˣ, ln 2
const coSo = a => { const s = dep(a); return /^\d+$/.test(s) ? s : `(${s})`; };
const lnCua = a => { const s = dep(a); return /^\d+$/.test(s) ? ' ' + s : `(${s})`; };
const chiSoDuoi = s => String(s).replace(/[0-9]/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]).replace(/\//g, '/');

// y = A·g(ωx + φ) + k với g = sin, cos, tan, cot
function luongGiac(g, { A, w, p, k }) {
  if (Math.abs(A) < 1e-14) throw new Error('Hệ số A phải khác 0');
  if (Math.abs(w) < 1e-14) throw new Error('Hệ số ω phải khác 0');
  const goc = x => w * x + p;
  const ham = { sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: t => Math.cos(t) / Math.sin(t) }[g];
  const daoG = { sin: Math.cos, cos: t => -Math.sin(t), tan: t => 1 / Math.cos(t) ** 2, cot: t => -1 / Math.sin(t) ** 2 }[g];
  const f = x => A * ham(goc(x)) + k, df = x => A * w * daoG(goc(x));
  const T = (g === 'tan' || g === 'cot' ? PI : 2 * PI) / Math.abs(w);
  // Hoành độ theo góc: ωx + φ = t ⇒ x = (t − φ)/ω
  const tuGoc = t => (t - p) / w;
  const trong = `${Math.abs(w - 1) < 1e-12 ? '' : Math.abs(w + 1) < 1e-12 ? '−' : dep(w)}x${Math.abs(p) < 1e-12 ? '' : (p < 0 ? ' − ' : ' + ') + depPi(Math.abs(p))}`;
  const heA = Math.abs(A - 1) < 1e-12 ? '' : Math.abs(A + 1) < 1e-12 ? '−' : dep(A);
  const congThuc = `y = ${heA}${g}${Math.abs(w - 1) < 1e-12 && Math.abs(p) < 1e-12 ? ' x' : `(${trong})`}${Math.abs(k) < 1e-12 ? '' : (k < 0 ? ' − ' : ' + ') + dep(Math.abs(k))}`;
  // Một chu kì để lập bảng biến thiên
  let doan, cucTri = [], cucCot = [], txd = 'D = ℝ';
  if (g === 'sin' || g === 'cos') {
    const s = tuGoc(0), e = tuGoc(w > 0 ? 2 * PI : -2 * PI);
    doan = [Math.min(s, e), Math.max(s, e)];
    const dinh = g === 'sin' ? [PI / 2, 3 * PI / 2] : [0, PI, 2 * PI];
    for (const t of dinh) {
      const x = tuGoc(w > 0 ? t : -t);
      if (x < doan[0] - 1e-9 || x > doan[1] + 1e-9) continue;
      const y = f(x);
      cucTri.push({ ...diem(x, y), loai: y > k ? 'cd' : 'ct' });
    }
    cucTri = cucTri.filter(c => c.x > doan[0] + 1e-9 && c.x < doan[1] - 1e-9);
  } else {
    // Hai tiệm cận đứng liên tiếp
    const t0 = g === 'tan' ? -PI / 2 : 0;
    const a0 = tuGoc(t0), a1 = tuGoc(t0 + (w > 0 ? PI : -PI));
    doan = [Math.min(a0, a1), Math.max(a0, a1)];
    cucCot = doan;
    txd = g === 'tan' ? `D = {x | ${trong} ≠ π/2 + kπ}` : `D = {x | ${trong} ≠ kπ}`;
    if (Math.abs(w - 1) < 1e-12 && Math.abs(p) < 1e-12) txd = g === 'tan' ? 'D = ℝ \\ {π/2 + kπ, k ∈ ℤ}' : 'D = ℝ \\ {kπ, k ∈ ℤ}';
  }
  // Đạo hàm viết như SGK: y' = 2cos(2x + π/3), y' = −sin x, y' = 1/cos²x, y' = −2/sin²(2x)
  const c = A * w * (g === 'cos' || g === 'cot' ? -1 : 1), dauC = c < 0 ? '−' : '', tri = Math.abs(c);
  const gocCt = Math.abs(w - 1) < 1e-12 && Math.abs(p) < 1e-12 ? 'x' : `(${trong})`;
  const daoHam = g === 'sin' || g === 'cos'
    ? `y' = ${dauC}${Math.abs(tri - 1) < 1e-12 ? '' : dep(tri)}${g === 'sin' ? 'cos' : 'sin'}${gocCt === 'x' ? ' x' : gocCt}`
    : `y' = ${dauC}${dep(tri)}/${g === 'tan' ? 'cos' : 'sin'}²${gocCt}`;
  return {
    f, df, congThuc, daoHam,
    txd, cucTri, giaoOx: [], giaoOy: Number.isFinite(f(0)) ? f(0) : null, tcd: [], tcn: [], tcx: null, cucCot,
    doiXung: null, dacBiet: [], luongGiac: { g, A, w, p, k, T, tuGoc }, mien: doan
  };
}

// ---------- Khung nhìn ----------

function khungNhin(ham, h, pt, dat) {
  if (dat && [dat.x0, dat.x1, dat.y0, dat.y1].every(Number.isFinite) && dat.x1 > dat.x0 && dat.y1 > dat.y0) return { ...dat };
  if (pt.luongGiac) {
    const { T, k, A, g } = pt.luongGiac;
    const [s] = pt.mien;
    let x0 = s - T * (g === 'tan' || g === 'cot' ? 1 : 0.5), x1 = s + T * (g === 'tan' || g === 'cot' ? 2 : 1.5);
    if (x0 > -0.5) x0 = -0.5; if (x1 < 0.5) x1 = 0.5;
    const bien = g === 'tan' || g === 'cot' ? 3 * Math.abs(A) + 1 : Math.abs(A) + 0.8;
    return { x0, x1, y0: Math.min(-0.5, k - bien), y1: Math.max(0.5, k + bien) };
  }
  if (ham === 'mu') { const ys = [h.a ** 3, h.a ** -3].map(v => Math.min(v, 7)); return { x0: -3.2, x1: 3.2, y0: -1, y1: Math.max(...ys) + 0.6 }; }
  if (ham === 'log') return { x0: -1, x1: Math.max(6, Math.min(h.a, 1 / h.a) < 1 ? 6 : h.a + 2), y0: -3.5, y1: 3.5 };
  const xs = [0, ...pt.cucTri.map(c => c.x), ...pt.giaoOx, ...pt.tcd];
  if (pt.doiXung?.x !== undefined) xs.push(pt.doiXung.x);
  // Phân thức: khung đủ rộng quanh tâm đối xứng (giao hai tiệm cận) để thấy rõ cả hai nhánh
  if (pt.tcd.length && pt.doiXung) {
    const { x: tx, y: ty } = pt.doiXung;
    const cuc = pt.cucTri.map(c => Math.abs(c.x - tx));
    const rx = Math.max(3.5, ...cuc.map(d => d * 1.8));
    const ry = Math.max(3.5, ...pt.cucTri.map(c => Math.abs(c.y - ty) * 1.6), pt.tcx ? Math.abs(pt.tcx.p) * rx * 0.9 : 0);
    const x0 = Math.min(tx - rx, ...xs.map(x => x - 1)), x1 = Math.max(tx + rx, ...xs.map(x => x + 1));
    const y0 = Math.min(ty - ry, -0.8), y1 = Math.max(ty + ry, 0.8);
    return { x0, x1, y0, y1 };
  }
  const lo = Math.min(...xs), hi = Math.max(...xs), span = Math.max(hi - lo, 2);
  const pad = Math.max(1.5, 0.4 * span);
  const x0 = lo - pad, x1 = hi + pad;
  const ys = [0, ...pt.cucTri.map(c => c.y), ...pt.tcn];
  if (pt.giaoOy !== null) ys.push(pt.giaoOy);
  if (pt.doiXung?.y !== undefined) ys.push(pt.doiXung.y);
  if (pt.tcx) ys.push(pt.tcx.p * x0 + pt.tcx.q, pt.tcx.p * x1 + pt.tcx.q);
  const ylo = Math.min(...ys), yhi = Math.max(...ys), ys2 = Math.max(yhi - ylo, 2);
  const ypad = Math.max(1.5, 0.4 * ys2);
  return { x0, x1, y0: ylo - ypad, y1: yhi + ypad };
}

// Các tiệm cận đứng (cột) của đồ thị lượng giác trong khung nhìn
export function cotTrongKhung(dt, x0 = dt.khung.x0, x1 = dt.khung.x1) {
  if (!dt.luongGiac || !dt.cucCot.length) return dt.tcd.filter(x => x > x0 && x < x1);
  const { T } = dt.luongGiac, ds = [];
  const goc = dt.cucCot[0];
  for (let j = Math.floor((x0 - goc) / T) - 1; j <= Math.ceil((x1 - goc) / T) + 1; j++) {
    const x = goc + j * T;
    if (x > x0 && x < x1) ds.push(x);
  }
  return ds;
}

// ---------- Bảng biến thiên ----------
// Kết quả: { cot: [{ x: chữ, loai: 'bien'|'cuc'|'cot'|'dung', trai, phai }], dau: ['+'|'−' cho từng khoảng], ve: { đầu cột: giá trị và vị trí } }
// Mỗi giá trị: { chu, vi: 'tren' | 'duoi' | 'giua' }

// Giới hạn khi x tiến tới một mốc: thử ở hai mức gần dần (x1 rồi x2 gần hơn).
// Giá trị còn lớn lên rõ (như log x khi x → 0⁺ hay x → +∞) thì là vô cực; nếu không thì lấy giá trị ở mức gần hơn.
function gioiHan(f, x1, x2) {
  const y1 = f(x1), y2 = f(x2);
  const voCuc = y => (y > 0 || y === Infinity ? Infinity : -Infinity);
  if (!Number.isFinite(y2) || Math.abs(y2) > VO_CUC) return voCuc(y2);
  if (Number.isFinite(y1) && Math.abs(y2) > Math.abs(y1) + 1 && Math.abs(y2 - y1) > 1e-3 * (1 + Math.abs(y1))) return voCuc(y2);
  return Math.abs(y2 - Math.round(y2)) < 1e-6 ? Math.round(y2) : y2;
}

export function bangBienThien(dt) {
  const { f, df } = dt;
  const viX = dt.luongGiac ? depPi : dep;
  // Các mốc: hai đầu miền, cực trị (kể cả điểm dừng), tiệm cận đứng
  let [dau0, cuoi] = dt.mien || [-Infinity, Infinity];
  const moc = [{ x: dau0, loai: 'bien' }];
  const trong = [...dt.cucTri.map(c => ({ x: c.x, loai: c.loai === 'dung' ? 'dung' : 'cuc' })),
    ...(dt.luongGiac ? [] : dt.tcd.filter(x => x > dau0 && x < cuoi).map(x => ({ x, loai: 'cot' })))].sort((u, v) => u.x - v.x);
  moc.push(...trong.filter(m => m.x > dau0 + 1e-9 && m.x < cuoi - 1e-9), { x: cuoi, loai: 'bien' });
  // Dấu y' trên từng khoảng
  const giua = (u, v) => (Number.isFinite(u) && Number.isFinite(v) ? (u + v) / 2 : Number.isFinite(u) ? u + Math.abs(u) + 1 : Number.isFinite(v) ? v - Math.abs(v) - 1 : 0);
  const dau = [];
  for (let i = 0; i + 1 < moc.length; i++) dau.push(df(giua(moc[i].x, moc[i + 1].x)) > 0 ? '+' : '−');
  const len = d => (d === '+' ? 'tren' : 'duoi'); // đi lên thì đầu mũi tên ở trên
  const xuong = d => (d === '+' ? 'duoi' : 'tren');
  const tl = 1 + Math.max(1, ...moc.filter(m => Number.isFinite(m.x)).map(m => Math.abs(m.x)));
  const giaTri = (x, phia) => {
    if (x === -Infinity) return gioiHan(f, -1e6, -1e12);
    if (x === Infinity) return gioiHan(f, 1e6, 1e12);
    return gioiHan(f, x + phia * 1e-6 * tl, x + phia * 1e-12 * tl);
  };
  const cot = moc.map((m, i) => {
    const chuX = m.x === -Infinity ? '−∞' : m.x === Infinity ? '+∞' : viX(m.x);
    if (m.loai === 'cot' || (m.loai === 'bien' && dt.cucCot.some(c => Math.abs(c - m.x) < 1e-9))) {
      // Cột tiệm cận: giá trị trái (giới hạn bên trái) và phải; đầu mút là tiệm cận thì chỉ một bên
      const trai = i > 0 ? { chu: dep(giaTri(m.x, -1)), vi: len(dau[i - 1]) } : null;
      const phai = i + 1 < moc.length ? { chu: dep(giaTri(m.x, +1)), vi: xuong(dau[i]) } : null;
      return { x: chuX, loai: m.loai === 'bien' ? 'bien-cot' : 'cot', trai, phai, giaTriX: m.x };
    }
    const y = m.loai === 'bien' ? giaTri(m.x, i === 0 ? 1 : -1) : f(m.x);
    let vi;
    if (i === 0) vi = xuong(dau[0]);
    else if (i === moc.length - 1) vi = len(dau[i - 1]);
    else if (dau[i - 1] !== dau[i]) vi = dau[i - 1] === '+' ? 'tren' : 'duoi';
    else vi = 'giua';
    return { x: chuX, loai: m.loai, gia: { chu: dep(y), vi }, giaTriX: m.x };
  });
  return { cot, dau };
}

// ---------- Các bước vẽ cho học sinh theo dõi ----------
// Mỗi khung: { chu, lop: Set('truc' | 'tiem-can' | 'bbt' | 'diem' | 'do-thi') } cộng dồn

export function kichBanDoThi(dt) {
  const khung = [], lop = new Set();
  const ghi = (chu, ...them) => { them.forEach(x => lop.add(x)); khung.push({ chu, lop: new Set(lop) }); };
  ghi(`Tập xác định: ${dt.txd}. Vẽ hệ trục toạ độ Oxy.`, 'truc');
  const tc = [];
  if (dt.luongGiac && dt.cucCot.length) tc.push(`các đường thẳng x = ${depPi(dt.cucCot[0])} + k·${depPi(dt.luongGiac.T)}`);
  else {
    for (const x of dt.tcd) tc.push(`tiệm cận đứng x = ${dep(x)}`);
    for (const y of dt.tcn) tc.push(`tiệm cận ngang y = ${dep(y)}`);
    if (dt.tcx) tc.push(`tiệm cận xiên y = ${vietDaThuc([[dt.tcx.p, 1], [dt.tcx.q, 0]])}`);
  }
  if (tc.length) ghi(`Đồ thị có ${tc.join('; ')}.`, 'tiem-can');
  const cuc = dt.cucTri.filter(c => c.loai !== 'dung');
  const viX = dt.luongGiac ? depPi : dep;
  if (dt.luongGiac) {
    ghi(`Hàm số tuần hoàn với chu kì T = ${depPi(dt.luongGiac.T)}. Lập bảng biến thiên trên một chu kì.`, 'bbt');
  } else {
    const ng = dt.cucTri.map(c => `x = ${viX(c.x)}`);
    ghi(`${dt.daoHam}${ng.length ? `; y' = 0 ⇔ ${ng.join(' hoặc ')}` : `; y' ${dt.df(dt.mien ? (dt.mien[0] + 1) : 0.5) > 0 ? '> 0' : '< 0'} trên từng khoảng xác định`}. Lập bảng biến thiên.`, 'bbt');
  }
  const ds = [];
  for (const c of cuc) ds.push(`${c.loai === 'cd' ? 'cực đại' : 'cực tiểu'} (${viX(c.x)}; ${dep(c.y)})`);
  if (dt.giaoOy !== null && !dt.luongGiac) ds.push(`giao Oy (0; ${dep(dt.giaoOy)})`);
  if (dt.giaoOx.length && !dt.luongGiac) ds.push(`giao Ox tại x = ${dt.giaoOx.map(viX).join('; ')}`);
  for (const p of dt.dacBiet) ds.push(`(${dep(p.x)}; ${dep(p.y)})`);
  if (ds.length) ghi(`Các điểm đặc biệt: ${ds.join(', ')}.`, 'diem');
  let ket = 'Vẽ đồ thị đi qua các điểm trên, theo đúng chiều biến thiên trong bảng.';
  if (dt.doiXung?.loai === 'tam' && dt.ham === 'bac-ba') ket += ` Đồ thị nhận điểm I(${dep(dt.doiXung.x)}; ${dep(dt.doiXung.y)}) làm tâm đối xứng.`;
  if (dt.doiXung?.loai === 'tam' && dt.ham !== 'bac-ba') ket += ` Đồ thị nhận giao điểm hai tiệm cận I(${dep(dt.doiXung.x)}; ${dep(dt.doiXung.y)}) làm tâm đối xứng.`;
  if (dt.doiXung?.loai === 'truc') ket += ` Đồ thị là parabol có đỉnh (${dep(dt.cucTri[0].x)}; ${dep(dt.cucTri[0].y)}), trục đối xứng x = ${dep(dt.doiXung.x)}.`;
  ghi(ket, 'do-thi');
  return khung;
}

// ---------- AI đọc ảnh đồ thị ----------
// AI chỉ đọc những gì thấy trên ảnh (loại đồ thị, toạ độ các điểm có ghi số hoặc nằm đúng lưới, tiệm cận);
// app tự giải hệ số (bình phương tối thiểu), rồi đối chiếu lại các điểm AI đọc để báo chỗ lệch.

const so = { type: 'number' };
const doiTuong = (props) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });
const mang = items => ({ type: 'array', items });

export const LUOC_DO_DO_THI = doiTuong({
  hieu_anh: { type: 'string' },
  loai_ham: { type: 'string', enum: Object.keys(HAM) },
  diem_qua: mang(doiTuong({ x: so, y: so })),
  cuc_tri: mang(doiTuong({ x: so, y: so, loai: { type: 'string', enum: ['cuc-dai', 'cuc-tieu'] } })),
  tiem_can_dung: mang(so),
  tiem_can_ngang: mang(so),
  tiem_can_xien: mang(doiTuong({ he_so_goc: so, tung_do_goc: so })),
  luong_giac: doiTuong({ bien_do: so, chu_ki: so, pha_x: so, dich_doc: so }),
  co_so: so,
  khung: doiTuong({ x_nho: so, x_lon: so, y_nho: so, y_lon: so }),
  can_hoi: mang({ type: 'string' })
});

export const HUONG_DAN_DO_THI = `Bạn đọc ẢNH ĐỒ THỊ hàm số (sách giáo khoa Toán Việt Nam, chương trình 2018) và mô tả lại những gì thấy được theo lược đồ JSON. KHÔNG tự tính hệ số của hàm số: app sẽ tự giải.

- loai_ham: một trong ${Object.entries(HAM).map(([k, v]) => `${k} (${v.cong_thuc})`).join('; ')}.
  Nhận dạng: parabol → bac-hai; đường cong bậc ba có 2 cực trị hoặc dạng chữ S, không tiệm cận → bac-ba;
  hai nhánh hypebol, một tiệm cận đứng và một tiệm cận ngang → nhat-nhat; hai nhánh có tiệm cận đứng và tiệm cận xiên → hai-nhat;
  sóng tuần hoàn → sin hoặc cos (đọc giá trị tại x = 0: bằng giá trị lớn nhất/nhỏ nhất thì cos, bằng giá trị giữa thì sin);
  các nhánh lặp lại giữa các tiệm cận đứng: đồng biến → tan, nghịch biến → cot; đi qua (0; 1), tiệm cận ngang y = 0 → mu; đi qua (1; 0), tiệm cận đứng x = 0 → log.
- diem_qua: các điểm NẰM TRÊN ĐỒ THỊ đọc được chắc chắn (có ghi số trên trục, có đường gióng nét đứt, hoặc nằm đúng nút lưới), kể cả giao điểm với hai trục. Không đoán điểm ở giữa ô lưới. Càng nhiều điểm chắc chắn càng tốt (ít nhất 3 nếu có thể).
- cuc_tri: các điểm cực đại, cực tiểu thấy trên hình (toạ độ đọc từ đường gióng hoặc số ghi). Không có thì [].
- tiem_can_dung, tiem_can_ngang: hoành độ / tung độ các tiệm cận (đường nét đứt hoặc ghi rõ). tiem_can_xien: y = he_so_goc·x + tung_do_goc nếu có, không thì [].
- luong_giac (chỉ với sin, cos, tan, cot; loại khác ghi 0): bien_do = nửa khoảng cách giữa giá trị lớn nhất và nhỏ nhất (tan, cot: 1);
  chu_ki = độ dài một chu kì đọc trên trục hoành (theo đơn vị thật, ví dụ 2π ≈ 6.2832; π ≈ 3.1416);
  pha_x = một hoành độ mà tại đó hàm đạt giá trị lớn nhất (sin, cos) hoặc đồ thị cắt đường giữa và đi lên (tan) / đi xuống (cot);
  dich_doc = tung độ của đường giữa (trung bình của giá trị lớn nhất và nhỏ nhất; tan, cot: tung độ tại tâm mỗi nhánh).
  Hoành độ có π: ghi số thập phân (π/2 = 1.5708).
- co_so (chỉ với mu, log; loại khác ghi 0): cơ số a nếu đọc được (ví dụ đồ thị mũ đi qua (1; 3) thì a = 3), không chắc thì 0.
- khung: khoảng giá trị nhìn thấy trên hai trục của ảnh.
- can_hoi: điều không rõ trên ảnh (số bị mờ, không thấy đơn vị...). hieu_anh: một câu mô tả đồ thị.
Nếu ảnh có cả bảng biến thiên thì dùng thêm các giá trị trong bảng (cực trị, tiệm cận) để điền.`;

// Giải hệ hệ phương trình tuyến tính bình phương tối thiểu (dòng: [hệ số..., vế phải])
function binhPhuongToiThieu(dong, n) {
  if (dong.length < n) throw new Error(`Chưa đủ dữ kiện: cần ít nhất ${n} điều kiện, AI đọc được ${dong.length}`);
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (const r of dong) {
    const w = r.w || 1;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) M[i][j] += w * r.a[i] * r.a[j];
      M[i][n] += w * r.a[i] * r.b;
    }
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('Các điểm AI đọc được chưa đủ để xác định đồ thị (thiếu điểm hoặc trùng nhau)');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

// Làm tròn hệ số về số đẹp gần đó (AI đọc toạ độ có sai số nhỏ)
const tronDep = x => {
  for (const q of [1, 2, 3, 4, 6]) { const v = Math.round(x * q) / q; if (Math.abs(v - x) < 0.02 * Math.max(1, Math.abs(x))) return v; }
  return +x.toFixed(3);
};

// Ý nghĩa AI đọc được → { thamSo, canhBao, cauHoi, hieuAnh }
export function giaiDoThiTuAnh(y) {
  const ham = y.loai_ham;
  if (!HAM[ham]) throw new Error('AI không nhận ra loại đồ thị');
  const P = (y.diem_qua || []).filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
  const C = (y.cuc_tri || []).filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
  const tatCa = [...P, ...C];
  const canhBao = [];
  let he;
  const pi = LA_LUONG_GIAC(ham);
  if (ham === 'bac-hai') {
    const dong = tatCa.map(d => ({ a: [d.x * d.x, d.x, 1], b: d.y }));
    for (const c of C) dong.push({ a: [2 * c.x, 1, 0], b: 0, w: 4 });
    const [a, b, c] = binhPhuongToiThieu(dong, 3);
    he = { a, b, c };
  } else if (ham === 'bac-ba') {
    const dong = tatCa.map(d => ({ a: [d.x ** 3, d.x * d.x, d.x, 1], b: d.y }));
    for (const c of C) dong.push({ a: [3 * c.x * c.x, 2 * c.x, 1, 0], b: 0, w: 4 });
    const [a, b, c, d] = binhPhuongToiThieu(dong, 4);
    he = { a, b, c, d };
  } else if (ham === 'nhat-nhat') {
    // Chuẩn hoá c = 1: y = (ax + b)/(x + d) ⇔ a·x + b − y·d = x·y
    const dong = P.map(d => ({ a: [d.x, 1, -d.y], b: d.x * d.y }));
    for (const x0 of y.tiem_can_dung || []) dong.push({ a: [0, 0, 1], b: -x0, w: 9 });
    for (const y0 of y.tiem_can_ngang || []) dong.push({ a: [1, 0, 0], b: y0, w: 9 });
    const [a, b, d] = binhPhuongToiThieu(dong, 3);
    he = { a, b, c: 1, d };
  } else if (ham === 'hai-nhat') {
    // Chuẩn hoá m = 1: y = (ax² + bx + c)/(x + n). Cần tiệm cận đứng để tuyến tính hoá.
    const tcd = (y.tiem_can_dung || [])[0];
    let n;
    if (Number.isFinite(tcd)) n = -tcd;
    else {
      const dong0 = P.map(d => ({ a: [d.x * d.x, d.x, 1, -d.y], b: d.x * d.y }));
      n = binhPhuongToiThieu(dong0, 4)[3];
      canhBao.push('Ảnh không có tiệm cận đứng rõ: app tự suy ra từ các điểm.');
    }
    const dong = P.map(d => ({ a: [d.x * d.x, d.x, 1], b: d.y * (d.x + n) }));
    for (const t of y.tiem_can_xien || []) {
      dong.push({ a: [1, 0, 0], b: t.he_so_goc, w: 9 });
      dong.push({ a: [-n, 1, 0], b: t.tung_do_goc, w: 9 }); // q = b − a·n
    }
    for (const c of C) dong.push({ a: [c.x * c.x + 2 * n * c.x, n, -1], b: 0, w: 4 }); // a x² + 2a n x + b n − c = 0
    const [a, b, c] = binhPhuongToiThieu(dong, 3);
    he = { a, b, c, m: 1, n };
  } else if (pi) {
    const lg = y.luong_giac || {};
    if (!(lg.chu_ki > 0)) throw new Error('AI chưa đọc được chu kì của đồ thị lượng giác');
    const k = lg.dich_doc || 0;
    const w = ((ham === 'tan' || ham === 'cot') ? PI : 2 * PI) / lg.chu_ki;
    const A = ham === 'tan' || ham === 'cot' ? (lg.bien_do || 1) : (lg.bien_do || 1);
    // Pha: tại x = pha_x thì góc ωx + φ = π/2 (sin đạt lớn nhất), 0 (cos lớn nhất; tan, cot tại tâm nhánh: tan 0, cot π/2)
    const gocMoc = { sin: PI / 2, cos: 0, tan: 0, cot: PI / 2 }[ham];
    let p = gocMoc - w * (lg.pha_x || 0);
    // Đưa φ về (−π; π]
    p = ((p + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    he = { A, w, p, k };
  } else {
    let a = y.co_so;
    if (!(a > 0) || Math.abs(a - 1) < 1e-9) {
      // Không đọc được cơ số: suy từ một điểm (mũ: a = y^(1/x); lôgarit: a = x^(1/y))
      const d = P.find(q => (ham === 'mu' ? Math.abs(q.x) > 1e-9 && q.y > 0 : Math.abs(q.y) > 1e-9 && q.x > 0));
      if (!d) throw new Error('AI chưa đọc được cơ số và không có điểm nào để suy ra');
      a = ham === 'mu' ? d.y ** (1 / d.x) : d.x ** (1 / d.y);
    }
    he = { a };
  }
  // Làm tròn về số đẹp; φ, ω làm tròn theo bội của π
  const heSo = {};
  for (const [t, v] of Object.entries(he)) {
    if (pi && (t === 'p' || t === 'w')) { const r = tronDep(v / PI); heSo[t] = t === 'p' ? thanhChu(r * PI, true) : thanhChu(tronDep(v)); }
    else heSo[t] = thanhChu(tronDep(v));
  }
  const thamSo = { ham, he_so: heSo, khung: null };
  // Đối chiếu: các điểm AI đọc có nằm trên đồ thị vừa giải không
  try {
    const dt = taoDoThi(thamSo);
    const lech = tatCa.filter(d => Math.abs(dt.f(d.x) - d.y) > 0.15 * Math.max(1, Math.abs(d.y)));
    if (lech.length) canhBao.push(`Có ${lech.length} điểm AI đọc không nằm đúng trên đồ thị giải được: ${lech.map(d => `(${dep(d.x)}; ${dep(d.y)})`).join(', ')}. Thầy xem lại hệ số.`);
  } catch (e) { canhBao.push(e.message); }
  return { thamSo, canhBao, cauHoi: y.can_hoi || [], hieuAnh: y.hieu_anh || '' };
}
