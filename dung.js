// Các bước dựng thêm trên khối: điểm, đoạn, thiết diện.
// Bước dựng chỉ lưu quan hệ (trung điểm của SA, mặt phẳng qua M, N, P...), toạ độ luôn tính lại từ khối,
// nên đổi số đo thì mọi thứ dựng thêm tự cập nhật.
//
// Dạng các bước (lưu trong buoc_dung của tệp hình):
//   { id: 'M', loai: 'trung-diem', a: 'S', b: 'A' }
//   { id: 'N', loai: 'diem-tren-doan', a: 'B', b: 'C', ti_le: 0.5 }      BN/BC = ti_le
//   { id: 'G', loai: 'trong-tam', diem: ['S', 'A', 'B'] }
//   { id: 'doan:AM', loai: 'doan', a: 'A', b: 'M' }
//   { id: 'duong:A|C', loai: 'duong-thang', a: 'A', b: 'C', ten: 'd', keo: 1 }   đường thẳng qua hai điểm, vẽ kéo dài ra hết khối;
//        ten (d, Δ...) không bắt buộc; keo: độ dài kéo dài (1 vừa, 2 dài, 3 rất dài)
//   { id: 'ss:M|AB', loai: 'duong-song-song', qua: 'M', song_song: ['A', 'B'], ten: 'd', keo: 1 }   qua M kẻ đường thẳng song song AB
//        (song_song cũng có thể là tên một đường thẳng đã vẽ, ví dụ ['d'])
// Ở giao-diem, d1/d2 có thể là tên một đường thẳng đã vẽ (['d']) thay cho hai điểm.
//   { id: 'td1', loai: 'thiet-dien', mp: MẶT_PHẲNG, ten_diem: { 'B|S': 'G' }, to_mau: true }
//   { id: 'O', loai: 'giao-diem', d1: ['A', 'C'], d2: ['B', 'D'] }          giao điểm hai đường thẳng (kéo dài nếu cần)
//   { id: 'H', loai: 'hinh-chieu', diem: 'O', len: ['S', 'I'] }             chân đường vuông góc từ O xuống SI
//   { id: 'K', loai: 'hinh-chieu', diem: 'A', len: ['S', 'C', 'D'] }        hình chiếu của A lên mặt phẳng (SCD)
// Bước nào cũng có thể có ghi_chu: lời giải thích hiện khi trình chiếu từng bước.
// Mặt phẳng:
//   { kieu: 'ba-diem', diem: ['M', 'N', 'P'] }
//   { kieu: 'song-song-mat', diem: 'M', mat: ['S', 'B', 'C'] }
//   { kieu: 'vuong-goc-duong', diem: 'A', duong: ['S', 'C'] }

import { sub, dot, cross, norm, len, lerp, centroid, newell } from './vec.js';
import { khoaDoan } from './hinh.js';

// Tên dành cho giao điểm mới, theo thứ tự quen dùng
const TEN_GIAO = 'EFGHIJKLQRTUVXYZ'.split('');

// "SA" → ['S', 'A'];  "A'B'" → ["A'", "B'"];  "M1N" → ['M1', 'N']
export function tachTen(chuoi) {
  return (String(chuoi).replace(/′/g, "'").toUpperCase().match(/[A-Z][0-9]*'*/g) || []);
}

// "1/3", "0,5", "2" → số
export function docTiSo(chuoi) {
  const s = String(chuoi).trim().replace(',', '.');
  const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s);
  const v = m ? +m[1] / +m[2] : Number(s);
  if (!s || !Number.isFinite(v)) throw new Error('Tỉ số không hợp lệ: ' + chuoi);
  return v;
}

export const laTenHopLe = t => /^[A-Z][0-9]*'*$/.test(t);

// Tên điểm ẩn của đường song song (bắt đầu bằng ~ nên không trùng tên điểm người dùng đặt)
export const tenDiemAn = b => '~' + b.id.replace(/\W/g, '_');

// Khoá đoạn của đường thẳng mà bước b vẽ ra (null nếu b không vẽ đường thẳng)
export const doanCuaDuong = b => b.loai === 'duong-thang' ? khoaDoan(b.a, b.b)
  : b.loai === 'duong-song-song' ? khoaDoan(b.qua, tenDiemAn(b)) : null;

// Các tên điểm mà một bước dùng tới (để biết bước nào phụ thuộc bước nào)
export function tenDungToi(b) {
  if (b.loai === 'trung-diem' || b.loai === 'diem-tren-doan' || b.loai === 'doan' || b.loai === 'duong-thang') return [b.a, b.b];
  if (b.loai === 'trong-tam') return b.diem;
  if (b.loai === 'giao-diem') return [...b.d1, ...b.d2];
  if (b.loai === 'duong-song-song') return [b.qua, ...b.song_song];
  if (b.loai === 'hinh-chieu') return [b.diem, ...b.len];
  if (b.loai === 'thiet-dien') {
    const mp = b.mp;
    return [].concat(mp.diem, mp.mat || [], mp.duong || []);
  }
  return [];
}

export function matPhang(mp, diem) {
  const P = t => { if (!diem[t]) throw new Error(`Chưa có điểm ${t}`); return diem[t]; };
  let n, goc;
  if (mp.kieu === 'ba-diem') {
    if (mp.diem?.length !== 3) throw new Error('Cần đúng 3 điểm');
    const [A, B, C] = mp.diem.map(P);
    n = cross(sub(B, A), sub(C, A));
    if (len(n) < 1e-9 * (1 + len(sub(B, A)) * len(sub(C, A)))) throw new Error('Ba điểm thẳng hàng, không xác định được mặt phẳng');
    goc = A;
  } else if (mp.kieu === 'song-song-mat') {
    const pts = (mp.mat || []).map(P);
    if (pts.length < 3) throw new Error('Mặt cần ít nhất 3 điểm');
    n = newell(pts);
    if (len(n) < 1e-9) throw new Error('Các điểm của mặt thẳng hàng');
    goc = P(mp.diem);
  } else if (mp.kieu === 'vuong-goc-duong') {
    if (mp.duong?.length !== 2) throw new Error('Đường thẳng cần 2 điểm');
    n = sub(P(mp.duong[1]), P(mp.duong[0]));
    if (len(n) < 1e-12) throw new Error('Hai điểm của đường thẳng trùng nhau');
    goc = P(mp.diem);
  } else {
    throw new Error('Không biết cách xác định mặt phẳng: ' + mp.kieu);
  }
  n = norm(n);
  return { n, c: dot(n, goc) };
}

// Cắt khối lồi bởi mặt phẳng: giao điểm với các cạnh (hoặc đỉnh nằm trên mặt phẳng), xếp theo vòng.
// Trả về [{ p, dinh }] (dinh: tên đỉnh nếu giao điểm là đỉnh) hoặc [{ p, canh: {a, b, t} }]
export function catKhoi(hinh, mp) {
  const eps = 1e-9 * (1 + hinh.banKinh);
  const s = p => dot(mp.n, p) - mp.c;
  const giao = [];
  const dinh = [...new Set(hinh.mat.flat())];
  for (const t of dinh) if (Math.abs(s(hinh.diem[t])) <= eps) giao.push({ p: hinh.diem[t], dinh: t });
  for (const d of hinh.doan) {
    if (d.loai !== 'canh') continue;
    const sa = s(hinh.diem[d.a]), sb = s(hinh.diem[d.b]);
    if ((sa < -eps && sb > eps) || (sa > eps && sb < -eps)) {
      const t = sa / (sa - sb);
      giao.push({ p: lerp(hinh.diem[d.a], hinh.diem[d.b], t), canh: { a: d.a, b: d.b, t } });
    }
  }
  if (giao.length < 3) throw new Error('Mặt phẳng không cắt khối (hoặc chỉ chạm ở một đỉnh, một cạnh)');
  // Thiết diện của khối lồi là đa giác lồi: xếp các đỉnh theo góc quanh trọng tâm trong mặt phẳng
  const g = centroid(giao.map(x => x.p));
  const u = norm(sub(giao[0].p, g)), w = cross(mp.n, u);
  return giao
    .map(x => ({ ...x, goc: Math.atan2(dot(sub(x.p, g), w), dot(sub(x.p, g), u)) }))
    .sort((a, b) => a.goc - b.goc);
}

// Áp các bước dựng lên hình gốc. Không ném lỗi: bước lỗi được ghi vào `loi` và bỏ qua.
export function apDung(hinh, buoc = []) {
  const diem = { ...hinh.diem };
  const doan = new Map(hinh.doan.map(d => [d.id, d]));
  const daGiac = [], loi = {}, tenGiao = {};
  const eps = 1e-7 * (1 + hinh.banKinh);
  const P = t => { if (!diem[t]) throw new Error(`Chưa có điểm ${t}`); return diem[t]; };
  const themDiem = (ten, p) => {
    if (!laTenHopLe(ten)) throw new Error(`Tên điểm không hợp lệ: ${ten}`);
    if (diem[ten]) throw new Error(`Đã có điểm ${ten}`);
    diem[ten] = p;
  };
  const themDoan = (a, b, loai) => {
    const id = khoaDoan(a, b);
    const cu = doan.get(id);
    // Cạnh chia mặt cong (đường sinh, lưới mặt cầu) vốn không vẽ: dựng thêm trùng nó thì cho hiện
    const hien = cu?.tron || cu?.an ? { tron: false, an: false, loai: cu.loai === 'canh' ? 'noi' : cu.loai } : {};
    if (cu) { doan.set(id, { ...cu, ...hien, ...(loai === 'thiet-dien' ? { thietDien: true } : {}) }); return; }
    doan.set(id, { id, a, b, loai, matKe: [] });
  };
  const trungDiem = p => Object.keys(diem).find(t => !diemAn.has(t) && len(sub(diem[t], p)) < eps);
  const dauGoc = [...(hinh.dauGoc || [])];
  // Đường thẳng đã vẽ có tên (d, Δ...): tên → [hai điểm xác định nó]
  const duongTen = {};
  // Điểm ẩn: chỉ để xác định đường thẳng (như hướng của đường song song), không vẽ, không ghi tên
  const diemAn = new Set(hinh.diemAn || []);
  // Đường thẳng cho bằng hai điểm hoặc bằng tên một đường đã vẽ
  const docDuong = ds => {
    if (ds?.length === 1) { const d = duongTen[ds[0]]; if (!d) throw new Error(`Chưa có đường thẳng ${ds[0]}`); return d; }
    if (ds?.length !== 2) throw new Error('Đường thẳng cần 2 điểm hoặc tên một đường đã vẽ');
    return ds;
  };
  // Vẽ một đường thẳng qua hai điểm (kéo dài khi vẽ)
  const veDuong = (a, c, ten, keo) => {
    const id = khoaDoan(a, c);
    const cu = doan.get(id) || { id, a, b: c, loai: 'noi', matKe: [] };
    doan.set(id, { ...cu, duong: true, tenDuong: ten || '', keo: keo || 1 });
    if (ten) duongTen[ten] = [a, c];
  };
  // Có đường XY (vẽ đoạn XY nếu chưa có); điểm E nằm ngoài đoạn thì vẽ thêm phần kéo dài tới E
  // (XY đã là đường thẳng kéo dài thì nó tự vươn tới E, không cần vẽ thêm)
  const duongQua = (X, Y, E) => {
    if (doan.get(khoaDoan(X, Y))?.duong) return;
    if (!doan.has(khoaDoan(X, Y))) themDoan(X, Y, 'noi');
    const u = sub(P(Y), P(X)), t = dot(sub(P(E), P(X)), u) / dot(u, u);
    if (t < -1e-9) themDoan(X, E, 'keo-dai');
    else if (t > 1 + 1e-9) themDoan(Y, E, 'keo-dai');
  };

  for (const b of buoc) {
    try {
      if (b.loai === 'trung-diem') themDiem(b.id, lerp(P(b.a), P(b.b), 0.5));
      else if (b.loai === 'diem-tren-doan') themDiem(b.id, lerp(P(b.a), P(b.b), b.ti_le));
      else if (b.loai === 'trong-tam') { if (b.diem.length !== 3) throw new Error('Cần 3 đỉnh'); themDiem(b.id, centroid(b.diem.map(P))); }
      else if (b.loai === 'doan') { P(b.a); P(b.b); if (b.a === b.b) throw new Error('Hai đầu mút trùng nhau'); themDoan(b.a, b.b, 'noi'); }
      else if (b.loai === 'duong-thang') {
        if (b.a === b.b || len(sub(P(b.a), P(b.b))) < eps) throw new Error('Hai điểm trùng nhau, không xác định được đường thẳng');
        // Đoạn đã có (cạnh khối, đoạn nối) thì đánh dấu kéo dài; chưa có thì thêm mới
        veDuong(b.a, b.b, b.ten, b.keo);
      } else if (b.loai === 'duong-song-song') {
        const M = P(b.qua);
        const [X, Y] = docDuong(b.song_song);
        const u = sub(P(Y), P(X));
        if (len(u) < eps) throw new Error('Đường thẳng cho trước không xác định (hai điểm trùng nhau)');
        if (len(cross(sub(M, P(X)), u)) < eps * len(u)) throw new Error(`${b.qua} nằm trên ${b.song_song.join('')}: đường song song trùng với nó`);
        // Điểm ẩn thứ hai cùng hướng XY, cách M một đoạn bằng XY
        const an = tenDiemAn(b);
        diem[an] = M.map((x, i) => x + u[i]);
        diemAn.add(an);
        veDuong(b.qua, an, b.ten, b.keo);
      }
      else if (b.loai === 'giao-diem') {
        const [X, Y] = docDuong(b.d1), [Z, T] = docDuong(b.d2);
        themDiem(b.id, giaoHaiDuong(P(X), P(Y), P(Z), P(T), eps));
        duongQua(X, Y, b.id);
        duongQua(Z, T, b.id);
      } else if (b.loai === 'hinh-chieu') {
        const X = P(b.diem), ds = (b.len || []).map(P);
        let H;
        if (ds.length === 2) {
          const u = norm(sub(ds[1], ds[0]));
          if (len(u) < 0.5) throw new Error('Hai điểm của đường thẳng trùng nhau');
          H = ds[0].map((x, i) => x + u[i] * dot(sub(X, ds[0]), u));
        } else if (ds.length >= 3) {
          const n = newell(ds);
          if (len(n) < 0.5) throw new Error('Các điểm của mặt phẳng thẳng hàng');
          H = X.map((x, i) => x - n[i] * dot(sub(X, ds[0]), n));
        } else throw new Error('Cần một đường thẳng (2 điểm) hoặc một mặt phẳng (3 điểm)');
        if (len(sub(X, H)) < eps) throw new Error(`${b.diem} đã nằm trên ${ds.length === 2 ? 'đường thẳng' : 'mặt phẳng'} đó`);
        themDiem(b.id, H);
        themDoan(b.diem, b.id, 'noi');
        if (ds.length === 2) duongQua(b.len[0], b.len[1], b.id);
        // Dấu góc vuông tại chân: giữa đường vừa kẻ và một điểm của đường/mặt khác chân
        const khac = b.len.find(t => len(sub(diem[t], H)) > eps);
        if (khac) dauGoc.push({ dinh: b.id, a: b.diem, b: khac });
      }
      else if (b.loai === 'thiet-dien') {
        const ds = catKhoi(hinh, matPhang(b.mp, diem));
        // Đặt tên giao điểm: đỉnh của khối, điểm đã có, tên đã lưu, rồi mới đến tên mới
        const daDung = new Set([...Object.keys(diem), ...Object.values(b.ten_diem || {})]);
        const ten = ds.map(x => {
          if (x.dinh) return x.dinh;
          const cu = trungDiem(x.p);
          if (cu) return cu;
          const k = khoaDoan(x.canh.a, x.canh.b);
          let t = b.ten_diem?.[k];
          // Khối tròn xoay: thiết diện cắt qua rất nhiều cạnh của lưới (elip, parabol...): giao điểm không đặt tên
          if (hinh.diemAn?.has(x.canh.a) || hinh.diemAn?.has(x.canh.b)) {
            t = `~${b.id}_${Object.keys(diem).length}`;
            diem[t] = x.p;
            diemAn.add(t);
            return t;
          }
          if (!t || (diem[t] && len(sub(diem[t], x.p)) >= eps)) {
            t = TEN_GIAO.find(c => !daDung.has(c)) || 'X' + Object.keys(diem).length;
            daDung.add(t);
          }
          diem[t] = x.p;
          tenGiao[b.id] = { ...tenGiao[b.id], [k]: t };
          return t;
        });
        const vong = thuTuDoc(ten, [].concat(b.mp.diem));
        for (let i = 0; i < vong.length; i++) themDoan(vong[i], vong[(i + 1) % vong.length], 'thiet-dien');
        daGiac.push({ id: b.id, diem: vong, to_mau: b.to_mau !== false });
      } else {
        throw new Error('Không biết bước: ' + b.loai);
      }
    } catch (e) {
      loi[b.id] = e.message;
    }
  }
  return { ...hinh, diem, doan: [...doan.values()], daGiac, loi, tenGiao, dauGoc, diemAn, duongTen };
}

// Giao điểm hai đường thẳng XY và ZT (phải cùng nằm trong một mặt phẳng và không song song)
export function giaoHaiDuong(X, Y, Z, T, eps = 1e-9) {
  const u = sub(Y, X), v = sub(T, Z), w = sub(Z, X), n = cross(u, v);
  const ln = len(n);
  if (ln < eps * (len(u) * len(v) || 1)) throw new Error('Hai đường thẳng song song hoặc trùng nhau');
  if (Math.abs(dot(w, n)) > 1e-7 * ln * (len(w) || 1)) throw new Error('Hai đường thẳng chéo nhau, không cắt nhau');
  const t = dot(cross(w, v), n) / (ln * ln);
  return X.map((x, i) => x + t * u[i]);
}

// Thứ tự đọc tên đa giác như trong SGK: bắt đầu từ điểm đã cho đầu tiên của mặt phẳng (không có thì tên đứng đầu
// bảng chữ cái), đi theo chiều gặp điểm đã cho kế tiếp sớm hơn; ngang nhau thì về phía tên đứng trước. Ví dụ AHKL, MNPGEF.
function thuTuDoc(vong, daCho) {
  const n = vong.length;
  let i = vong.findIndex(t => t === daCho.find(d => vong.includes(d)));
  if (i < 0) i = vong.indexOf([...vong].sort()[0]);
  const di = xuoi => Array.from({ length: n }, (_, k) => vong[((xuoi ? i + k : i - k) % n + n) % n]);
  const xa = ds => { for (const d of daCho.slice(1)) { const k = ds.indexOf(d); if (k > 0) return k; } return n; };
  const [xuoi, nguoc] = [di(true), di(false)];
  if (xa(xuoi) !== xa(nguoc)) return xa(xuoi) < xa(nguoc) ? xuoi : nguoc;
  return xuoi[1] <= nguoc[1] ? xuoi : nguoc;
}

// Tên cạnh để hiện cho người đọc: đỉnh S viết trước (SB chứ không BS), còn lại theo bảng chữ cái
export function tenCanh(khoa) {
  const [a, b] = khoa.split('|');
  return (b === 'S' ? b + a : a + b).replace(/'/g, '′');
}

// Mô tả ngắn một bước để hiện trong danh sách
export function moTa(b, kq) {
  const n = s => String(s).replace(/'/g, '′');
  const nn = ds => ds.map(n).join('');
  const tiSo = v => { for (const m of [2, 3, 4, 5, 6]) { const t = v * m; if (Math.abs(t - Math.round(t)) < 1e-9) return Math.round(t) + '/' + m; } return String(+v.toFixed(4)); };
  switch (b.loai) {
    case 'trung-diem': return `${n(b.id)} là trung điểm ${nn([b.a, b.b])}`;
    case 'diem-tren-doan': return `${n(b.id)} trên ${nn([b.a, b.b])}, ${nn([b.a, b.id])} = ${tiSo(b.ti_le)} ${nn([b.a, b.b])}`;
    case 'trong-tam': return `${n(b.id)} là trọng tâm tam giác ${nn(b.diem)}`;
    case 'doan': return `Đoạn ${nn([b.a, b.b])}`;
    case 'duong-thang': return `Đường thẳng ${b.ten ? n(b.ten) + ' qua ' : ''}${nn([b.a, b.b])}`;
    case 'duong-song-song': return `Qua ${n(b.qua)} kẻ đường thẳng ${b.ten ? n(b.ten) + ' ' : ''}∥ ${nn(b.song_song)}`;
    case 'giao-diem': return `${n(b.id)} là giao điểm của ${nn(b.d1)} và ${nn(b.d2)}`;
    case 'hinh-chieu': return b.len.length === 2
      ? `Kẻ ${nn([b.diem, b.id])} ⊥ ${nn(b.len)} tại ${n(b.id)}`
      : `${n(b.id)} là hình chiếu của ${n(b.diem)} lên (${nn(b.len)})`;
    case 'thiet-dien': {
      const mp = b.mp;
      const ten = mp.kieu === 'ba-diem' ? `(${nn(mp.diem)})`
        : mp.kieu === 'song-song-mat' ? `qua ${n(mp.diem)}, song song (${nn(mp.mat)})`
        : `qua ${n(mp.diem)}, vuông góc ${nn(mp.duong)}`;
      const dg = kq?.daGiac.find(d => d.id === b.id);
      const TEN_DG = { 3: 'tam giác', 4: 'tứ giác', 5: 'ngũ giác', 6: 'lục giác' };
      // Khối tròn xoay: đỉnh trên mặt cong không có tên (bắt đầu bằng ~)
      const coAn = dg?.diem.some(t => t.startsWith('~'));
      const loaiDg = !dg ? '' : coAn
        ? (dg.diem.length > 8 ? 'đường cong (elip hoặc một phần elip)' : `${TEN_DG[dg.diem.length] || 'đa giác'} có đỉnh trên đường tròn`)
        : (TEN_DG[dg.diem.length] || dg.diem.length + ' cạnh') + ' ' + nn(dg.diem);
      return `Thiết diện ${ten}${loaiDg ? ': ' + loaiDg : ''}`;
    }
  }
  return b.loai;
}
