// Trải phẳng khối (hình khai triển): mở dần các mặt bên quanh cạnh đáy cho tới khi nằm trên mặt phẳng đáy.
// Chóp: mặt bên quay quanh cạnh đáy. Lăng trụ, hình hộp: mặt bên quay quanh cạnh đáy,
// đáy trên gắn vào mặt bên thứ nhất (quay quanh cạnh trên của mặt đó rồi đi theo mặt đó).
// Lớp lõi, không phụ thuộc giao diện.

import { add, centroid, cross, dot, newell, norm, scale, sub } from './vec.js';

// Xoay điểm p quanh trục qua A, hướng u (đơn vị), một góc t (Rodrigues)
function xoay(p, A, u, t) {
  const v = sub(p, A), c = Math.cos(t), s = Math.sin(t);
  return add(A, add(add(scale(v, c), scale(cross(u, v), s)), scale(u, dot(u, v) * (1 - c))));
}

const vuongGoc = (v, u) => sub(v, scale(u, dot(v, u)));

// Góc cần quay mặt (tâm G) quanh trục A-u để nó nằm cùng mặt phẳng với mặt tựa (tâm T), ở phía bên kia trục
function gocMo(A, u, G, T) {
  const w = norm(vuongGoc(sub(G, A), u));
  const dich = norm(scale(vuongGoc(sub(T, A), u), -1));
  return Math.atan2(dot(u, cross(w, dich)), dot(w, dich));
}

// Các bản lề, tính một lần cho mỗi hình (không đổi theo mức trải)
export function lapBanLe(hinh) {
  const D = hinh.diem, mat = hinh.mat;
  const day = mat[0];
  const Tday = centroid(day.map(t => D[t]));
  const laLangTru = hinh.loai === 'lang-tru';
  const ben = mat.slice(laLangTru ? 2 : 1);
  const banLe = ben.map(m => {
    const A = D[m[0]], u = norm(sub(D[m[1]], A));
    return { mat: m, A, u, goc: gocMo(A, u, centroid(m.map(t => D[t])), Tday) };
  });
  let tren = null;
  if (laLangTru) {
    // Mặt bên thứ nhất là [A, B, B′, A′]: đáy trên quay quanh cạnh A′B′
    const m0 = ben[0];
    const A = D[m0[3]], u = norm(sub(D[m0[2]], A));
    tren = { mat: mat[1], A, u, goc: gocMo(A, u, centroid(mat[1].map(t => D[t])), centroid(m0.map(t => D[t]))) };
  }
  return { day, banLe, tren };
}

// muc: 0 = khối nguyên, 1 = trải phẳng hết. Trả về các mặt:
// { ten: [tên đỉnh], p: [toạ độ], loai: 'day' | 'ben' | 'tren', bien: phép dời mặt đó (điểm gốc → điểm sau khi trải) }
export function traiPhang(hinh, muc, bl = lapBanLe(hinh)) {
  const D = hinh.diem;
  const mats = [{ ten: bl.day, p: bl.day.map(t => D[t]), loai: 'day', bien: p => p }];
  bl.banLe.forEach((b, i) => {
    const quay = p => xoay(p, b.A, b.u, b.goc * muc);
    mats.push({ ten: b.mat, p: b.mat.map(t => quay(D[t])), loai: 'ben', bien: quay });
    if (i === 0 && bl.tren) {
      const t = bl.tren;
      const bien = p => quay(xoay(p, t.A, t.u, t.goc * muc));
      mats.push({ ten: t.mat, p: t.mat.map(x => bien(D[x])), loai: 'tren', bien });
    }
  });
  return mats;
}

// Điểm p nằm trên mặt (đa giác lồi phẳng p0..pn, pháp tuyến n), kể cả trên cạnh
function trenMat(p, f, eps) {
  if (Math.abs(dot(sub(p, f.p[0]), f.n)) > eps) return false;
  return f.p.every((a, i) => dot(cross(sub(f.p[(i + 1) % f.p.length], a), sub(p, a)), f.n) >= -eps);
}

// Phần của đường thẳng P + t·u nằm trong mặt (đa giác lồi), dạng [t0, t1]; null nếu không cắt
function catTrongMat(P, u, f) {
  let t0 = -Infinity, t1 = Infinity;
  for (let i = 0; i < f.p.length; i++) {
    const a = f.p[i], c = cross(sub(f.p[(i + 1) % f.p.length], a), f.n);
    // điểm ở phía trong cạnh a→b khi dot(c, X − a) ≤ 0 (c chỉ ra ngoài)
    const g0 = dot(c, sub(P, a)), g1 = dot(c, u);
    if (Math.abs(g1) < 1e-15) { if (g0 > 1e-12) return null; continue; }
    const t = -g0 / g1;
    if (g1 > 0) t1 = Math.min(t1, t); else t0 = Math.max(t0, t);
  }
  return t1 - t0 > 1e-9 ? [t0, t1] : null;
}

// Trải phẳng kèm các phần dựng thêm (điểm, đoạn, đường thẳng, cạnh thiết diện): phần nào nằm trên mặt nào thì đi theo mặt đó.
// Điểm trên cạnh chung của hai mặt hiện ở cả hai mặt (như khi cắt hình khai triển thật).
// Đường thẳng nằm trên một mặt: vẽ phần nằm trong mặt đó (từ mép này sang mép kia).
// Thiết diện để lại vết là các cạnh của nó trên từng mặt.
// Mỗi mặt có thêm them: { diem: [{ ten, p }], doan: [{ a, b, loai }] }.
// Đoạn, đường thẳng nằm trong lòng khối (đường chéo AC′, đường cao SO) không thuộc mặt nào: trả riêng ở mats.trong
// (mỗi đầu đi theo một mặt chứa nó, đầu ở trong lòng khối thì đứng yên) để vẽ mờ dần lúc mới mở.
export function traiPhangDayDu(hinh, muc, bl = lapBanLe(hinh)) {
  const D = hinh.diem;
  const eps = 1e-7 * (1 + (hinh.banKinh || 1));
  const mats = traiPhang(hinh, muc, bl);
  const goc = mats.map(m => { const p = m.ten.map(t => D[t]); return { p, n: newell(p) }; });
  const dinhKhoi = new Set(mats.flatMap(m => m.ten));
  const tren = {};
  for (const t of Object.keys(D)) tren[t] = goc.flatMap((f, i) => (trenMat(D[t], f, eps) ? [i] : []));
  for (const m of mats) m.them = { diem: [], doan: [] };
  mats.trongDiem = []; // điểm trong lòng khối (tâm hình hộp...): đứng yên, vẽ mờ dần như đoạn trong lòng khối
  for (const t of Object.keys(D)) {
    if (dinhKhoi.has(t) || hinh.diemAn?.has(t)) continue;
    for (const i of tren[t]) mats[i].them.diem.push({ ten: t, p: mats[i].bien(D[t]) });
    if (!tren[t].length) mats.trongDiem.push({ ten: t, p: D[t] });
  }
  mats.trong = [];
  for (const s of hinh.doan || []) {
    const td = s.loai === 'thiet-dien' || s.thietDien;
    if (s.loai === 'canh' && !td && !s.duong) continue; // cạnh khối đã là cạnh của mặt
    const loai = td ? 'thiet-dien' : s.loai === 'canh' ? 'noi' : s.loai;
    // Đoạn: hai đầu cùng nằm trong một mặt. Đường thẳng: hai điểm cùng nằm trên mặt phẳng chứa mặt
    // (điểm xác định đường có thể ở ngoài mép mặt, như điểm ẩn của đường song song), rồi cắt theo mép mặt.
    const trenMp = (t, f) => Math.abs(dot(sub(D[t], f.p[0]), f.n)) <= eps;
    const chung = s.duong
      ? goc.flatMap((f, i) => (trenMp(s.a, f) && trenMp(s.b, f) ? [i] : []))
      : (tren[s.a] || []).filter(i => (tren[s.b] || []).includes(i));
    for (const i of chung) {
      if (s.duong) {
        // Đường thẳng: phần nằm trong mặt; trùng cạnh khối thì cạnh đã vẽ rồi
        if (s.loai === 'canh' && !td) continue;
        const P = D[s.a], u = sub(D[s.b], P), k = catTrongMat(P, u, goc[i]);
        if (k) mats[i].them.doan.push({ a: mats[i].bien(add(P, scale(u, k[0]))), b: mats[i].bien(add(P, scale(u, k[1]))), loai });
      } else {
        mats[i].them.doan.push({ a: mats[i].bien(D[s.a]), b: mats[i].bien(D[s.b]), loai });
      }
    }
    if (!chung.length) {
      const dau = t => (tren[t]?.length ? mats[tren[t][0]].bien(D[t]) : D[t]);
      mats.trong.push({ a: dau(s.a), b: dau(s.b), loai, ten: s.a + s.b });
    }
  }
  return mats;
}
