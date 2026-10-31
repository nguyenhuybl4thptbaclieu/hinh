// Tệp hình: lưu số đo gốc và các bước dựng, không lưu ảnh.
// {
//   version: 1,
//   meta: { ten, lop, dang, the: [], co_thiet_dien, tao_luc, sua_luc },
//   goc: { loai: 'chop' | 'lang-tru', tham_so: {...} },
//   buoc_dung: [],                       // điểm, mặt phẳng, thiết diện... (từ bước 4)
//   so_do: [],                           // các phép đo: độ dài, góc, khoảng cách, diện tích, thể tích (core/do-dac.js)
//   hien_thi: { kieu, goc_nhin: {xoay, goc, heSo}, net_chinh_tay: {idĐoạn: 'lien'|'khuat'}, an_phu, mat_day (vẽ mặt phẳng chứa đáy) }
// }

import { gocNhinChuan } from './thu-vien.js';
import { taoKhoi } from './khoi.js';

export const PHIEN_BAN = 1;

export const DANG = {
  'song-song': 'Song song',
  'vuong-goc': 'Vuông góc',
  'thiet-dien': 'Thiết diện',
  'the-tich': 'Thể tích',
  'oxyz': 'Oxyz',
  'khac': 'Khác'
};

export function taiLieuTuMau(mau, meta = {}) {
  return {
    version: PHIEN_BAN,
    meta: { ten: mau.ten, lop: null, dang: null, the: [mau.loai], co_thiet_dien: false, ...meta },
    goc: { loai: mau.loai, tham_so: structuredClone(mau.ts) },
    buoc_dung: [],
    so_do: [],
    hien_thi: { kieu: 'bai-giang', goc_nhin: gocNhinChuan(mau.loai), net_chinh_tay: {}, an_phu: false, mat_day: false }
  };
}

// Kiểm tra tệp mở ra và điền giá trị mặc định cho phần thiếu. Báo lỗi dễ hiểu nếu tệp sai.
export function chuanHoa(x) {
  if (!x || typeof x !== 'object') throw new Error('Tệp không phải hình của app');
  if (typeof x.version !== 'number') throw new Error('Tệp thiếu số phiên bản');
  if (x.version > PHIEN_BAN) throw new Error('Tệp được tạo bởi bản app mới hơn, cần cập nhật app');
  const g = x.goc;
  if (!g || !['chop', 'lang-tru', 'non', 'tru', 'cau'].includes(g.loai) || !g.tham_so || typeof g.tham_so !== 'object') {
    throw new Error('Tệp thiếu phần khối gốc');
  }
  taoKhoi(g.loai, g.tham_so); // số đo sai thì báo lỗi ngay khi mở
  const ht = x.hien_thi || {};
  return {
    version: PHIEN_BAN,
    meta: { ten: 'Hình chưa đặt tên', lop: null, dang: null, the: [], ...x.meta, co_thiet_dien: coThietDien(x) },
    goc: { loai: g.loai, tham_so: g.tham_so },
    buoc_dung: Array.isArray(x.buoc_dung) ? x.buoc_dung : [],
    so_do: Array.isArray(x.so_do) ? x.so_do.filter(m => m && typeof m === 'object' && typeof m.loai === 'string') : [],
    hien_thi: {
      kieu: ht.kieu === 'de' ? 'de' : 'bai-giang',
      goc_nhin: { ...gocNhinChuan(g.loai), ...ht.goc_nhin },
      net_chinh_tay: { ...ht.net_chinh_tay },
      an_phu: !!ht.an_phu,
      mat_day: !!ht.mat_day,
      an_do: !!ht.an_do
    }
  };
}

export const coThietDien = x => Array.isArray(x.buoc_dung) && x.buoc_dung.some(b => b.loai === 'thiet-dien');

// Tên tệp từ tên hình: bỏ ký tự Windows không cho dùng
export function tenTep(ten) {
  const s = String(ten).replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').replace(/^\.+/, '');
  return (s || 'Hình') + '.json';
}

// Thẻ lớp và dạng đoán từ thư mục, ví dụ 'Thư viện/Lớp 11/Vuông góc' → {lop: 11, dang: 'vuong-goc'}
export function theTuThuMuc(duongDan) {
  const phan = duongDan.split('/');
  const lop = phan.map(p => /^Lớp (\d+)$/.exec(p)).find(Boolean);
  const dang = Object.entries(DANG).find(([, ten]) => phan.includes(ten));
  return { lop: lop ? +lop[1] : null, dang: dang ? dang[0] : null };
}
