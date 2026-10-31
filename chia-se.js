// Chia sẻ hình cho học sinh: cả hình (số đo gốc, các bước dựng, cách hiển thị) nén vào phần sau dấu # của link.
// Phần sau # không gửi về máy chủ nào, nên link tự chứa hình, không cần cơ sở dữ liệu, không lộ gì của thầy.
// Chỉ đưa vào link những gì cần để vẽ: không có đường dẫn tệp, không có khoá AI, không có đề bài.

import { chuanHoa, PHIEN_BAN } from './tai-lieu.js';

const TIEN_TO = 'h1.'; // đổi định dạng sau này thì đổi tiền tố

// kemSoDo: gửi kèm các phép đo (thường là đáp số của bài, nên mặc định không gửi)
export function goiChiaSe(doc, { kemSoDo = false } = {}) {
  const ht = doc.hien_thi;
  return {
    t: doc.meta.ten,
    g: doc.goc,
    b: doc.buoc_dung,
    ...(kemSoDo && doc.so_do?.length ? { s: doc.so_do } : {}),
    h: { k: ht.kieu, n: ht.goc_nhin, c: ht.net_chinh_tay, p: ht.an_phu ? 1 : 0, d: ht.mat_day ? 1 : 0, ...(doc.goc.loai === 'do-thi' ? { t: ht.bbt === false ? 0 : 1, ...(ht.gio?.length ? { o: ht.gio } : {}) } : {}) }
  };
}

// Gói trong link → tài liệu hình đầy đủ (qua chuanHoa nên dữ liệu lạ hay hỏng đều bị chặn)
export function moGoi(goi) {
  if (!goi || typeof goi !== 'object') throw new Error('Link không chứa hình');
  const h = goi.h || {};
  return chuanHoa({
    version: PHIEN_BAN,
    meta: { ten: String(goi.t || 'Hình không gian').slice(0, 200) },
    goc: goi.g,
    buoc_dung: Array.isArray(goi.b) ? goi.b : [],
    so_do: Array.isArray(goi.s) ? goi.s : [],
    hien_thi: { kieu: h.k, goc_nhin: h.n, net_chinh_tay: h.c, an_phu: !!h.p, mat_day: !!h.d, ...(h.t !== undefined ? { bbt: !!h.t } : {}), gio: h.o }
  });
}

async function nen(byte, cach) {
  const s = new Blob([byte]).stream().pipeThrough(cach);
  return new Uint8Array(await new Response(s).arrayBuffer());
}

const sangBase64Url = u8 => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const tuBase64Url = s => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};

// Tài liệu hình → chuỗi đặt sau dấu # (nén deflate rồi base64 an toàn cho URL)
export async function maHoa(doc, tuyChon = {}) {
  const json = new TextEncoder().encode(JSON.stringify(goiChiaSe(doc, tuyChon)));
  return TIEN_TO + sangBase64Url(await nen(json, new CompressionStream('deflate-raw')));
}

// Chuỗi sau dấu # → tài liệu hình. Giới hạn cỡ để link lạ không làm treo máy.
export async function giaiMa(chuoi) {
  const s = String(chuoi || '').replace(/^#/, '').replace(/^d=/, '');
  if (!s.startsWith(TIEN_TO)) throw new Error('Link không chứa hình hoặc đã bị cắt mất một phần');
  if (s.length > 20000) throw new Error('Link quá dài');
  let byte;
  try { byte = await nen(tuBase64Url(s.slice(TIEN_TO.length)), new DecompressionStream('deflate-raw')); } catch { throw new Error('Link bị hỏng hoặc chép thiếu'); }
  if (byte.length > 200000) throw new Error('Dữ liệu hình quá lớn');
  let goi;
  try { goi = JSON.parse(new TextDecoder().decode(byte)); } catch { throw new Error('Link bị hỏng'); }
  return moGoi(goi);
}
