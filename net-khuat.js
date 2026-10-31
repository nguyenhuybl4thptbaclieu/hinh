// Xét nét thấy / nét khuất cho từng đoạn thẳng.
//
// Cách làm (tổng quát, không chỉ cho khối lồi): với mỗi mặt che, chiếu đoạn và mặt lên mặt phẳng vẽ,
// tìm khoảng [t0, t1] của đoạn rơi hẳn vào trong hình chiếu của mặt; trên khoảng đó so độ sâu.
// Vì đoạn và mặt đều phẳng, hiệu độ sâu biến thiên bậc nhất theo t nên giải đúng, không phải lấy mẫu.
// Hợp các khoảng bị che lại là phần nét khuất.

import { sub, dot, newell, centroid } from './vec.js';

// Mặt che của một khối lồi: pháp tuyến đơn vị hướng ra ngoài khối
export function chuanBiMat(diem, mat) {
  const tam = centroid([...new Set(mat.flat())].map(t => diem[t]));
  return mat.map(ten => {
    const pts = ten.map(t => diem[t]);
    let n = newell(pts);
    if (dot(n, sub(pts[0], tam)) < 0) n = n.map(x => -x);
    return { ten, pts, n, goc: pts[0] };
  });
}

const cross2 = (u, v) => u[0] * v[1] - u[1] * v[0];

// Khoảng tham số của đoạn 2D p→q nằm hẳn bên trong đa giác lồi (cách biên hơn eps), hoặc null
function khoangTrongDaGiac(p, q, poly, eps) {
  let dien = 0;
  for (let i = 0; i < poly.length; i++) dien += cross2(poly[i], poly[(i + 1) % poly.length]);
  if (Math.abs(dien) < eps * eps) return null; // mặt bị nhìn nghiêng thành một đường
  const dau = Math.sign(dien);
  const dq = [q[0] - p[0], q[1] - p[1]];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const e = [b[0] - a[0], b[1] - a[1]];
    const le = Math.hypot(e[0], e[1]);
    if (le < 1e-12) continue;
    // Khoảng cách có dấu từ điểm của đoạn tới cạnh: f(t) = f0 + t·fd, cần f(t) > eps
    const f0 = dau * cross2(e, [p[0] - a[0], p[1] - a[1]]) / le - eps;
    const fd = dau * cross2(e, dq) / le;
    if (Math.abs(fd) < 1e-12) { if (f0 <= 0) return null; continue; }
    const t = -f0 / fd;
    if (fd > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 >= t1) return null;
  }
  return [t0, t1];
}

// Chia đoạn PQ thành các khúc thấy/khuất: [{t0, t1, khuat}]
// eps: dung sai theo đơn vị độ dài của hình (nên tỉ lệ với kích thước hình)
export function chiaDoan(P, Q, matChe, pc, eps = 1e-6) {
  const p = pc.chieu(P), q = pc.chieu(Q), d = pc.huong;
  const bi = [];
  for (const m of matChe) {
    const eP = dot(m.n, sub(P, m.goc)), eQ = dot(m.n, sub(Q, m.goc));
    if (Math.abs(eP) < eps && Math.abs(eQ) < eps) continue; // đoạn nằm trong mặt phẳng của mặt này
    const nd = dot(m.n, d);
    if (Math.abs(nd) < 1e-9) continue;
    const k = khoangTrongDaGiac(p, q, m.pts.map(pc.chieu), eps);
    if (!k) continue;
    // s(t) > 0: điểm của mặt nằm trên tia nhìn và gần người nhìn hơn điểm của đoạn
    const s0 = eP / nd, s1 = eQ / nd, ds = s1 - s0;
    let [t0, t1] = k;
    if (Math.abs(ds) < 1e-12) { if (s0 <= eps) continue; }
    else {
      const t = (eps - s0) / ds;
      if (ds > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (t1 - t0 > 1e-9) bi.push([t0, t1]);
  }
  // Khúc ngắn hơn 0,1% kích thước hình (đo trên hình vẽ, dưới nửa điểm ảnh) thì không nhìn thấy được
  const dai2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
  return ghepKhuc(bi, Math.max(1e-4, dai2 > 0 ? 1e4 * eps / dai2 : 1));
}

function ghepKhuc(bi, khucNgan) {
  bi.sort((u, v) => u[0] - v[0]);
  const hop = [];
  for (const k of bi) {
    const cuoi = hop[hop.length - 1];
    if (cuoi && k[0] <= cuoi[1] + 1e-9) cuoi[1] = Math.max(cuoi[1], k[1]);
    else hop.push(k.slice());
  }
  const khuc = [];
  let t = 0;
  for (const [a, b] of hop) {
    if (a - t > 1e-6) khuc.push({ t0: t, t1: a, khuat: false });
    khuc.push({ t0: Math.max(a, t), t1: b, khuat: true });
    t = b;
  }
  if (1 - t > 1e-6) khuc.push({ t0: t, t1: 1, khuat: false });
  // Khúc quá ngắn (dư ra do dung sai ở đỉnh chung) nhập vào khúc bên cạnh
  const gon = khuc.filter(k => k.t1 - k.t0 > khucNgan);
  if (!gon.length) return [{ t0: 0, t1: 1, khuat: khuc.length > 0 && khuc[0].khuat }];
  const r = [];
  for (const k of gon) {
    const cuoi = r[r.length - 1];
    if (cuoi && cuoi.khuat === k.khuat) cuoi.t1 = k.t1;
    else r.push({ ...k, t0: cuoi ? cuoi.t1 : 0 });
  }
  r[r.length - 1].t1 = 1;
  return r;
}

// Cách xét riêng cho cạnh của khối lồi: thấy nếu có ít nhất một mặt kề quay về phía người nhìn.
// Dùng để đối chiếu với cách tổng quát trong bộ kiểm thử.
export function canhThayKhoiLoi(matKe, pc) {
  return matKe.some(m => dot(m.n, pc.huong) < 0);
}
