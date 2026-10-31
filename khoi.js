// Dựng khối đa diện từ số đo gốc.
// Một khối gồm: diem {tên: [x, y, z]}, mat [[tên đỉnh theo vòng]], phu [{a, b}] (nét phụ như đường cao, đường chéo đáy).

import { centroid, lerp } from './vec.js';

const S3 = Math.sqrt(3);

export const LOAI_DAY = {
  'tam-giac': 'Tam giác',
  'tam-giac-deu': 'Tam giác đều',
  'tam-giac-vuong-B': 'Tam giác vuông tại B',
  'vuong': 'Hình vuông',
  'chu-nhat': 'Hình chữ nhật',
  'binh-hanh': 'Hình bình hành',
  'thang-vuong': 'Hình thang vuông tại A, B',
  'nua-luc-giac': 'Nửa lục giác đều (AD = 2a)',
  // Đáy giải ra từ dữ kiện của đề (core/giai-day.js): toạ độ lưu sẵn trong dinh_day, tính theo đơn vị a
  'tu-do': 'Theo đề'
};

const tachTen = s => String(s).match(/[A-Z][0-9]*'*/g) || [];

// Đáy nằm trong mặt z = 0, đỉnh xếp theo vòng. a, b là hai kích thước của đáy.
// ten_day: tên các đỉnh đáy (mặc định A, B, C, D); dinh_day: toạ độ khi loai = 'tu-do'.
export function taoDay(loai, a = 1, b = a, { ten_day, dinh_day } = {}) {
  const D = loai === 'tu-do' ? (dinh_day || []).map(([x, y]) => [x * a, y * a, 0]) : {
    'tam-giac': [[0, 0.6 * a, 0], [0.45 * a, 0, 0], [a, 0.6 * a, 0]],
    'tam-giac-deu': [[0, S3 / 2 * a, 0], [a / 2, 0, 0], [a, S3 / 2 * a, 0]],
    'tam-giac-vuong-B': [[0, a, 0], [0, 0, 0], [b, 0, 0]],
    'vuong': [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0]],
    'chu-nhat': [[0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0]],
    'binh-hanh': [[0, 0, 0], [a, 0, 0], [a + b / 2, S3 / 2 * b, 0], [b / 2, S3 / 2 * b, 0]],
    'thang-vuong': [[0, 0, 0], [0, a, 0], [a, a, 0], [2 * a, 0, 0]],
    // Đáy lớn AD ở phía sau, B và C ở phía trước
    'nua-luc-giac': [[0, 0, 0], [a / 2, -S3 / 2 * a, 0], [3 * a / 2, -S3 / 2 * a, 0], [2 * a, 0, 0]]
  }[loai];
  if (!D || D.length < 3) throw new Error('Không biết loại đáy: ' + loai);
  const ten = ten_day?.length === D.length ? ten_day : 'ABCD'.slice(0, D.length).split('');
  return D.map((p, i) => [ten[i], p]);
}

// Các điểm đặc biệt của tam giác (trong mặt z = 0)
function tamTamGiac(loai, [A, B, C]) {
  const da = Math.hypot(B[0] - C[0], B[1] - C[1]), db = Math.hypot(C[0] - A[0], C[1] - A[1]), dc = Math.hypot(A[0] - B[0], A[1] - B[1]);
  if (loai === 'tam-noi-tiep') {
    const s = da + db + dc;
    return [(da * A[0] + db * B[0] + dc * C[0]) / s, (da * A[1] + db * B[1] + dc * C[1]) / s, 0];
  }
  const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  const n = p => p[0] * p[0] + p[1] * p[1];
  const O = [
    (n(A) * (B[1] - C[1]) + n(B) * (C[1] - A[1]) + n(C) * (A[1] - B[1])) / d,
    (n(A) * (C[0] - B[0]) + n(B) * (A[0] - C[0]) + n(C) * (B[0] - A[0])) / d, 0];
  if (loai === 'tam-ngoai-tiep') return O;
  // Trực tâm: H = A + B + C − 2O
  return [A[0] + B[0] + C[0] - 2 * O[0], A[1] + B[1] + C[1] - 2 * O[1], 0];
}

// Chân đường cao (hình chiếu của đỉnh chóp, hoặc của A′ với lăng trụ xiên) xuống đáy:
//   tên một đỉnh đáy; 'tam' (tâm đáy: giao hai đường chéo, trọng tâm với tam giác); 'trong-tam';
//   'tam-ngoai-tiep', 'tam-noi-tiep', 'truc-tam' (đáy tam giác); 'trung-diem-XY'; 'tren-XY-k' (điểm X + k·XY)
export function chanDuongCao(chan, day) {
  const ds = Object.fromEntries(day);
  const pts = day.map(d => d[1]);
  if (ds[chan]) return { p: ds[chan], ten: chan };
  if (chan === 'tam' && pts.length === 4) {
    // Giao hai đường chéo AC và BD
    const [A, B, C, D] = pts;
    const r = [C[0] - A[0], C[1] - A[1]], s = [D[0] - B[0], D[1] - B[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-12) throw new Error('Hai đường chéo đáy song song');
    const t = ((B[0] - A[0]) * s[1] - (B[1] - A[1]) * s[0]) / den;
    return { p: [A[0] + t * r[0], A[1] + t * r[1], 0], ten: 'O' };
  }
  if (chan === 'tam' || chan === 'trong-tam') return { p: centroid(pts), ten: chan === 'tam' ? 'O' : 'G' };
  if (['tam-ngoai-tiep', 'tam-noi-tiep', 'truc-tam'].includes(chan)) {
    if (pts.length !== 3) throw new Error('Chân đường cao này chỉ dùng cho đáy tam giác');
    return { p: tamTamGiac(chan, pts), ten: { 'tam-ngoai-tiep': 'O', 'tam-noi-tiep': 'I', 'truc-tam': 'H' }[chan] };
  }
  let m = /^trung-diem-(.+)$/.exec(chan);
  if (m) {
    const [x, y] = tachTen(m[1]);
    if (ds[x] && ds[y]) return { p: lerp(ds[x], ds[y], 0.5), ten: 'H' };
  }
  m = /^tren-(.+)-(-?[\d.]+)$/.exec(chan);
  if (m) {
    const [x, y] = tachTen(m[1]);
    if (ds[x] && ds[y]) return { p: lerp(ds[x], ds[y], +m[2]), ten: 'H' };
  }
  throw new Error('Chân đường cao không hợp lệ: ' + chan);
}

// Các lựa chọn chân đường cao cho ô chọn: [giá trị, nhãn]. Giữ cả giá trị đang dùng nếu nó không nằm trong danh sách.
export function luaChonChan(tenDay = ['A', 'B', 'C', 'D'], hienTai = '') {
  const n = tenDay.length;
  const ds = tenDay.map(t => [t, `Đỉnh ${t}`]);
  ds.push(['tam', n === 4 ? 'Giao hai đường chéo (O)' : 'Tâm tam giác (O)'], ['trong-tam', 'Trọng tâm đáy (G)']);
  if (n === 3) ds.push(['tam-ngoai-tiep', 'Tâm đường tròn ngoại tiếp'], ['tam-noi-tiep', 'Tâm đường tròn nội tiếp'], ['truc-tam', 'Trực tâm']);
  for (let i = 0; i < n; i++) { const c = tenDay[i] + tenDay[(i + 1) % n]; ds.push(['trung-diem-' + c, `Trung điểm ${c}`]); }
  if (hienTai && !ds.some(([v]) => v === hienTai)) {
    const m = /^tren-(.+)-(-?[\d.]+)$/.exec(hienTai);
    ds.push([hienTai, m ? `Trên ${m[1]}, tỉ số ${+(+m[2]).toFixed(4)}` : hienTai]);
  }
  return ds;
}

export function taoChop({ day, a = 1, b = a, cao = 1, chan = 'A', ten_dinh = 'S', ten_chan, ten_day, dinh_day }) {
  const d = taoDay(day, a, b, { ten_day, dinh_day });
  const ten = d.map(x => x[0]);
  const H = chanDuongCao(chan, d);
  if (ten_chan && !ten.includes(ten_chan)) H.ten = ten_chan;
  const S = ten_dinh;
  const diem = Object.fromEntries(d);
  diem[S] = [H.p[0], H.p[1], cao];
  const mat = [ten.slice()];
  for (let i = 0; i < ten.length; i++) mat.push([ten[i], ten[(i + 1) % ten.length], S]);
  const phu = [];
  if (!diem[H.ten]) {
    diem[H.ten] = H.p;
    phu.push({ a: S, b: H.ten });
    // Chân là giao hai đường chéo: vẽ hai đường chéo đáy
    if (chan === 'tam' && ten.length === 4) phu.push({ a: ten[0], b: ten[2] }, { a: ten[1], b: ten[3] });
  }
  return { diem, mat, phu };
}

// Lăng trụ: đáy trên là đáy dưới tịnh tiến theo (xien[0], xien[1], cao). xien = [0, 0] là lăng trụ đứng.
// Lăng trụ xiên đọc từ đề còn có chan (chân đường cao), cua (đỉnh trên được chiếu, như A′), ten_chan: vẽ thêm đường cao A′H.
export function taoLangTru({ day, a = 1, b = a, cao = 1, xien = [0, 0], ten_day, dinh_day, chan, cua, ten_chan }) {
  const d = taoDay(day, a, b, { ten_day, dinh_day });
  const ten = d.map(x => x[0]);
  const tren = ten.map(t => t + "'");
  const diem = Object.fromEntries(d);
  d.forEach(([t, p]) => { diem[t + "'"] = [p[0] + xien[0], p[1] + xien[1], cao]; });
  const mat = [ten.slice(), tren.slice()];
  for (let i = 0; i < ten.length; i++) {
    const j = (i + 1) % ten.length;
    mat.push([ten[i], ten[j], tren[j], tren[i]]);
  }
  const phu = [];
  if (chan && diem[cua]) {
    const H = chanDuongCao(chan, d);
    const tenH = ten_chan || H.ten;
    if (!diem[tenH]) diem[tenH] = H.p;
    if (tenH !== cua.replace(/'/g, '')) phu.push({ a: cua, b: tenH });
  }
  return { diem, mat, phu };
}

export function taoKhoi(loai, thamSo) {
  if (loai === 'chop') return taoChop(thamSo);
  if (loai === 'lang-tru') return taoLangTru(thamSo);
  throw new Error('Không biết loại khối: ' + loai);
}
