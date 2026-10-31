// Bộ vẽ đồ thị hàm số và bảng biến thiên (SVG), kiểu sách giáo khoa: hệ trục có mũi tên, đơn vị hai trục bằng nhau,
// tiệm cận nét đứt, điểm đặc biệt có đường gióng nét đứt xuống hai trục, đồ thị nét liền mảnh.

import { cotTrongKhung, dep, depPi } from './do-thi.js';

const NS = 'http://www.w3.org/2000/svg';
const PI_2 = Math.PI / 2;
const FONT = '"Times New Roman", Times, serif';

export const KIEU_DO_THI = {
  'bai-giang': { truc: '#1d1d1f', luoi: '#9aa3ad', tc: '#6b778c', thi: '#1f3c88', diem: '#c0392b', chu: '#1d1d1f', gio: '#8a94a3', bbt: '#1d1d1f', muiTen: '#1f3c88' },
  'de': { truc: '#000', luoi: '#555', tc: '#000', thi: '#000', diem: '#000', chu: '#000', gio: '#000', bbt: '#000', muiTen: '#000' }
};

function phanTu(ten, attr = {}, cha = null) {
  const e = document.createElementNS(NS, ten);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  if (cha) cha.appendChild(e);
  return e;
}
const chu = (cha, x, y, noiDung, attr = {}) => {
  const t = phanTu('text', { x, y, 'font-family': FONT, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...attr }, cha);
  t.textContent = noiDung;
  return t;
};
let soClip = 0;

// Vẽ đồ thị vào svg (chiếm cả khung). lop: các lớp đang hiện (trình chiếu từng bước), null là tất cả.
export function veDoThi(svg, dt, { kieu = 'bai-giang', coChu = 18, lop = null, gio = null } = {}) {
  const W = svg.clientWidth || 800, H = svg.clientHeight || 520;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  veDoThiVao(svg, dt, W, H, { kieu, coChu, lop, gio });
}

// gio: tập khoá (khoaGio) các điểm đang bật đường gióng xuống hai trục
export function veDoThiVao(cha, dt, W, H, { kieu = 'bai-giang', coChu = 18, lop = null, gio = null } = {}) {
  const K = KIEU_DO_THI[kieu] || KIEU_DO_THI['bai-giang'];
  const co = x => !lop || lop.has(x);
  const g = phanTu('g', {}, cha);
  // Đơn vị hai trục bằng nhau: lấy tỉ lệ nhỏ hơn rồi nới khung theo chiều còn thừa
  const le = coChu * 1.4;
  const k = dt.khung;
  const tl = Math.min((W - 2 * le) / (k.x1 - k.x0), (H - 2 * le) / (k.y1 - k.y0));
  const cx = (k.x0 + k.x1) / 2, cy = (k.y0 + k.y1) / 2;
  // Chiều còn thừa chỗ: nới khung tối đa 25% rồi để trống hai bên, đồ thị nằm giữa (trục không kéo dài vô ích)
  const nuaX = Math.min((W - 2 * le) / (2 * tl), (k.x1 - k.x0) / 2 * 1.25);
  const nuaY = Math.min((H - 2 * le) / (2 * tl), (k.y1 - k.y0) / 2 * 1.25);
  const X0 = cx - nuaX, X1 = cx + nuaX, Y0 = cy - nuaY, Y1 = cy + nuaY;
  const sx = x => W / 2 + (x - cx) * tl, sy = y => H / 2 - (y - cy) * tl;
  const viX = dt.luongGiac ? depPi : dep;

  // Hệ trục: đi qua gốc toạ độ (gốc ngoài khung thì nằm sát mép)
  const ox = Math.min(Math.max(0, X0), X1), oy = Math.min(Math.max(0, Y0), Y1);
  const truc = phanTu('g', {}, g);
  if (co('truc')) {
    const net = { stroke: K.truc, 'stroke-width': 1.2 };
    phanTu('line', { x1: sx(X0) - le * 0.3, y1: sy(oy), x2: sx(X1) + le * 0.6, y2: sy(oy), ...net }, truc);
    phanTu('line', { x1: sx(ox), y1: sy(Y0) + le * 0.3, x2: sx(ox), y2: sy(Y1) - le * 0.6, ...net }, truc);
    const mui = (x, y, dx, dy) => phanTu('polygon', {
      points: [[x, y], [x - dx * 9 - dy * 3.5, y - dy * 9 + dx * 3.5], [x - dx * 9 + dy * 3.5, y - dy * 9 - dx * 3.5]].map(p => p.join(',')).join(' '), fill: K.truc
    }, truc);
    mui(sx(X1) + le * 0.6, sy(oy), 1, 0);
    mui(sx(ox), sy(Y1) - le * 0.6, 0, -1);
    const it = { 'font-size': coChu, 'font-style': 'italic', fill: K.chu };
    chu(truc, sx(X1) + le * 0.5, sy(oy) + coChu * 0.8, 'x', it);
    chu(truc, sx(ox) - coChu * 0.7, sy(Y1) - le * 0.5, 'y', it);
    chu(truc, sx(ox) - coChu * 0.55, sy(oy) + coChu * 0.65, 'O', it);
    // Vạch chia: số nguyên (thưa dần nếu dày); lượng giác chia theo phần tư chu kì, ghi theo π
    // Lượng giác: bắt đầu từ π/2 (hoặc phần tư chu kì nếu nhỏ hơn), gấp đôi đến khi hai số cách nhau đủ rộng để đọc
    let buocX = buocDep(26 / tl);
    if (dt.luongGiac) { buocX = Math.min(PI_2, dt.luongGiac.T / 4); while (buocX * tl < coChu * 2.6) buocX *= 2; }
    const buocY = buocDep(26 / tl);
    // Vạch chia để thấy đơn vị, không ghi số; số chỉ ghi ở các toạ độ liên quan (xem bên dưới)
    for (let i = Math.ceil(X0 / buocX); i * buocX <= X1; i++) {
      if (i) phanTu('line', { x1: sx(i * buocX), y1: sy(oy) - 3, x2: sx(i * buocX), y2: sy(oy) + 3, stroke: K.truc, 'stroke-width': 1 }, truc);
    }
    for (let i = Math.ceil(Y0 / buocY); i * buocY <= Y1; i++) {
      if (i) phanTu('line', { x1: sx(ox) - 3, y1: sy(i * buocY), x2: sx(ox) + 3, y2: sy(i * buocY), stroke: K.truc, 'stroke-width': 1 }, truc);
    }

    // Toạ độ liên quan: hoành độ, tung độ của cực trị, điểm đặc biệt, giao với hai trục, tiệm cận, tâm đối xứng.
    // Lượng giác thêm các mốc theo π trên trục hoành. Hai số quá sát nhau thì bỏ số sau.
    const vaoKhungX = x => x > X0 && x < X1 && Math.abs(x - ox) * tl > coChu * 0.5;
    const vaoKhungY = y => y > Y0 && y < Y1 && Math.abs(y - oy) * tl > coChu * 0.6;
    const RX = [], RY = [];
    const themX = (x, lopCan) => { if (co(lopCan) && Number.isFinite(x) && vaoKhungX(x) && !RX.some(v => Math.abs(v - x) * tl < coChu * 1.3)) RX.push(x); };
    const themY = (y, lopCan) => { if (co(lopCan) && Number.isFinite(y) && vaoKhungY(y) && !RY.some(v => Math.abs(v - y) * tl < coChu * 0.85)) RY.push(y); };
    const diemLq = [...dt.cucTri, ...dt.dacBiet].filter(p => p.x >= X0 && p.x <= X1 && p.y >= Y0 && p.y <= Y1);
    for (const p of diemLq) { themX(p.x, 'diem'); themY(p.y, 'diem'); }
    if (!dt.luongGiac) for (const x of dt.giaoOx) if (!/,/.test(dep(x))) themX(x, 'diem');
    if (dt.giaoOy !== null) themY(dt.giaoOy, 'diem');
    if (dt.doiXung?.loai === 'tam') { themX(dt.doiXung.x, 'diem'); themY(dt.doiXung.y, 'diem'); }
    for (const x of dt.tcd) themX(x, 'tiem-can');
    for (const y of dt.tcn) themY(y, 'tiem-can');
    if (dt.luongGiac) for (let i = Math.ceil(X0 / buocX); i * buocX <= X1; i++) themX(i * buocX, 'truc');
    // Chưa có số nào trên một trục (bước đầu khi vẽ từng bước): ghi số 1 để thấy đơn vị
    if (!RX.length) themX(dt.luongGiac ? buocX : 1, 'truc');
    if (!RY.length) themY(1, 'truc');
    const cs = { 'font-size': coChu * 0.72, fill: K.chu };
    for (const x of RX) {
      phanTu('line', { x1: sx(x), y1: sy(oy) - 3, x2: sx(x), y2: sy(oy) + 3, stroke: K.truc, 'stroke-width': 1 }, truc);
      // Sát trục tung thì đẩy sang bên cho khỏi đè chữ O
      const satO = Math.abs(x - ox) * tl < coChu * 1.2;
      chu(truc, sx(x) + (satO ? Math.sign(x - ox) * coChu * 0.45 : 0), sy(oy) + coChu * 0.8, viX(x), { ...cs, ...(satO ? { 'text-anchor': x < ox ? 'end' : 'start' } : {}) });
    }
    for (const y of RY) {
      phanTu('line', { x1: sx(ox) - 3, y1: sy(y), x2: sx(ox) + 3, y2: sy(y), stroke: K.truc, 'stroke-width': 1 }, truc);
      chu(truc, sx(ox) - coChu * 0.45, sy(y), dep(y), { ...cs, 'text-anchor': 'end' });
    }
  }

  // Vùng vẽ: cắt đồ thị và tiệm cận trong khung
  const id = 'khung-do-thi-' + (++soClip);
  const clip = phanTu('clipPath', { id }, g);
  phanTu('rect', { x: sx(X0), y: sy(Y1), width: sx(X1) - sx(X0), height: sy(Y0) - sy(Y1) }, clip);

  if (co('tiem-can')) {
    const tc = phanTu('g', { 'clip-path': `url(#${id})`, stroke: K.tc, 'stroke-width': 1, 'stroke-dasharray': '6 4' }, g);
    for (const x of cotTrongKhung(dt, X0, X1)) phanTu('line', { x1: sx(x), y1: sy(Y0), x2: sx(x), y2: sy(Y1) }, tc);
    for (const y of dt.tcn) if (Math.abs(y) > 1e-9) phanTu('line', { x1: sx(X0), y1: sy(y), x2: sx(X1), y2: sy(y) }, tc);
    if (dt.tcx) phanTu('line', { x1: sx(X0), y1: sy(dt.tcx.p * X0 + dt.tcx.q), x2: sx(X1), y2: sy(dt.tcx.p * X1 + dt.tcx.q) }, tc);
  }

  if (co('do-thi')) {
    const cot = cotTrongKhung(dt, X0, X1);
    const N = 900;
    // Lấy mẫu rồi cắt đúng tại mép trên, mép dưới của khung (tính giao điểm), ngắt tại tiệm cận đứng.
    // Không để phần ngoài khung trong hình: khi xuất ảnh, phần đó làm ảnh bị kéo dài dù đã bị che.
    const doan = [];
    let hien = [], truoc = null;
    const ngat = () => { if (hien.length > 1) doan.push(hien); hien = []; };
    for (let i = 0; i <= N; i++) {
      const x = X0 + (X1 - X0) * i / N, y = dt.f(x);
      if (!Number.isFinite(y) || (truoc && cot.some(c => (truoc[0] - c) * (x - c) <= 0))) { ngat(); truoc = Number.isFinite(y) ? [x, y] : null; continue; }
      const trong = y >= Y0 && y <= Y1;
      if (truoc) {
        const [xa, ya] = truoc, trongTruoc = ya >= Y0 && ya <= Y1;
        // Giao của đoạn (truoc → hiện tại) với mép y = m
        const cat = m => [xa + (x - xa) * (m - ya) / (y - ya), m];
        if (trongTruoc && !trong) { hien.push(cat(y > Y1 ? Y1 : Y0)); ngat(); }
        else if (!trongTruoc && trong) { ngat(); hien.push(cat(ya > Y1 ? Y1 : Y0)); }
        else if (!trongTruoc && !trong && (ya - Y1) * (y - Y1) < 0 && (ya - Y0) * (y - Y0) < 0) { ngat(); hien.push(cat(ya > Y1 ? Y1 : Y0), cat(y > Y1 ? Y1 : Y0)); ngat(); }
      } else if (!trong) { truoc = [x, y]; continue; }
      if (trong) hien.push([x, y]);
      truoc = [x, y];
    }
    ngat();
    // Đồ thị nét đậm (dày hơn trục, tiệm cận) cho nổi trên hình
    const nhom = phanTu('g', { fill: 'none', stroke: K.thi, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    for (const d of doan) phanTu('polyline', { points: d.map(([x, y]) => `${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(' ') }, nhom);
  }

  if (co('diem')) {
    const lopD = phanTu('g', {}, g);
    const lopBam = phanTu('g', {}, g); // vùng bấm (trên cùng), xuất ảnh thì bỏ
    const trong = (x, y) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;
    // Đường gióng nét đứt từ điểm xuống hai trục: chỉ vẽ ở điểm thầy đã bấm (gio: tập khoá điểm)
    const g2 = { stroke: K.gio, 'stroke-width': 0.9, 'stroke-dasharray': '3 3' };
    const daCham = new Set();
    const cham = (x, y) => {
      const khoa = khoaGio(x, y);
      if (daCham.has(khoa)) return; // giao Oy trùng tâm đối xứng...
      daCham.add(khoa);
      if (gio?.has(khoa)) {
        if (Math.abs(y - oy) > 1e-9) phanTu('line', { x1: sx(x), y1: sy(y), x2: sx(x), y2: sy(oy), ...g2 }, lopD);
        if (Math.abs(x - ox) > 1e-9) phanTu('line', { x1: sx(x), y1: sy(y), x2: sx(ox), y2: sy(y), ...g2 }, lopD);
      }
      phanTu('circle', { cx: sx(x), cy: sy(y), r: 3, fill: K.diem }, lopD);
      const vb = phanTu('circle', { cx: sx(x), cy: sy(y), r: 11, fill: 'transparent', 'data-diem': khoa, 'data-gio': khoa }, lopBam);
      vb.style.cursor = 'pointer';
      vb.style.pointerEvents = 'all';
      const t = phanTu('title', {}, vb);
      t.textContent = `(${viX(x)}; ${dep(y)}): bấm để ${gio?.has(khoa) ? 'ẩn' : 'hiện'} đường gióng`;
    };
    for (const c of dt.cucTri) if (trong(c.x, c.y)) cham(c.x, c.y);
    for (const p of dt.dacBiet) if (trong(p.x, p.y)) cham(p.x, p.y);
    if (!dt.luongGiac) {
      // Giao điểm với Ox (nghiệm lẻ như −1,879 thì chỉ chấm điểm, không ghi số, như SGK)
      for (const x of dt.giaoOx) if (trong(x, 0) && !dt.cucTri.some(c => Math.abs(c.x - x) < 1e-9)) cham(x, 0);
      if (dt.giaoOy !== null && trong(0, dt.giaoOy) && !dt.cucTri.some(c => Math.abs(c.x) < 1e-9)) cham(0, dt.giaoOy);
    }
    if (dt.doiXung?.loai === 'tam' && trong(dt.doiXung.x, dt.doiXung.y)) {
      cham(dt.doiXung.x, dt.doiXung.y);
      chu(lopD, sx(dt.doiXung.x) + coChu * 0.5, sy(dt.doiXung.y) - coChu * 0.55, 'I', { 'font-size': coChu * 0.85, 'font-style': 'italic', fill: K.chu });
    }
  }
}

// Khoá của một điểm trên đồ thị (để nhớ điểm nào đang bật đường gióng)
export const khoaGio = (x, y) => `${+x.toFixed(6)};${+y.toFixed(6)}`;

// Bước chia đẹp (1, 2, 5 × 10ⁿ) không nhỏ hơn d
function buocDep(d) {
  const m = 10 ** Math.floor(Math.log10(Math.max(d, 1e-9)));
  for (const k of [1, 2, 5, 10]) if (k * m >= d) return Math.max(k * m, 1);
  return 10 * m;
}

// ---------- Bảng biến thiên ----------
// bang: core/do-thi.js bangBienThien. Ba dòng: x, y', y; mũi tên đi lên/xuống giữa các giá trị.
export function veBBT(svg, bang, { kieu = 'bai-giang', coChu = 17 } = {}) {
  const W = svg.clientWidth || 800, H = svg.clientHeight || 200;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  veBBTVao(svg, bang, W, H, { kieu, coChu });
}

export function veBBTVao(cha, bang, W, H, { kieu = 'bai-giang', coChu = 17 } = {}) {
  const K = KIEU_DO_THI[kieu] || KIEU_DO_THI['bai-giang'];
  // Bảng không trải hết bề ngang màn hình rộng: tối đa ~40 cỡ chữ, đặt giữa
  const rong = Math.min(W, coChu * 40);
  const g = phanTu('g', { transform: `translate(${((W - rong) / 2).toFixed(1)} 0)` }, cha);
  W = rong;
  const le = 8, cot0 = Math.max(52, coChu * 3);
  const h1 = Math.min(H * 0.22, coChu * 2.1), h2 = h1, h3 = H - 2 * le - h1 - h2;
  const top = le, x0 = le, x1 = W - le;
  const yA = top + h1, yB = yA + h2, yC = yB + h3;
  const net = { stroke: K.bbt, 'stroke-width': 1.1 };
  phanTu('rect', { x: x0, y: top, width: x1 - x0, height: yC - top, fill: 'none', ...net }, g);
  phanTu('line', { x1: x0, y1: yA, x2: x1, y2: yA, ...net }, g);
  phanTu('line', { x1: x0, y1: yB, x2: x1, y2: yB, ...net }, g);
  phanTu('line', { x1: x0 + cot0, y1: top, x2: x0 + cot0, y2: yC, ...net }, g);
  const it = { 'font-size': coChu, 'font-style': 'italic', fill: K.chu };
  chu(g, x0 + cot0 / 2, (top + yA) / 2, 'x', it);
  chu(g, x0 + cot0 / 2, (yA + yB) / 2, "y'", it);
  chu(g, x0 + cot0 / 2, (yB + yC) / 2, 'y', it);

  const n = bang.cot.length;
  const chua = coChu * 1.3;
  const cx = i => x0 + cot0 + chua + (x1 - x0 - cot0 - 2 * chua) * (n === 1 ? 0.5 : i / (n - 1));
  const so = { 'font-size': coChu, fill: K.chu };
  const viTriY = vi => (vi === 'tren' ? yB + coChu * 0.9 : vi === 'duoi' ? yC - coChu * 0.9 : (yB + yC) / 2);
  // Điểm đầu/cuối của mũi tên ở mỗi cột: { x, y } bên trái và bên phải
  const dau = [];
  bang.cot.forEach((c, i) => {
    const X = cx(i);
    chu(g, X, (top + yA) / 2, c.x, so);
    if (c.loai === 'cot' || c.loai === 'bien-cot') {
      // Hai vạch đứng sát nhau: hàm không xác định tại đây
      for (const d of [-2, 2]) phanTu('line', { x1: X + d, y1: yA, x2: X + d, y2: yC, ...net }, g);
      const o = {};
      if (c.trai) { const y = viTriY(c.trai.vi); chu(g, X - coChu * 0.9, y, c.trai.chu, { ...so, 'text-anchor': 'end' }); o.trai = { x: X - coChu * 0.9 - textW(c.trai.chu, coChu) - 3, y }; }
      if (c.phai) { const y = viTriY(c.phai.vi); chu(g, X + coChu * 0.9, y, c.phai.chu, { ...so, 'text-anchor': 'start' }); o.phai = { x: X + coChu * 0.9 + textW(c.phai.chu, coChu) + 3, y }; }
      dau.push(o);
    } else {
      const y = viTriY(c.gia.vi);
      chu(g, X, y, c.gia.chu, so);
      const r = textW(c.gia.chu, coChu) / 2 + 4;
      dau.push(c.gia.vi === 'giua' ? { trai: { x: X - r, y }, phai: { x: X + r, y } } : { trai: { x: X - r, y }, phai: { x: X + r, y } });
      if (c.loai === 'cuc' || c.loai === 'dung') chu(g, X, (yA + yB) / 2, '0', so);
    }
  });
  // Dấu y' và mũi tên trên từng khoảng
  for (let i = 0; i + 1 < n; i++) {
    chu(g, (cx(i) + cx(i + 1)) / 2, (yA + yB) / 2, bang.dau[i] === '+' ? '+' : '−', { ...so, 'font-size': coChu * 1.1 });
    const a = dau[i].phai, b = dau[i + 1].trai;
    if (!a || !b) continue;
    muiTen(g, a.x + 2, a.y + (a.y < b.y ? coChu * 0.45 : a.y > b.y ? -coChu * 0.45 : 0), b.x - 2, b.y + (a.y < b.y ? -coChu * 0.45 : a.y > b.y ? coChu * 0.45 : 0), K.muiTen);
  }
}

// Chiều rộng ước chừng của chữ (để mũi tên không đè lên số)
const textW = (s, co) => String(s).length * co * 0.5;

function muiTen(cha, x1, y1, x2, y2, mau) {
  phanTu('line', { x1, y1, x2, y2, stroke: mau, 'stroke-width': 1.3 }, cha);
  const d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d;
  phanTu('polygon', { points: [[x2, y2], [x2 - ux * 9 - uy * 3.5, y2 - uy * 9 + ux * 3.5], [x2 - ux * 9 + uy * 3.5, y2 - uy * 9 - ux * 3.5]].map(p => p.join(',')).join(' '), fill: mau }, cha);
}
