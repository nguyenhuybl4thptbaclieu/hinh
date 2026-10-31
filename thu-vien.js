// Bộ hình chuẩn. Số đo tính theo đơn vị a = 1.
// thuMuc: nơi đặt hình khi tạo sẵn thư viện mẫu lần đầu chạy. ngan: tên ngắn ghi dưới thẻ hình ở mục Tạo hình mới.

const L11 = 'Thư viện/Lớp 11', L12 = 'Thư viện/Lớp 12';

export const HINH_CHUAN = [
  { id: 'chop-tg-sa', ngan: 'Chóp tam giác, SA ⊥ đáy', ten: 'Chóp S.ABC, SA ⊥ (ABC)', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'tam-giac', a: 1, cao: 1, chan: 'A' } },
  { id: 'chop-tg-deu', ngan: 'Chóp tam giác đều', ten: 'Chóp tam giác đều S.ABC', loai: 'chop', thuMuc: L12 + '/Thể tích', ts: { day: 'tam-giac-deu', a: 1, cao: 1, chan: 'tam' } },
  { id: 'chop-vuong-sa', ngan: 'Chóp đáy vuông, SA ⊥ đáy', ten: 'Chóp S.ABCD đáy vuông, SA ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'vuong', a: 1, cao: 1, chan: 'A' } },
  { id: 'chop-tu-giac-deu', ngan: 'Chóp tứ giác đều', ten: 'Chóp tứ giác đều S.ABCD', loai: 'chop', thuMuc: L12 + '/Thể tích', ts: { day: 'vuong', a: 1, cao: 1, chan: 'tam' } },
  { id: 'chop-bh', ngan: 'Chóp đáy bình hành', ten: 'Chóp S.ABCD đáy hình bình hành', loai: 'chop', thuMuc: L11 + '/Song song', ts: { day: 'binh-hanh', a: 1.2, b: 0.9, cao: 1, chan: 'tam' } },
  { id: 'chop-thang', ngan: 'Chóp đáy nửa lục giác', ten: 'Chóp S.ABCD đáy nửa lục giác đều, SA ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'nua-luc-giac', a: 0.6, cao: 1, chan: 'A' } },
  { id: 'chop-mat-ben', ngan: 'Chóp (SAB) ⊥ đáy', ten: 'Chóp S.ABCD, (SAB) ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'vuong', a: 1, cao: 0.87, chan: 'trung-diem-AB' } },
  { id: 'lang-tru-dung', ngan: 'Lăng trụ đứng', ten: "Lăng trụ đứng ABC.A'B'C'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'tam-giac', a: 1, cao: 1, xien: [0, 0] } },
  { id: 'lang-tru-xien', ngan: 'Lăng trụ xiên', ten: "Lăng trụ xiên ABC.A'B'C'", loai: 'lang-tru', thuMuc: L11 + '/Song song', ts: { day: 'tam-giac', a: 1, cao: 0.9, xien: [0.35, 0.15] } },
  { id: 'hop-cn', ngan: 'Hộp chữ nhật', ten: "Hình hộp chữ nhật ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'chu-nhat', a: 1, b: 0.7, cao: 0.8, xien: [0, 0] } },
  { id: 'lap-phuong', ngan: 'Lập phương', ten: "Hình lập phương ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'vuong', a: 1, cao: 1, xien: [0, 0] } },
  { id: 'hop-xien', ngan: 'Hình hộp', ten: "Hình hộp ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L11 + '/Song song', ts: { day: 'binh-hanh', a: 1, b: 0.8, cao: 0.8, xien: [0.3, 0.1] } }
];

// Khối tròn xoay (bán kính r, chiều cao cao, theo đơn vị a).
// Góc nhìn chuẩn riêng như SGK: trục sau vẽ thẳng đứng và rút ngắn nhiều, nên đường tròn nằm ngang thành elip có trục nằm ngang
// và mặt cầu gần như tròn.
export const GOC_NHIN_TRON = { xoay: 0, goc: 90, heSo: 0.35 };
export const gocNhinChuan = loai => ({ ...(['non', 'tru', 'cau'].includes(loai) ? GOC_NHIN_TRON : GOC_NHIN_CHUAN) });

export const HINH_TRON = [
  { id: 'non', ngan: 'Hình nón', ten: 'Hình nón đỉnh S, đáy tâm O', loai: 'non', thuMuc: L12 + '/Thể tích', ts: { r: 1, cao: 1.6 } },
  { id: 'tru', ngan: 'Hình trụ', ten: "Hình trụ trục OO'", loai: 'tru', thuMuc: L12 + '/Thể tích', ts: { r: 1, cao: 1.4 } },
  { id: 'cau', ngan: 'Mặt cầu', ten: 'Mặt cầu tâm O', loai: 'cau', thuMuc: L12 + '/Thể tích', ts: { r: 1 } }
];

// Đồ thị hàm số (chương trình 2018): hệ số mẫu như các ví dụ trong SGK
const DT = 'Thư viện/Đồ thị';
const doThi = (id, ten, ngan, ham, he_so) => ({ id, ten, ngan, loai: 'do-thi', thuMuc: DT, ts: { ham, he_so, khung: null } });
export const HINH_DO_THI = [
  doThi('dt-bac-hai', 'Đồ thị y = x² − 2x − 3', 'Bậc hai', 'bac-hai', { a: '1', b: '-2', c: '-3' }),
  doThi('dt-bac-ba', 'Đồ thị y = x³ − 3x + 1', 'Bậc ba', 'bac-ba', { a: '1', b: '0', c: '-3', d: '1' }),
  doThi('dt-nhat-nhat', 'Đồ thị y = (2x + 1)/(x − 1)', 'Phân thức bậc nhất', 'nhat-nhat', { a: '2', b: '1', c: '1', d: '-1' }),
  doThi('dt-hai-nhat', 'Đồ thị y = (x² + x + 1)/(x + 1)', 'Phân thức bậc hai', 'hai-nhat', { a: '1', b: '1', c: '1', m: '1', n: '1' }),
  doThi('dt-sin', 'Đồ thị y = sin x', 'y = sin x', 'sin', { A: '1', w: '1', p: '0', k: '0' }),
  doThi('dt-cos', 'Đồ thị y = cos x', 'y = cos x', 'cos', { A: '1', w: '1', p: '0', k: '0' }),
  doThi('dt-tan', 'Đồ thị y = tan x', 'y = tan x', 'tan', { A: '1', w: '1', p: '0', k: '0' }),
  doThi('dt-cot', 'Đồ thị y = cot x', 'y = cot x', 'cot', { A: '1', w: '1', p: '0', k: '0' }),
  doThi('dt-mu', 'Đồ thị y = 2ˣ', 'Hàm số mũ', 'mu', { a: '2' }),
  doThi('dt-log', 'Đồ thị y = log₂x', 'Hàm số lôgarit', 'log', { a: '2' })
];

export const GOC_NHIN_CHUAN = { xoay: 0, goc: 45, heSo: 0.5 };

// Bài thiết diện mẫu: khối gốc lấy từ HINH_CHUAN (theo id) cộng các bước dựng
const TD = L11 + '/Thiết diện';
export const MAU_THIET_DIEN = [
  {
    ten: 'Chóp S.ABCD đáy bình hành, thiết diện qua trung điểm AB, AD, SC', thuMuc: TD, goc: 'chop-bh',
    buoc: [
      { id: 'M', loai: 'trung-diem', a: 'A', b: 'B' },
      { id: 'N', loai: 'trung-diem', a: 'A', b: 'D' },
      { id: 'P', loai: 'trung-diem', a: 'S', b: 'C' },
      { id: 'td1', loai: 'thiet-dien', mp: { kieu: 'ba-diem', diem: ['M', 'N', 'P'] }, to_mau: true }
    ]
  },
  {
    ten: 'Lập phương, thiết diện qua trung điểm AB, BC, CC′', thuMuc: TD, goc: 'lap-phuong',
    buoc: [
      { id: 'M', loai: 'trung-diem', a: 'A', b: 'B' },
      { id: 'N', loai: 'trung-diem', a: 'B', b: 'C' },
      { id: 'P', loai: 'trung-diem', a: 'C', b: "C'" },
      { id: 'td1', loai: 'thiet-dien', mp: { kieu: 'ba-diem', diem: ['M', 'N', 'P'] }, to_mau: true }
    ]
  },
  {
    ten: 'Chóp S.ABC, thiết diện qua trung điểm M của SA, song song (SBC)', thuMuc: TD, goc: 'chop-tg-sa',
    buoc: [
      { id: 'M', loai: 'trung-diem', a: 'S', b: 'A' },
      { id: 'td1', loai: 'thiet-dien', mp: { kieu: 'song-song-mat', diem: 'M', mat: ['S', 'B', 'C'] }, ten_diem: { 'A|B': 'N', 'A|C': 'P' }, to_mau: true }
    ]
  },
  {
    ten: 'Chóp S.ABCD, SA ⊥ đáy, thiết diện qua A vuông góc SC', thuMuc: TD, goc: 'chop-vuong-sa',
    buoc: [
      { id: 'td1', loai: 'thiet-dien', mp: { kieu: 'vuong-goc-duong', diem: 'A', duong: ['S', 'C'] }, ten_diem: { 'B|S': 'H', 'C|S': 'K', 'D|S': 'L' }, to_mau: true }
    ]
  }
];
