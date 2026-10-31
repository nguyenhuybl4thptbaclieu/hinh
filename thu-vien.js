// Bộ hình chuẩn. Số đo tính theo đơn vị a = 1.
// thuMuc: nơi đặt hình khi tạo sẵn thư viện mẫu lần đầu chạy.

const L11 = 'Thư viện/Lớp 11', L12 = 'Thư viện/Lớp 12';

export const HINH_CHUAN = [
  { id: 'chop-tg-sa', ten: 'Chóp S.ABC, SA ⊥ (ABC)', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'tam-giac', a: 1, cao: 1, chan: 'A' } },
  { id: 'chop-tg-deu', ten: 'Chóp tam giác đều S.ABC', loai: 'chop', thuMuc: L12 + '/Thể tích', ts: { day: 'tam-giac-deu', a: 1, cao: 1, chan: 'tam' } },
  { id: 'chop-vuong-sa', ten: 'Chóp S.ABCD đáy vuông, SA ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'vuong', a: 1, cao: 1, chan: 'A' } },
  { id: 'chop-tu-giac-deu', ten: 'Chóp tứ giác đều S.ABCD', loai: 'chop', thuMuc: L12 + '/Thể tích', ts: { day: 'vuong', a: 1, cao: 1, chan: 'tam' } },
  { id: 'chop-bh', ten: 'Chóp S.ABCD đáy hình bình hành', loai: 'chop', thuMuc: L11 + '/Song song', ts: { day: 'binh-hanh', a: 1.2, b: 0.9, cao: 1, chan: 'tam' } },
  { id: 'chop-thang', ten: 'Chóp S.ABCD đáy nửa lục giác đều, SA ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'nua-luc-giac', a: 0.6, cao: 1, chan: 'A' } },
  { id: 'chop-mat-ben', ten: 'Chóp S.ABCD, (SAB) ⊥ đáy', loai: 'chop', thuMuc: L11 + '/Vuông góc', ts: { day: 'vuong', a: 1, cao: 0.87, chan: 'trung-diem-AB' } },
  { id: 'lang-tru-dung', ten: "Lăng trụ đứng ABC.A'B'C'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'tam-giac', a: 1, cao: 1, xien: [0, 0] } },
  { id: 'lang-tru-xien', ten: "Lăng trụ xiên ABC.A'B'C'", loai: 'lang-tru', thuMuc: L11 + '/Song song', ts: { day: 'tam-giac', a: 1, cao: 0.9, xien: [0.35, 0.15] } },
  { id: 'hop-cn', ten: "Hình hộp chữ nhật ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'chu-nhat', a: 1, b: 0.7, cao: 0.8, xien: [0, 0] } },
  { id: 'lap-phuong', ten: "Hình lập phương ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L12 + '/Thể tích', ts: { day: 'vuong', a: 1, cao: 1, xien: [0, 0] } },
  { id: 'hop-xien', ten: "Hình hộp ABCD.A'B'C'D'", loai: 'lang-tru', thuMuc: L11 + '/Song song', ts: { day: 'binh-hanh', a: 1, b: 0.8, cao: 0.8, xien: [0.3, 0.1] } }
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
