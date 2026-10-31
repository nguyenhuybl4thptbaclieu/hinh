// Hình = khối + các đoạn cần vẽ, sẵn sàng để xét nét khuất và vẽ.
// Đây là lớp lõi, không phụ thuộc giao diện.

import { chuanBiMat, chiaDoan } from './net-khuat.js';
import { taoKhoi } from './khoi.js';
import { add, centroid, cross, dot, len, newell, norm, scale, sub } from './vec.js';

export const khoaDoan = (a, b) => [a, b].sort().join('|');

export function taoHinh(loai, thamSo) {
  const khoi = taoKhoi(loai, thamSo);
  const matChe = chuanBiMat(khoi.diem, khoi.mat);
  const doan = new Map();
  khoi.mat.forEach((m, i) => {
    for (let j = 0; j < m.length; j++) {
      const a = m[j], b = m[(j + 1) % m.length], id = khoaDoan(a, b);
      if (!doan.has(id)) doan.set(id, { id, a, b, loai: 'canh', matKe: [] });
      doan.get(id).matKe.push(matChe[i]);
    }
  });
  for (const s of khoi.phu) {
    const id = khoaDoan(s.a, s.b);
    if (!doan.has(id)) doan.set(id, { id, a: s.a, b: s.b, loai: 'phu', matKe: [] });
  }
  // Khối tròn xoay (core/khoi.js): cạnh chia mặt cong chỉ vẽ khi là đường biên (tron) hoặc không bao giờ vẽ (an)
  for (const [a, b] of khoi.tron || []) { const s = doan.get(khoaDoan(a, b)); if (s) s.tron = true; }
  for (const [a, b] of khoi.an || []) { const s = doan.get(khoaDoan(a, b)); if (s) s.an = true; }
  const pts = Object.values(khoi.diem);
  const tam = centroid(pts);
  const banKinh = Math.max(...pts.map(p => len(sub(p, tam))));
  return {
    loai, thamSo, diem: khoi.diem, mat: khoi.mat, matChe, doan: [...doan.values()], tam, banKinh,
    ...(khoi.diemAn ? { diemAn: new Set(khoi.diemAn) } : {}),
    ...(khoi.cau ? { cau: { O: khoi.diem[khoi.cau.tam], r: khoi.cau.r } } : {})
  };
}

// Cạnh chia mặt cong (đường sinh của nón, trụ) là đường biên của hình khi một mặt kề quay về người nhìn, mặt kia quay đi
export const laDuongBien = (s, pc) => s.matKe.length === 2 && Math.sign(dot(s.matKe[0].n, pc.huong)) !== Math.sign(dot(s.matKe[1].n, pc.huong));

// Mặt phẳng chứa đáy, vẽ như SGK: hình bình hành rộng hơn đáy một khoảng `le` (theo cỡ đáy) mỗi phía.
// Cạnh của nó song song trục x và trục y của thế giới nên trông như mặt bàn đặt dưới khối.
export function matPhangDay(hinh, le = 0.5) {
  const p = hinh.mat[0].map(t => hinh.diem[t]);
  const n = newell(p), O = centroid(p);
  let e1 = sub([1, 0, 0], scale(n, n[0]));
  if (len(e1) < 1e-6) e1 = sub([0, 1, 0], scale(n, n[1]));
  e1 = norm(e1);
  const e2 = cross(n, e1);
  const toa = p.map(q => [dot(sub(q, O), e1), dot(sub(q, O), e2)]);
  const x0 = Math.min(...toa.map(t => t[0])), x1 = Math.max(...toa.map(t => t[0]));
  const y0 = Math.min(...toa.map(t => t[1])), y1 = Math.max(...toa.map(t => t[1]));
  const d = le * Math.max(x1 - x0, y1 - y0);
  const diem = (x, y) => add(O, add(scale(e1, x), scale(e2, y)));
  return [diem(x0 - d, y0 - d), diem(x1 + d, y0 - d), diem(x1 + d, y1 + d), diem(x0 - d, y1 + d)];
}

// Hai đầu thật sự vẽ của một đoạn. Đường thẳng (s.duong) kéo dài:
// - ra tới mặt cầu bao quanh khối (bán kính = khối × 1,15 × s.keo, s.keo = 1 vừa, 2 dài, 3 rất dài);
// - phủ mọi điểm của hình nằm trên đường thẳng đó (như giao điểm ở xa ngoài khối), vượt qua điểm xa nhất một khoảng;
// - luôn vượt qua hai điểm đã cho ít nhất 25% bán kính khối.
export function dauMutDoan(hinh, s) {
  const P = hinh.diem[s.a], Q = hinh.diem[s.b];
  if (!s.duong) return [P, Q];
  const u = sub(Q, P), L2 = dot(u, u);
  if (L2 < 1e-24) return [P, Q];
  const L = Math.sqrt(L2);
  const R = 1.15 * hinh.banKinh * (s.keo || 1), w = sub(P, hinh.tam);
  // |P + t·u − tâm|² = R² → t² + 2b t + c = 0
  const b = dot(w, u) / L2, c = (dot(w, w) - R * R) / L2, delta = b * b - c;
  const them = 0.25 * hinh.banKinh / L;
  let t0 = -them, t1 = 1 + them;
  if (delta > 0) { t0 = Math.min(t0, -b - Math.sqrt(delta)); t1 = Math.max(t1, -b + Math.sqrt(delta)); }
  const eps = 1e-7 * (1 + hinh.banKinh);
  for (const X of Object.values(hinh.diem)) {
    const v = sub(X, P), t = dot(v, u) / L2;
    if (len(sub(v, scale(u, t))) > eps) continue; // không nằm trên đường thẳng
    t0 = Math.min(t0, t - them);
    t1 = Math.max(t1, t + them);
  }
  return [add(P, scale(u, t0)), add(P, scale(u, t1))];
}

// Tính các khúc thấy/khuất cho mọi đoạn theo phép chiếu pc
export function tinhNet(hinh, pc) {
  const eps = 1e-7 * hinh.banKinh;
  // Cạnh chia mặt cong không xét: không vẽ, hoặc chỉ vẽ khi là đường biên (đường biên của khối lồi luôn thấy)
  // Khối tròn xoay: ở đỉnh nón rất nhiều mặt nhỏ gặp nhau, dung sai để lại mẩu thấy/khuất cực ngắn; gộp mẩu dưới 4% vào khúc bên cạnh
  const tron = !!hinh.diemAn?.size && ['non', 'tru', 'cau'].includes(hinh.loai);
  return new Map(hinh.doan.filter(s => !s.tron && !s.an).map(s => {
    const [P, Q] = dauMutDoan(hinh, s);
    const k = chiaDoan(P, Q, hinh.matChe, pc, eps);
    return [s.id, tron ? gopKhucNgan(k, 0.04) : k];
  }));
}

function gopKhucNgan(khuc, nguong) {
  if (khuc.length < 2) return khuc;
  const dai = khuc.filter(k => k.t1 - k.t0 >= nguong);
  if (!dai.length) return khuc;
  const r = [];
  for (const k of dai) {
    const cuoi = r[r.length - 1];
    if (cuoi && cuoi.khuat === k.khuat) cuoi.t1 = k.t1;
    else r.push({ ...k, t0: cuoi ? cuoi.t1 : 0 });
  }
  r[r.length - 1].t1 = 1;
  return r;
}
