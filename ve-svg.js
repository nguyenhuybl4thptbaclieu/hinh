// Bộ vẽ SVG: nhận hình (lõi) + phép chiếu + kiểu, trả về hình vẽ.
// Nét thấy liền, nét khuất đứt, kiểu hình biểu diễn SGK.

import { tinhNet, matPhangDay, dauMutDoan, laDuongBien } from './hinh.js';
import { chiaDoan } from './net-khuat.js';
import { lerp, len, sub, dot, centroid } from './vec.js';

const NS = 'http://www.w3.org/2000/svg';

// Nét mảnh (thầy không thích nét đậm)
// matP / toMatP: viền và màu mặt phẳng chứa đáy; toDay: màu đáy phủ lên mặt phẳng đó (sáng hơn để đáy nổi lên)
// toTrai: màu các mặt khi trải phẳng (đáy, mặt bên, đáy trên)
export const KIEU = {
  'de': {
    canh: '#000', phu: '#000', noi: '#000', td: '#000', toTd: 'rgba(0, 0, 0, 0.09)', diem: '#000', chu: '#000', moi: '#d9480f',
    matP: '#555', toMatP: 'rgba(0, 0, 0, 0.13)', toDay: 'rgba(255, 255, 255, 0.72)',
    toTrai: { day: '#e9e9e9', ben: '#fafafa', tren: '#f1f1f1' }, doDac: '#000',
    rong: 1.4, rongKhuat: 1.1, rongPhu: 1.1, net: '5 4', banKinhDiem: 2.2
  },
  'bai-giang': {
    canh: '#1f3c88', phu: '#6b778c', noi: '#2f6f4f', td: '#c0392b', toTd: 'rgba(230, 126, 34, 0.30)', diem: '#1b1f24', chu: '#1b1f24', moi: '#e8590c',
    matP: '#5a6b8c', toMatP: 'rgba(52, 78, 140, 0.20)', toDay: 'rgba(255, 255, 255, 0.70)',
    toTrai: { day: '#cfe0ff', ben: '#f3f7ff', tren: '#ffe3c2' }, doDac: '#8e3fbf',
    rong: 1.8, rongKhuat: 1.4, rongPhu: 1.3, net: '6 4', banKinhDiem: 2.6
  }
};

// Canh hình chiếu của các điểm vừa khung, chừa lề cho tên điểm; trả về hàm đổi toạ độ 3D → toạ độ trên khung
function canhKhung(svg, diem3, pc, coChu) {
  const W = svg.clientWidth || 800, H = svg.clientHeight || 600;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const q2 = diem3.map(pc.chieu);
  const xs = q2.map(q => q[0]), ys = q2.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const le = coChu * 2;
  const tl = Math.min((W - 2 * le) / Math.max(x1 - x0, 1e-9), (H - 2 * le) / Math.max(y1 - y0, 1e-9));
  const gx = (x0 + x1) / 2, gy = (y0 + y1) / 2;
  return p3 => { const q = pc.chieu(p3); return [W / 2 + (q[0] - gx) * tl, H / 2 - (q[1] - gy) * tl]; };
}

// Mặt phẳng chứa đáy: tô đậm hơn đáy, viền mảnh; phần viền bị khối che vẽ đứt; ghi tên (P) ở góc trước
function veMatPhangDay(lop, hinh, pc, man, K, coChu) {
  const goc = matPhangDay(hinh);
  const day = hinh.mat[0].map(t => man(hinh.diem[t]));
  lop.appendChild(phanTu('polygon', { points: goc.map(p => man(p).join(',')).join(' '), fill: K.toMatP, stroke: 'none' }));
  lop.appendChild(phanTu('polygon', { points: day.map(q => q.join(',')).join(' '), fill: K.toDay, stroke: 'none' }));
  const eps = 1e-7 * hinh.banKinh;
  for (let i = 0; i < 4; i++) {
    const P = goc[i], Q = goc[(i + 1) % 4];
    for (const k of chiaDoan(P, Q, hinh.matChe, pc, eps)) {
      const l = duong(man(lerp(P, Q, k.t0)), man(lerp(P, Q, k.t1)), { stroke: K.matP, 'stroke-width': 1 });
      if (k.khuat) l.setAttribute('stroke-dasharray', K.net);
      lop.appendChild(l);
    }
  }
  // Tên mặt phẳng: ở góc xa các đỉnh của khối nhất (không đè tên điểm), lùi vào trong góc một khoảng cố định
  const q = goc.map(man);
  const dinh = Object.values(hinh.diem).map(man);
  const lui = coChu * 0.75;
  const choDat = q.map((p, i) => {
    const ke = [q[(i + 1) % 4], q[(i + 3) % 4]].map(r => { const d = Math.hypot(r[0] - p[0], r[1] - p[1]) || 1; return [(r[0] - p[0]) / d, (r[1] - p[1]) / d]; });
    return [p[0] + (ke[0][0] + ke[1][0]) * lui, p[1] + (ke[0][1] + ke[1][1]) * lui];
  });
  const xa = p => Math.min(...dinh.map(d => Math.hypot(d[0] - p[0], d[1] - p[1])));
  const [x, y] = choDat.reduce((m, p) => (xa(p) > xa(m) ? p : m));
  const t = phanTu('text', {
    x, y,
    fill: K.matP, 'font-size': coChu * 0.85, 'font-family': '"Times New Roman", Times, serif', 'font-style': 'italic',
    'text-anchor': 'middle', 'dominant-baseline': 'central'
  });
  t.textContent = '(P)';
  lop.appendChild(t);
}

// Màu và độ dày theo loại đoạn: cạnh khối, nét phụ (đường cao, chéo đáy, phần kéo dài), đoạn nối thêm, cạnh thiết diện
const kieuDoan = (K, s) => s.loai === 'thiet-dien' || s.thietDien ? { mau: K.td, rong: K.rong }
  : s.loai === 'phu' || s.loai === 'keo-dai' ? { mau: K.phu, rong: K.rongPhu }
  : s.loai === 'noi' ? { mau: K.noi, rong: K.rongPhu }
  : { mau: K.canh, rong: K.rong };

// ep: {idĐoạn: 'tu-dong' | 'lien' | 'khuat'} cho phép chỉnh tay từng nét
// khung (trình chiếu từng bước): { doan, diem, daGiac, moi } — chỉ vẽ những gì đã dựng tới bước này, tô nổi phần mới
// diemChon: điểm vừa bấm khi nối hai điểm bằng chuột (vẽ vòng tô quanh nó)
// doVe: hình vẽ của các phép đo đang hiện (core/do-dac.js hinhVeDo): đoạn khoảng cách, cung góc, dấu góc vuông
export function veHinh(svg, hinh, pc, { kieu = 'bai-giang', anPhu = false, ep = {}, chon = null, coChu = 20, khung = null, matDay = false, diemChon = null, doVe = [] } = {}) {
  const K = KIEU[kieu];
  if (hinh.cau) matDay = false; // mặt cầu không có đáy
  // Canh hình chiếu vừa khung (đổi liên tục khi xoay nên không bị giật); có mặt phẳng đáy thì canh cả mặt phẳng
  // Đường thẳng kéo dài ra ngoài khối: canh khung theo cả hai đầu kéo dài
  const dauDuong = hinh.doan.filter(s => s.duong).flatMap(s => dauMutDoan(hinh, s));
  // Chân đường vuông góc của phép đo có thể ở ngoài khối: cũng phải lọt khung
  const diemDo = doVe.flatMap(v => [...v.diem, ...v.doan.flatMap(s => [s.a, s.b])]);
  const man = canhKhung(svg, [...Object.values(hinh.diem), ...dauDuong, ...diemDo, ...(matDay ? matPhangDay(hinh) : [])], pc, coChu);

  const net = tinhNet(hinh, pc);
  const lop = { matP: nhom(svg), to: nhom(svg), chon: nhom(svg), khuat: nhom(svg), thay: nhom(svg), bam: nhom(svg), diem: nhom(svg), chu: nhom(svg), bamDiem: nhom(svg) };
  if (matDay) veMatPhangDay(lop.matP, hinh, pc, man, K, coChu);
  // Khối tròn xoay: lưới chia mặt không vẽ; đường sinh chỉ vẽ khi là đường biên của hình
  const hienDoan = s => !s.an && !(s.tron && !laDuongBien(s, pc)) && !(anPhu && s.loai === 'phu') && (!khung || khung.doan.has(s.id));
  const hienDiem = t => !khung || khung.diem.has(t);
  const laMoi = x => !!khung?.moi.has(x);
  if (hinh.cau && (!khung || khung.doan.has('vien-cau'))) veVienCau(lop.thay, hinh.cau, pc, man, K, laMoi('vien-cau'));

  // Tô thiết diện (nằm dưới các nét)
  for (const dg of hinh.daGiac || []) {
    if (!dg.to_mau || (khung && !khung.daGiac.has(dg.id))) continue;
    lop.to.appendChild(phanTu('polygon', { points: dg.diem.map(t => man(hinh.diem[t]).join(',')).join(' '), fill: K.toTd, stroke: 'none' }));
  }

  for (const s of hinh.doan) {
    if (!hienDoan(s)) continue;
    // Trình chiếu: chưa tới bước vẽ đường thẳng thì vẽ như đoạn thường
    const keoDai = s.duong && (!khung || khung.duong?.has(s.id));
    const [P, Q] = dauMutDoan(hinh, keoDai ? s : { ...s, duong: false });
    const cheDo = ep[s.id] || 'tu-dong';
    const khuc = cheDo === 'lien' ? [{ t0: 0, t1: 1, khuat: false }]
      : cheDo === 'khuat' ? [{ t0: 0, t1: 1, khuat: true }]
      : s.duong && !keoDai ? chiaDoan(P, Q, hinh.matChe, pc, 1e-7 * hinh.banKinh)
      : s.tron ? [{ t0: 0, t1: 1, khuat: false }] // đường biên của khối lồi luôn thấy
      : net.get(s.id);
    let { mau, rong } = kieuDoan(K, s);
    if (laMoi(s.id)) { mau = K.moi; rong += 0.8; }
    for (const k of khuc) {
      const a = man(lerp(P, Q, k.t0)), b = man(lerp(P, Q, k.t1));
      const l = duong(a, b, {
        stroke: mau,
        'stroke-width': k.khuat ? Math.min(K.rongKhuat, rong) : rong,
        'stroke-linecap': k.khuat ? 'butt' : 'round'
      });
      if (k.khuat) l.setAttribute('stroke-dasharray', K.net);
      (k.khuat ? lop.khuat : lop.thay).appendChild(l);
    }
    const a = man(P), b = man(Q);
    if (chon === s.id) lop.chon.appendChild(duong(a, b, { stroke: '#ffd54a', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.8 }));
    // Vùng bấm rộng, trong suốt, để chọn nét
    const vb = duong(a, b, { stroke: 'transparent', 'stroke-width': 14, 'data-doan': s.id });
    vb.style.cursor = 'pointer';
    lop.bam.appendChild(vb);
    // Tên đường thẳng (d, Δ...) ở gần đầu kéo dài phía sau, lệch sang bên để không đè lên nét
    if (keoDai && s.tenDuong) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const t = phanTu('text', {
        x: b[0] - dx / l * coChu * 0.6 - dy / l * coChu * 0.55, y: b[1] - dy / l * coChu * 0.6 + dx / l * coChu * 0.55,
        fill: mau, 'font-size': coChu * 0.9, 'font-family': '"Times New Roman", Times, serif', 'font-style': 'italic',
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      t.textContent = s.tenDuong;
      lop.chu.appendChild(t);
    }
  }

  // Dấu góc vuông: hình vuông nhỏ ở chân đường vuông góc, vẽ trong không gian rồi chiếu (nên nghiêng theo hình)
  for (const g of hinh.dauGoc || []) {
    if (![g.dinh, g.a, g.b].every(t => hinh.diem[t] && hienDiem(t))) continue;
    const O = hinh.diem[g.dinh], A = hinh.diem[g.a], B = hinh.diem[g.b];
    const da = len(sub(A, O)), db = len(sub(B, O));
    const s = Math.min(0.09 * hinh.banKinh, 0.35 * da, 0.35 * db);
    const u = sub(A, O).map(x => x / da * s), v = sub(B, O).map(x => x / db * s);
    const p = [O.map((x, i) => x + u[i]), O.map((x, i) => x + u[i] + v[i]), O.map((x, i) => x + v[i])].map(man);
    lop.thay.appendChild(phanTu('polyline', {
      points: p.map(q => q.join(',')).join(' '), fill: 'none',
      stroke: laMoi(g.dinh) ? K.moi : K.phu, 'stroke-width': 1.2
    }));
  }

  if (doVe.length) veDoDac(lop.thay, lop.khuat, lop.chu, doVe, hinh, pc, man, K, coChu);

  const doanHien = hinh.doan.filter(hienDoan);
  const tam2 = man(hinh.tam);
  for (const [ten, p3] of Object.entries(hinh.diem)) {
    if (!hienDiem(ten) || hinh.diemAn?.has(ten)) continue;
    // Ẩn nét phụ thì ẩn luôn điểm chỉ dùng cho nét phụ (như chân đường cao O)
    const ke = hinh.doan.filter(s => s.a === ten || s.b === ten);
    if (anPhu && ke.length && ke.every(s => s.loai === 'phu')) continue;
    const p = man(p3);
    const moi = laMoi(ten);
    if (diemChon === ten) lop.chon.appendChild(phanTu('circle', { cx: p[0], cy: p[1], r: 9, fill: 'rgba(0, 113, 227, 0.18)', stroke: '#0071e3', 'stroke-width': 1.5 }));
    // data-ten: để xuất TikZ đặt tên toạ độ (\coordinate (A)) cho điểm
    lop.diem.appendChild(phanTu('circle', { cx: p[0], cy: p[1], r: K.banKinhDiem + (moi ? 1.2 : 0), fill: moi ? K.moi : K.diem, 'data-ten': ten }));
    // Vùng bấm quanh điểm (nằm trên cùng để bấm trúng điểm dễ hơn trúng nét)
    const vb = phanTu('circle', { cx: p[0], cy: p[1], r: 10, fill: 'transparent', 'data-diem': ten });
    vb.style.cursor = 'pointer';
    vb.style.pointerEvents = 'all'; // vùng tô trong suốt vẫn nhận chuột
    lop.bamDiem.appendChild(vb);
    const h = huongNhan(ten, p3, p, hinh, doanHien, man, tam2);
    const kc = coChu * 0.78;
    const t = phanTu('text', {
      x: p[0] + h[0] * kc, y: p[1] + h[1] * kc,
      fill: moi ? K.moi : K.chu, 'font-size': coChu, 'font-family': '"Times New Roman", Times, serif',
      'font-weight': moi ? 'bold' : 'normal',
      'text-anchor': 'middle', 'dominant-baseline': 'central'
    });
    t.textContent = ten.replace(/'/g, '′');
    lop.chu.appendChild(t);
  }
  return { net };
}

// Đường viền mặt cầu: đường tròn lớn vuông góc với hướng nhìn (hình chiếu của nó là đường bao của hình), luôn thấy
function veVienCau(lop, cau, pc, man, K, moi) {
  const d = pc.huong, dd = Math.hypot(...d);
  const w = d.map(x => x / dd);
  let e1 = Math.abs(w[2]) < 0.9 ? [w[1], -w[0], 0] : [0, w[2], -w[1]];
  const l1 = Math.hypot(...e1);
  e1 = e1.map(x => x / l1);
  const e2 = [w[1] * e1[2] - w[2] * e1[1], w[2] * e1[0] - w[0] * e1[2], w[0] * e1[1] - w[1] * e1[0]];
  const diem = [];
  for (let i = 0; i <= 180; i++) {
    const t = 2 * Math.PI * i / 180;
    diem.push(man(cau.O.map((x, k) => x + cau.r * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]))));
  }
  lop.appendChild(phanTu('polyline', {
    points: diem.map(q => q.join(',')).join(' '), fill: 'none',
    stroke: moi ? K.moi : K.canh, 'stroke-width': moi ? K.rong + 0.8 : K.rong, 'stroke-linejoin': 'round'
  }));
}

// Hình vẽ của phép đo: đoạn khoảng cách (đậm hơn, phần bị khối che vẽ đứt), nét phụ (mảnh, đứt),
// cung đánh dấu góc kèm số đo, dấu góc vuông, chữ ghi độ dài
function veDoDac(lopThay, lopKhuat, lopChu, doVe, hinh, pc, man, K, coChu) {
  const mau = K.doDac, eps = 1e-7 * hinh.banKinh;
  const chu = (x, y, noiDung, coThem = {}) => {
    const t = phanTu('text', {
      x, y, fill: mau, 'font-size': coChu * 0.78, 'font-family': '"Times New Roman", Times, serif',
      'text-anchor': 'middle', 'dominant-baseline': 'central', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3, 'stroke-linejoin': 'round', ...coThem
    });
    t.textContent = noiDung;
    lopChu.appendChild(t);
  };
  for (const v of doVe) {
    for (const s of v.doan) {
      // chính: đoạn khoảng cách (đậm); đề: đường đề cho (như nét thường); phụ: nét đứt nhạt
      const chinh = s.loai === 'chinh', phu = s.loai === 'phu';
      for (const k of chiaDoan(s.a, s.b, hinh.matChe, pc, eps)) {
        const l = duong(man(lerp(s.a, s.b, k.t0)), man(lerp(s.a, s.b, k.t1)), {
          stroke: mau, 'stroke-width': chinh ? K.rong + 0.4 : phu ? 1 : K.rongPhu, 'stroke-linecap': 'round', opacity: phu ? 0.75 : 1
        });
        if (k.khuat || phu) l.setAttribute('stroke-dasharray', phu ? '3 3' : K.net);
        (k.khuat ? lopKhuat : lopThay).appendChild(l);
      }
    }
    for (const p of v.diem) {
      const q = man(p);
      lopThay.appendChild(phanTu('circle', { cx: q[0], cy: q[1], r: K.banKinhDiem * 0.85, fill: mau }));
    }
    for (const g of v.vuong) {
      const du = len(g.u), dv = len(g.v);
      if (du < 1e-12 || dv < 1e-12) continue;
      const s = 0.07 * hinh.banKinh;
      const u = g.u.map(x => x / du * s), w = g.v.map(x => x / dv * s);
      const p = [g.O.map((x, i) => x + u[i]), g.O.map((x, i) => x + u[i] + w[i]), g.O.map((x, i) => x + w[i])].map(man);
      lopThay.appendChild(phanTu('polyline', { points: p.map(q => q.join(',')).join(' '), fill: 'none', stroke: mau, 'stroke-width': 1 }));
    }
    for (const c of v.cung) {
      const du = len(c.u), dv = len(c.v);
      if (du < 1e-12 || dv < 1e-12) continue;
      const e1 = c.u.map(x => x / du);
      const vt = sub(c.v, e1.map(x => x * dot(c.v, e1)));
      const lvt = len(vt);
      if (lvt < 1e-12) continue;
      const e2 = vt.map(x => x / lvt);
      const t = Math.atan2(lvt / dv, dot(c.v, e1) / dv);
      const r = Math.min(0.16 * hinh.banKinh, 0.45 * du, 0.45 * dv);
      const diem = [];
      for (let i = 0; i <= 24; i++) {
        const f = t * i / 24;
        diem.push(man(c.O.map((x, k) => x + r * (Math.cos(f) * e1[k] + Math.sin(f) * e2[k]))));
      }
      lopThay.appendChild(phanTu('polyline', { points: diem.map(q => q.join(',')).join(' '), fill: 'none', stroke: mau, 'stroke-width': 1.3 }));
      // Số đo đặt ngoài cung, trên đường phân giác
      const O2 = man(c.O), giua = diem[12];
      const dx = giua[0] - O2[0], dy = giua[1] - O2[1], l = Math.hypot(dx, dy) || 1;
      chu(giua[0] + dx / l * coChu * 0.9, giua[1] + dy / l * coChu * 0.9, c.chu, { 'font-style': 'normal' });
    }
    for (const n of v.nhan) {
      const q = man(n.p);
      chu(q[0] + coChu * 0.2, q[1] - coChu * 0.65, n.chu, { 'font-style': 'italic' });
    }
  }
}

// Hình đang trải phẳng (core/trai-phang.js): tô từng mặt, mặt xa vẽ trước để mặt gần che đi (không cần nét khuất).
// khungDiem: các điểm dùng để canh khung, lấy cả lúc khối nguyên và lúc trải hết để hình không co giãn khi trải.
// Mặt có them (core/trai-phang.js traiPhangDayDu): vẽ luôn điểm, đoạn dựng thêm và vết thiết diện nằm trên mặt đó.
// doTrong: độ đậm (0..1) của phần nằm trong lòng khối (mats.trong, mats.trongDiem); lúc mới mở thì 1, mở rộng ra thì mờ dần về 0
export function veTraiPhang(svg, mats, pc, { kieu = 'bai-giang', coChu = 20, khungDiem = null, anPhu = false, doTrong = 0 } = {}) {
  const K = KIEU[kieu];
  const man = canhKhung(svg, khungDiem || mats.flatMap(m => m.p), pc, coChu);
  const sau = m => dot(centroid(m.p), pc.huong);
  const lopMat = nhom(svg), lopTrong = nhom(svg), lopDiem = nhom(svg), lopChu = nhom(svg);
  // Đoạn trong lòng khối: vẽ nét đứt (bị các mặt che), nằm trên các mặt để vẫn thấy được qua lớp tô
  if (doTrong > 0.01) {
    lopTrong.setAttribute('opacity', doTrong.toFixed(3));
    for (const s of mats.trong || []) {
      if (anPhu && s.loai === 'phu') continue;
      const { mau, rong } = kieuDoan(K, s);
      lopTrong.appendChild(duong(man(s.a), man(s.b), { stroke: mau, 'stroke-width': Math.min(K.rongKhuat, rong), 'stroke-dasharray': K.net }));
    }
    for (const d of mats.trongDiem || []) {
      const p = man(d.p);
      lopTrong.appendChild(phanTu('circle', { cx: p[0], cy: p[1], r: K.banKinhDiem, fill: K.diem }));
      const t = phanTu('text', { x: p[0] + coChu * 0.5, y: p[1] - coChu * 0.55, fill: K.chu, 'font-size': coChu, 'font-family': '"Times New Roman", Times, serif', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = d.ten.replace(/'/g, '′');
      lopTrong.appendChild(t);
    }
  }
  const nhan = []; // { p: vị trí trên khung, ten, huong: hướng đặt chữ }
  for (const m of [...mats].sort((a, b) => sau(b) - sau(a))) {
    const q = m.p.map(man);
    lopMat.appendChild(phanTu('polygon', {
      points: q.map(x => x.join(',')).join(' '), fill: K.toTrai[m.loai], 'fill-opacity': 0.88,
      stroke: K.canh, 'stroke-width': K.rong, 'stroke-linejoin': 'round'
    }));
    // Đoạn dựng thêm trên mặt này: vẽ ngay sau mặt để mặt gần hơn (vẽ sau) che được
    for (const s of m.them?.doan || []) {
      if (anPhu && s.loai === 'phu') continue;
      const { mau, rong } = kieuDoan(K, s);
      lopMat.appendChild(duong(man(s.a), man(s.b), { stroke: mau, 'stroke-width': rong, 'stroke-linecap': 'round' }));
    }
    const tam = q.reduce((s, x) => [s[0] + x[0] / q.length, s[1] + x[1] / q.length], [0, 0]);
    const datNhan = (x, ten) => {
      // Các bản sao của cùng một điểm ở gần nhau (lúc mới mở) thì gộp thành một tên
      let v = nhan.find(n => n.ten === ten && Math.hypot(n.p[0] - x[0], n.p[1] - x[1]) < coChu * 0.9);
      if (!v) nhan.push(v = { p: x, ten, huong: [0, 0] });
      const d = Math.hypot(x[0] - tam[0], x[1] - tam[1]) || 1;
      v.huong = [v.huong[0] + (x[0] - tam[0]) / d, v.huong[1] + (x[1] - tam[1]) / d];
    };
    q.forEach((x, i) => datNhan(x, m.ten[i]));
    for (const d of m.them?.diem || []) datNhan(man(d.p), d.ten);
  }
  // Né chữ: tên đặt trước giữ chỗ; tên sau xoay dần khỏi hướng mong muốn tới khi không đè tên khác hay chấm điểm khác
  const daDat = [];
  const kc = coChu * 0.78;
  const vuong = (x, y) => daDat.some(c => Math.abs(c[0] - x) < coChu * 0.8 && Math.abs(c[1] - y) < coChu * 0.85)
    || nhan.some(n => Math.hypot(n.p[0] - x, n.p[1] - y) < coChu * 0.45);
  for (const { p, ten, huong: h } of nhan) {
    // Điểm ở giữa mặt (như tâm đáy) không có hướng ra ngoài: đặt tên chếch lên bên phải
    const g0 = Math.hypot(...h) > 0.05 ? Math.atan2(h[1], h[0]) : Math.atan2(-0.8, 0.6);
    let viTri = null;
    for (const lech of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) {
      for (const xa of [1, 1.45]) {
        const g = g0 + lech * Math.PI / 6;
        const x = p[0] + Math.cos(g) * kc * xa, y = p[1] + Math.sin(g) * kc * xa;
        if (!vuong(x, y)) { viTri = [x, y]; break; }
      }
      if (viTri) break;
    }
    viTri ||= [p[0] + Math.cos(g0) * kc, p[1] + Math.sin(g0) * kc];
    daDat.push(viTri);
    lopDiem.appendChild(phanTu('circle', { cx: p[0], cy: p[1], r: K.banKinhDiem, fill: K.diem }));
    const t = phanTu('text', {
      x: viTri[0], y: viTri[1],
      fill: K.chu, 'font-size': coChu, 'font-family': '"Times New Roman", Times, serif',
      'text-anchor': 'middle', 'dominant-baseline': 'central'
    });
    t.textContent = ten.replace(/'/g, '′');
    lopChu.appendChild(t);
  }
}

// Chọn hướng đặt tên điểm: xa các nét đi qua điểm nhất, ưu tiên hướng ra ngoài hình
function huongNhan(ten, p3, p, hinh, doanHien, man, tam2) {
  const goc = [];
  for (const s of doanHien) {
    const A = hinh.diem[s.a], B = hinh.diem[s.b];
    if (s.a === ten || s.b === ten) {
      const q = man(s.a === ten ? B : A);
      goc.push(Math.atan2(q[1] - p[1], q[0] - p[0]));
    } else if (nam3D(p3, A, B)) {
      const a = man(A), b = man(B);
      goc.push(Math.atan2(a[1] - p[1], a[0] - p[0]), Math.atan2(b[1] - p[1], b[0] - p[0]));
    }
  }
  const ra = Math.atan2(p[1] - tam2[1], p[0] - tam2[0]);
  let tot = null, diemTot = -Infinity;
  for (let i = 0; i < 24; i++) {
    const g = i * Math.PI / 12;
    let gan = Math.PI;
    for (const h of goc) gan = Math.min(gan, lechGoc(g, h));
    const d = gan + 0.6 * Math.cos(lechGoc(g, ra)) + 0.05 * Math.sin(-g); // nhích lên trên khi ngang điểm
    if (d > diemTot) { diemTot = d; tot = g; }
  }
  return [Math.cos(tot), Math.sin(tot)];
}

const lechGoc = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

function nam3D(p, A, B) {
  const l = len(sub(B, A)), da = len(sub(p, A)), db = len(sub(p, B));
  return da > 1e-9 && db > 1e-9 && Math.abs(da + db - l) < 1e-7 * l;
}

function phanTu(ten, attr) {
  const e = document.createElementNS(NS, ten);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  return e;
}
const duong = (a, b, attr) => phanTu('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...attr });
const nhom = svg => svg.appendChild(phanTu('g', {}));
