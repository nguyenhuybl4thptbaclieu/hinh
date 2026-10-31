// Đo trên hình đã dựng: độ dài, góc, khoảng cách, diện tích, thể tích.
// Toạ độ của hình lấy a làm đơn vị (AB = a thì AB dài 1), nên kết quả viết lại được theo a dạng đẹp như trong đề:
// a√14/2, 3a/2, a²√3/4... (nhận dạng r·√n với r là phân số mẫu nhỏ). Góc ghi bằng độ, kèm cos hoặc tan nếu không tròn.
// Lớp lõi, không phụ thuộc giao diện.
//
// Dạng một phép đo (lưu trong so_do của tệp hình):
//   { id, loai: 'do-dai', a, b }                       độ dài AB
//   { id, loai: 'goc-ba-diem', diem: [A, B, C] }       góc ABC (đỉnh B)
//   { id, loai: 'goc-hai-duong', d1, d2 }              d1, d2: hai điểm hoặc tên đường đã vẽ
//   { id, loai: 'goc-duong-mat', d1, mat }             mat: ≥ 3 điểm của mặt phẳng
//   { id, loai: 'goc-hai-mat', mat, mat2 }
//   { id, loai: 'kc-diem-duong', diem, d1 }
//   { id, loai: 'kc-diem-mat', diem, mat }
//   { id, loai: 'kc-hai-duong', d1, d2 }
//   { id, loai: 'dien-tich', mat }                     diện tích đa giác (mat = các đỉnh theo thứ tự) hoặc mat = ['td1'] (thiết diện)
//   { id, loai: 'the-tich', mat }                      mat rỗng: cả khối; 4 điểm: tứ diện
//   { id, loai: 'dien-tich-mat', phan: 'xq' | 'tp' }   diện tích xung quanh / toàn phần của cả khối
// Khối tròn xoay: thể tích, diện tích tính đúng theo công thức (viết theo π), không theo lưới xấp xỉ.

import { sub, dot, cross, len, newell, centroid } from './vec.js';

const DO = 180 / Math.PI;
const SQUAREFREE = [];
for (let n = 1; n <= 300; n++) {
  let ok = true;
  for (let p = 2; p * p <= n; p++) if (n % (p * p) === 0) { ok = false; break; }
  if (ok) SQUAREFREE.push(n);
}

// x ≈ (p/q)·√n với q ≤ 36, n không chính phương ≤ 300 → { p, q, n }; không nhận ra thì null
export function nhanDang(x) {
  if (!Number.isFinite(x) || x <= 0) return null;
  let tot = null;
  for (const n of SQUAREFREE) {
    const r = x / Math.sqrt(n);
    for (let q = 1; q <= 36; q++) {
      const p = Math.round(r * q);
      if (p < 1 || p > 2000) continue;
      if (Math.abs(r - p / q) < 1e-7 * Math.max(1, r)) {
        const g = ucln(p, q);
        const ung = { p: p / g, q: q / g, n };
        // Ưu tiên mẫu nhỏ rồi căn nhỏ (dạng dễ đọc nhất)
        if (!tot || ung.q * 1000 + ung.n < tot.q * 1000 + tot.n) tot = ung;
        break;
      }
    }
  }
  return tot;
}
const ucln = (a, b) => (b ? ucln(b, a % b) : a);

const soVN = (x, so = 3) => (+x.toFixed(so)).toLocaleString('vi-VN', { maximumFractionDigits: so });

// Viết x theo đơn vị a mũ k (k = 1 độ dài, 2 diện tích, 3 thể tích): "a√14/2", "3a²/4", "a³√3/12"
// coPi: x là bội của π (khối tròn xoay): "πa³/3", "4πa³/3", "πa²√2"
export function vietTheoA(x, k = 1, coPi = false) {
  const donVi = k === 1 ? 'a' : k === 2 ? 'a²' : 'a³';
  if (Math.abs(x) < 1e-12) return '0';
  const r = nhanDang(coPi ? x / Math.PI : x);
  const gan = `${soVN(x)}${donVi}`;
  if (!r) return '≈ ' + gan;
  const can = r.n === 1 ? '' : `√${r.n}`;
  const tu = `${r.p === 1 ? '' : r.p}${coPi ? 'π' : ''}${donVi}${can}`;
  if (coPi) return `${r.q === 1 ? tu : `${tu}/${r.q}`} ≈ ${gan}`;
  const dep = r.q === 1 ? tu : `${tu}/${r.q}`;
  return r.q === 1 && r.n === 1 ? dep : `${dep} ≈ ${gan}`;
}

// Số không đơn vị (cos, tan...): "√6/3", "1/2"
export function vietSo(x) {
  if (Math.abs(x) < 1e-12) return '0';
  const am = x < 0 ? '−' : '';
  const r = nhanDang(Math.abs(x));
  if (!r) return am + soVN(Math.abs(x), 4);
  const tu = r.n === 1 ? String(r.p) : `${r.p === 1 ? '' : r.p}√${r.n}`;
  return am + (r.q === 1 ? tu : `${tu}/${r.q}`);
}

// Góc (radian) → "60°" hoặc "≈ 35,26° (cos = √6/3)"
export function vietGoc(t) {
  const d = t * DO;
  if (Math.abs(d - Math.round(d)) < 1e-6) return `${Math.round(d)}°`;
  const cos = Math.cos(t), tan = Math.tan(t);
  const kem = nhanDang(Math.abs(cos)) ? `cos = ${vietSo(cos)}` : nhanDang(Math.abs(tan)) && d < 89.999 ? `tan = ${vietSo(tan)}` : '';
  return `≈ ${soVN(d, 2)}°${kem ? ` (${kem})` : ''}`;
}

// ---------- Hình học ----------

const gocVectoNhon = (u, v) => Math.acos(Math.min(1, Math.abs(dot(u, v)) / (len(u) * len(v))));

function phapTuyen(ps) {
  const n = newell(ps);
  if (len(n) < 0.5) throw new Error('Các điểm của mặt phẳng thẳng hàng');
  return n;
}

// Diện tích đa giác phẳng (đỉnh theo thứ tự)
export function dienTichDaGiac(ps) {
  const s = [0, 0, 0];
  for (let i = 0; i < ps.length; i++) {
    const c = cross(ps[i], ps[(i + 1) % ps.length]);
    s[0] += c[0]; s[1] += c[1]; s[2] += c[2];
  }
  return len(s) / 2;
}

// Thể tích khối lồi (mặt là đa giác): chia thành các chóp từ một điểm trong khối
export function theTichKhoi(diem, mat) {
  const O = centroid(Object.values(diem));
  let v = 0;
  for (const f of mat) {
    const ps = f.map(t => diem[t]);
    v += dienTichDaGiac(ps) * Math.abs(dot(sub(ps[0], O), newell(ps))) / 3;
  }
  return v;
}

// Khối tròn xoay: bán kính r, chiều cao h, đường sinh l (tính đúng theo công thức, không theo lưới xấp xỉ)
function khoiTron(hinh) {
  if (!['non', 'tru', 'cau'].includes(hinh.loai)) return null;
  const r = hinh.thamSo.r, h = hinh.thamSo.cao || 0;
  return { r, h, l: Math.hypot(r, h) };
}

// ---------- Đo ----------

// hinh: hình đã dựng (apDung). Trả về { giaTri (số), chu (chuỗi đẹp), loai: 'do-dai' | 'goc' | 'dien-tich' | 'the-tich' }
export function do_(hinh, m) {
  const P = t => { const p = hinh.diem[t]; if (!p) throw new Error(`Chưa có điểm ${String(t).replace(/'/g, '′')}`); return p; };
  const duong = ds => {
    if (ds?.length === 1) { const d = hinh.duongTen?.[ds[0]]; if (!d) throw new Error(`Chưa có đường thẳng ${ds[0]}`); ds = d; }
    if (ds?.length !== 2) throw new Error('Đường thẳng cần 2 điểm');
    const A = P(ds[0]), u = sub(P(ds[1]), A);
    if (len(u) < 1e-9) throw new Error('Hai điểm của đường thẳng trùng nhau');
    return { A, u };
  };
  const matPhang = ds => {
    if (!Array.isArray(ds) || ds.length < 3) throw new Error('Mặt phẳng cần ít nhất 3 điểm');
    const ps = ds.map(P);
    return { A: ps[0], n: phapTuyen(ps) };
  };
  const goc = t => ({ giaTri: t * DO, chu: vietGoc(t), loai: 'goc' });
  const dai = x => ({ giaTri: x, chu: vietTheoA(x, 1), loai: 'do-dai' });

  switch (m.loai) {
    case 'do-dai': return dai(len(sub(P(m.b), P(m.a))));
    case 'goc-ba-diem': {
      const [A, B, C] = (m.diem || []).map(P);
      if (!C) throw new Error('Góc cần 3 điểm, ví dụ SAC (đỉnh ở giữa)');
      const u = sub(A, B), v = sub(C, B);
      if (len(u) < 1e-9 || len(v) < 1e-9) throw new Error('Đỉnh góc trùng với một điểm khác');
      return goc(Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))));
    }
    case 'goc-hai-duong': return goc(gocVectoNhon(duong(m.d1).u, duong(m.d2).u));
    case 'goc-duong-mat': {
      const { u } = duong(m.d1), { n } = matPhang(m.mat);
      return goc(Math.PI / 2 - gocVectoNhon(u, n));
    }
    case 'goc-hai-mat': return goc(gocVectoNhon(matPhang(m.mat).n, matPhang(m.mat2).n));
    case 'kc-diem-duong': {
      const M = P(m.diem), { A, u } = duong(m.d1);
      return dai(len(cross(sub(M, A), u)) / len(u));
    }
    case 'kc-diem-mat': {
      const M = P(m.diem), { A, n } = matPhang(m.mat);
      return dai(Math.abs(dot(sub(M, A), n)));
    }
    case 'kc-hai-duong': {
      const d1 = duong(m.d1), d2 = duong(m.d2), w = cross(d1.u, d2.u);
      // Song song: khoảng cách từ một điểm của đường này tới đường kia
      if (len(w) < 1e-9 * len(d1.u) * len(d2.u)) return dai(len(cross(sub(d2.A, d1.A), d1.u)) / len(d1.u));
      const k = Math.abs(dot(sub(d2.A, d1.A), w)) / len(w);
      if (k < 1e-9) throw new Error('Hai đường thẳng cắt nhau (khoảng cách bằng 0)');
      return dai(k);
    }
    case 'dien-tich': {
      const dg = m.mat?.length === 1 ? hinh.daGiac?.find(d => d.id === m.mat[0]) : null;
      const ten = dg ? dg.diem : m.mat;
      if (!Array.isArray(ten) || ten.length < 3) throw new Error('Diện tích cần một đa giác (ít nhất 3 đỉnh) hoặc một thiết diện');
      const ps = ten.map(P);
      const n = phapTuyen(ps);
      if (ps.some(p => Math.abs(dot(sub(p, ps[0]), n)) > 1e-7 * (1 + hinh.banKinh))) throw new Error('Các đỉnh không cùng nằm trên một mặt phẳng');
      const x = dienTichDaGiac(ps);
      return { giaTri: x, chu: vietTheoA(x, 2), loai: 'dien-tich' };
    }
    case 'dien-tich-mat': {
      // Diện tích xung quanh (xq) hoặc toàn phần (tp) của cả khối
      const tron = khoiTron(hinh);
      if (tron) {
        const { r, h, l } = tron;
        const x = hinh.loai === 'cau' ? 4 * Math.PI * r * r
          : hinh.loai === 'non' ? Math.PI * r * (l + (m.phan === 'tp' ? r : 0))
          : 2 * Math.PI * r * (h + (m.phan === 'tp' ? r : 0));
        return { giaTri: x, chu: vietTheoA(x, 2, true), loai: 'dien-tich' };
      }
      const soDay = hinh.loai === 'lang-tru' ? 2 : 1;
      const x = hinh.mat.slice(m.phan === 'tp' ? 0 : soDay).reduce((t, f) => t + dienTichDaGiac(f.map(P)), 0);
      return { giaTri: x, chu: vietTheoA(x, 2), loai: 'dien-tich' };
    }
    case 'the-tich': {
      let x;
      const tron = !m.mat?.length && khoiTron(hinh);
      if (tron) {
        const { r, h } = tron;
        x = hinh.loai === 'cau' ? 4 / 3 * Math.PI * r ** 3 : hinh.loai === 'non' ? Math.PI * r * r * h / 3 : Math.PI * r * r * h;
        return { giaTri: x, chu: vietTheoA(x, 3, true), loai: 'the-tich' };
      }
      if (!m.mat?.length) x = theTichKhoi(hinh.diem, hinh.mat);
      else if (m.mat.length === 4) {
        const [A, B, C, D] = m.mat.map(P);
        x = Math.abs(dot(sub(B, A), cross(sub(C, A), sub(D, A)))) / 6;
      } else throw new Error('Thể tích: để trống (cả khối) hoặc 4 điểm (tứ diện)');
      return { giaTri: x, chu: vietTheoA(x, 3), loai: 'the-tich' };
    }
  }
  throw new Error('Không biết phép đo: ' + m.loai);
}

// ---------- Hình vẽ của phép đo ----------
// Những gì vẽ thêm lên hình để thấy phép đo (toạ độ 3D, bộ vẽ tự chiếu và xét nét khuất):
//   doan:  [{ a, b, loai: 'chinh' | 'de' | 'phu' }]   đoạn khoảng cách (chính), đường đề cho mà hình chưa có (đề),
//          đường phụ dựng ra góc (phụ, nét đứt nhạt)
//   cung:  [{ O, u, v, chu }]                   cung đánh dấu góc tại O giữa hai hướng u, v, kèm chữ số đo
//   vuong: [{ O, u, v }]                        dấu góc vuông tại O
//   nhan:  [{ p, chu }]                         chữ ghi giá trị (độ dài) đặt cạnh điểm p
//   diem:  [p]                                  chân đường vuông góc (chấm nhỏ, không tên)
// Diện tích, thể tích không có hình vẽ riêng (trả về các mảng rỗng).
export function hinhVeDo(hinh, m) {
  const ra = { doan: [], cung: [], vuong: [], nhan: [], diem: [] };
  const P = t => hinh.diem[t];
  const coDoan = (a, b) => hinh.doan.some(s => (s.a === a && s.b === b) || (s.a === b && s.b === a));
  const duong = ds => {
    const d = ds?.length === 1 ? hinh.duongTen?.[ds[0]] : ds;
    // Đường đề hỏi mà chưa có trên hình (như A′B, B′C của lập phương): vẽ thêm bằng nét phụ
    if (!coDoan(d[0], d[1])) ra.doan.push({ a: P(d[0]), b: P(d[1]), loai: 'de' });
    return { A: P(d[0]), B: P(d[1]), u: sub(P(d[1]), P(d[0])) };
  };
  const matPhang = ds => { const ps = ds.map(P); return { A: ps[0], n: newell(ps), ps }; };
  const cong = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];
  const chieuLenDuong = (M, d) => cong(d.A, d.u, dot(sub(M, d.A), d.u) / dot(d.u, d.u));
  const chieuLenMat = (M, mp) => cong(M, mp.n, -dot(sub(M, mp.A), mp.n));
  const giaTriNgan = x => vietTheoA(x).split(' ≈ ')[0].replace(/^≈ /, '≈ ');
  // Chân H nằm ngoài đoạn AB của đường: vẽ thêm phần kéo dài tới H
  const keoDai = (d, H) => {
    const t = dot(sub(H, d.A), d.u) / dot(d.u, d.u);
    if (t < -1e-9) ra.doan.push({ a: d.A, b: H, loai: 'phu' });
    else if (t > 1 + 1e-9) ra.doan.push({ a: d.B, b: H, loai: 'phu' });
  };
  const doanKC = (X, Y) => {
    ra.doan.push({ a: X, b: Y, loai: 'chinh' });
    ra.nhan.push({ p: cong(X, sub(Y, X), 0.5), chu: giaTriNgan(len(sub(Y, X))) });
  };
  const gocChu = t => { const d = t * DO; return Math.abs(d - Math.round(d)) < 1e-6 ? `${Math.round(d)}°` : `${soVN(d, 1)}°`; };

  switch (m.loai) {
    case 'do-dai': doanKC(P(m.a), P(m.b)); break;
    case 'kc-diem-duong': {
      const M = P(m.diem), d = duong(m.d1), H = chieuLenDuong(M, d);
      doanKC(M, H);
      keoDai(d, H);
      ra.diem.push(H);
      ra.vuong.push({ O: H, u: sub(M, H), v: len(sub(d.A, H)) > 1e-9 ? sub(d.A, H) : sub(d.B, H) });
      break;
    }
    case 'kc-diem-mat': {
      const M = P(m.diem), mp = matPhang(m.mat), H = chieuLenMat(M, mp);
      doanKC(M, H);
      ra.diem.push(H);
      // Nối H với một điểm của mặt (để thấy H nằm trong mặt) và đánh dấu góc vuông
      const K = mp.ps.reduce((x, y) => (len(sub(y, H)) > len(sub(x, H)) ? y : x));
      if (len(sub(K, H)) > 1e-9) { ra.doan.push({ a: H, b: K, loai: 'phu' }); ra.vuong.push({ O: H, u: sub(M, H), v: sub(K, H) }); }
      break;
    }
    case 'kc-hai-duong': {
      const d1 = duong(m.d1), d2 = duong(m.d2), w = cross(d1.u, d2.u);
      let X, Y;
      if (len(w) < 1e-9 * len(d1.u) * len(d2.u)) { X = d2.A; Y = chieuLenDuong(d2.A, d1); }
      else {
        // Đoạn vuông góc chung XY: X trên d1, Y trên d2
        const r = sub(d1.A, d2.A), a = dot(d1.u, d1.u), b = dot(d1.u, d2.u), c = dot(d2.u, d2.u), d = dot(d1.u, r), e = dot(d2.u, r);
        const D = a * c - b * b, s = (b * e - c * d) / D, t = (a * e - b * d) / D;
        X = cong(d1.A, d1.u, s); Y = cong(d2.A, d2.u, t);
      }
      doanKC(X, Y);
      keoDai(d1, X); keoDai(d2, Y);
      ra.diem.push(X, Y);
      ra.vuong.push({ O: X, u: sub(Y, X), v: d1.u }, { O: Y, u: sub(X, Y), v: d2.u });
      break;
    }
    case 'goc-ba-diem': {
      const [A, B, C] = m.diem.map(P);
      ra.cung.push({ O: B, u: sub(A, B), v: sub(C, B), chu: gocChu(Math.acos(Math.max(-1, Math.min(1, dot(sub(A, B), sub(C, B)) / (len(sub(A, B)) * len(sub(C, B)))))) ) });
      break;
    }
    case 'goc-hai-duong': {
      const d1 = duong(m.d1), d2 = duong(m.d2);
      let O, u = d1.u, v = d2.u;
      const w = cross(u, v);
      if (len(w) < 1e-9 * len(u) * len(v)) break; // song song: góc 0
      const r = sub(d1.A, d2.A), a = dot(u, u), b = dot(u, v), c = dot(v, v), dd = dot(u, r), e = dot(v, r);
      const D = a * c - b * b, s = (b * e - c * dd) / D, t = (a * e - b * dd) / D;
      const X = cong(d1.A, u, s), Y = cong(d2.A, v, t);
      if (len(sub(X, Y)) < 1e-7 * (1 + hinh.banKinh)) { O = X; keoDai(d1, X); keoDai(d2, X); }
      else {
        // Chéo nhau: qua một điểm của d1 kẻ đường song song d2 (nét phụ) rồi đo góc ở đó
        O = d1.A;
        ra.doan.push({ a: O, b: cong(O, v, 1), loai: 'phu' });
      }
      if (dot(u, v) < 0) v = v.map(x => -x); // góc nhọn
      ra.cung.push({ O, u, v, chu: gocChu(Math.acos(Math.min(1, Math.abs(dot(u, v)) / (len(u) * len(v))))) });
      break;
    }
    case 'goc-duong-mat': {
      const d = duong(m.d1), mp = matPhang(m.mat);
      const k = dot(d.u, mp.n);
      if (Math.abs(k) < 1e-12) break; // song song mặt: góc 0
      // O = giao điểm của đường với mặt; H = hình chiếu của đầu xa O lên mặt
      const O = cong(d.A, d.u, -dot(sub(d.A, mp.A), mp.n) / k);
      const M = len(sub(d.A, O)) > len(sub(d.B, O)) ? d.A : d.B;
      const H = chieuLenMat(M, mp);
      keoDai(d, O);
      ra.diem.push(O, H);
      if (len(sub(H, O)) < 1e-9) { ra.vuong.push({ O, u: sub(M, O), v: sub(mp.ps[0], O) }); break; } // vuông góc mặt
      ra.doan.push({ a: M, b: H, loai: 'phu' }, { a: O, b: H, loai: 'phu' });
      ra.vuong.push({ O: H, u: sub(M, H), v: sub(O, H) });
      ra.cung.push({ O, u: sub(M, O), v: sub(H, O), chu: gocChu(Math.acos(Math.min(1, dot(sub(M, O), sub(H, O)) / (len(sub(M, O)) * len(sub(H, O)))))) });
      break;
    }
    case 'goc-hai-mat': {
      const p1 = matPhang(m.mat), p2 = matPhang(m.mat2), l = cross(p1.n, p2.n);
      if (len(l) < 1e-9) break; // song song: góc 0
      const L = scaleV(l, 1 / len(l));
      // Một điểm X trên giao tuyến, gần chỗ hai mặt gặp nhau trên hình: chiếu tâm hai mặt lên giao tuyến
      const G = centroid([...p1.ps, ...p2.ps]);
      const X0 = diemChung(p1, p2, L);
      const X = cong(X0, L, dot(sub(G, X0), L));
      // Trong mỗi mặt, hướng vuông góc giao tuyến, quay về phía phần mặt có điểm của đề
      const huong = p => { let w = cross(p.n, L); const g = centroid(p.ps); if (dot(sub(g, X), w) < 0) w = scaleV(w, -1); return w; };
      const w1 = huong(p1), w2 = huong(p2), s = 0.45 * hinh.banKinh;
      const doDai = s * 0.9;
      ra.doan.push({ a: cong(X, L, -doDai), b: cong(X, L, doDai), loai: 'phu' });
      ra.doan.push({ a: X, b: cong(X, w1, s), loai: 'phu' }, { a: X, b: cong(X, w2, s), loai: 'phu' });
      ra.vuong.push({ O: X, u: w1, v: L }, { O: X, u: w2, v: L });
      let t = Math.acos(Math.max(-1, Math.min(1, dot(w1, w2))));
      ra.cung.push({ O: X, u: w1, v: w2, chu: gocChu(t > Math.PI / 2 ? Math.PI - t : t) });
      break;
    }
  }
  return ra;
}

const scaleV = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
// Một điểm chung của hai mặt phẳng (giao tuyến hướng L)
function diemChung(p1, p2, L) {
  const d1 = dot(p1.n, p1.A), d2 = dot(p2.n, p2.A);
  // X = (d1 (n2 × L) + d2 (L × n1)) / (L · (n1 × n2)), L = n1 × n2 (đã chuẩn hoá)
  const den = dot(L, cross(p1.n, p2.n));
  const a = cross(p2.n, L), b = cross(L, p1.n);
  return [0, 1, 2].map(i => (d1 * a[i] + d2 * b[i]) / den);
}

// Tên phép đo kiểu SGK: "d(A, (SCD))", "(SC, (ABCD))", "V(S.ABCD)"...
export function tenDo(m, hinh) {
  const n = t => String(t).replace(/'/g, '′');
  const nn = ds => (ds || []).map(n).join('');
  const mp = ds => `(${nn(ds)})`;
  switch (m.loai) {
    case 'do-dai': return nn([m.a, m.b]);
    case 'goc-ba-diem': return `Góc ${nn(m.diem)}`;
    case 'goc-hai-duong': return `Góc (${nn(m.d1)}, ${nn(m.d2)})`;
    case 'goc-duong-mat': return `Góc (${nn(m.d1)}, ${mp(m.mat)})`;
    case 'goc-hai-mat': return `Góc (${mp(m.mat)}, ${mp(m.mat2)})`;
    case 'kc-diem-duong': return `d(${n(m.diem)}, ${nn(m.d1)})`;
    case 'kc-diem-mat': return `d(${n(m.diem)}, ${mp(m.mat)})`;
    case 'kc-hai-duong': return `d(${nn(m.d1)}, ${nn(m.d2)})`;
    case 'dien-tich': {
      const dg = m.mat?.length === 1 ? hinh?.daGiac?.find(d => d.id === m.mat[0]) : null;
      return `Diện tích ${dg ? 'thiết diện ' + nn(dg.diem) : nn(m.mat)}`;
    }
    case 'dien-tich-mat': {
      const ten = { non: ' hình nón', tru: ' hình trụ', cau: ' mặt cầu' }[hinh?.loai] || '';
      return hinh?.loai === 'cau' ? 'Diện tích mặt cầu' : `Diện tích ${m.phan === 'tp' ? 'toàn phần' : 'xung quanh'}${ten}`;
    }
    case 'the-tich': {
      if (m.mat?.length) return `V(${nn(m.mat)})`;
      if (!hinh) return 'Thể tích khối';
      if (['non', 'tru', 'cau'].includes(hinh.loai)) return { non: 'Thể tích khối nón', tru: 'Thể tích khối trụ', cau: 'Thể tích khối cầu' }[hinh.loai];
      const day = nn(hinh.mat[0]);
      return hinh.loai === 'chop' ? `V(${n(hinh.thamSo?.ten_dinh || 'S')}.${day})` : `V(${day}.${nn(hinh.mat[1])})`;
    }
  }
  return m.loai;
}

// Các tên điểm mà phép đo dùng tới (để biết xoá điểm thì phép đo nào hỏng)
export function tenDoDungToi(m) {
  return [m.a, m.b, m.diem, m.d1, m.d2, m.mat, m.mat2].flat().filter(t => typeof t === 'string');
}
