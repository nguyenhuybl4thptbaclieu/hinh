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
export function vietTheoA(x, k = 1) {
  const donVi = k === 1 ? 'a' : k === 2 ? 'a²' : 'a³';
  if (Math.abs(x) < 1e-12) return '0';
  const r = nhanDang(x);
  const gan = `${soVN(x)}${donVi}`;
  if (!r) return '≈ ' + gan;
  const can = r.n === 1 ? '' : `√${r.n}`;
  const tu = `${r.p === 1 ? '' : r.p}${donVi}${can}`;
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
    case 'the-tich': {
      let x;
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
    case 'the-tich': {
      if (m.mat?.length) return `V(${nn(m.mat)})`;
      if (!hinh) return 'Thể tích khối';
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
