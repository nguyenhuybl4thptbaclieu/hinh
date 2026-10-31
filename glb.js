// Mô hình 3D (glTF nhị phân, .glb) từ hình đã dựng, cho trang xem 3D/AR của học sinh.
// Cạnh là ống trụ mảnh, điểm là hạt cầu nhỏ, mặt khối tô trong suốt (hoặc kín, hoặc bỏ), thiết diện tô màu.
// Đơn vị glTF là mét, trục y hướng lên: hình được thu về cỡ để bày trên mặt bàn và đặt đáy chạm mặt bàn.

import { dauMutDoan } from './hinh.js';
import { add, cross, len, norm, scale, sub, newell } from './vec.js';

const MAU = {
  'bai-giang': { canh: '#1f3c88', phu: '#6b778c', noi: '#2f6f4f', td: '#c0392b', diem: '#1b1f24', mat: '#dbe6ff', toTd: '#f0a04b' },
  'de': { canh: '#111111', phu: '#444444', noi: '#222222', td: '#111111', diem: '#000000', mat: '#e9e9e9', toTd: '#bbbbbb' }
};

// sRGB (mã màu) → tuyến tính, như glTF yêu cầu cho baseColorFactor
const tuyenTinh = hex => [1, 3, 5].map(i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });

// cheDo: 'trong' (mặt trong suốt), 'kin' (khối kín), 'net' (chỉ các nét)
// coMet: cạnh lớn nhất của hình khi bày ra (mét)
export function taoGLB(hinh, { kieu = 'bai-giang', cheDo = 'trong', anPhu = false, coMet = 0.25 } = {}) {
  const M = MAU[kieu] || MAU['bai-giang'];
  const nhom = new Map(); // khoá chất liệu → { mau, alpha, pos, nor, idx }
  const lay = (khoa, mau, alpha = 1) => {
    if (!nhom.has(khoa)) nhom.set(khoa, { mau, alpha, pos: [], nor: [], idx: [] });
    return nhom.get(khoa);
  };

  // Đổi hệ: z lên (hình) → y lên (glTF), co về cỡ coMet, đặt điểm thấp nhất ở y = 0
  // Cỡ theo các đỉnh của khối (kể cả đỉnh ẩn của đường tròn đáy nón, trụ) và các điểm có tên
  const dinhKhoi = new Set(hinh.mat.flat());
  const ds = Object.entries(hinh.diem).filter(([t]) => dinhKhoi.has(t) || !hinh.diemAn?.has(t)).map(([, p]) => p);
  const xs = ds.map(p => p[0]), ys = ds.map(p => p[1]), zs = ds.map(p => p[2]);
  const lon = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)) || 1;
  const k = coMet / lon;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, z0 = Math.min(...zs);
  const doi = p => [(p[0] - cx) * k, (p[2] - z0) * k, -(p[1] - cy) * k];
  const doiHuong = v => [v[0], v[2], -v[1]];

  const rOng = coMet * 0.006, rDiem = coMet * 0.016;

  // Ống trụ từ A tới B (toạ độ glTF)
  const ong = (g, A, B, r) => {
    const d = sub(B, A), l = len(d);
    if (l < 1e-9) return;
    const w = scale(d, 1 / l);
    const u = norm(Math.abs(w[1]) < 0.9 ? cross(w, [0, 1, 0]) : cross(w, [1, 0, 0])), v = cross(w, u);
    const n = 10, goc = g.pos.length / 3;
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI, h = add(scale(u, Math.cos(a)), scale(v, Math.sin(a)));
      for (const P of [A, B]) { g.pos.push(...add(P, scale(h, r))); g.nor.push(...h); }
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a0 = goc + 2 * i, a1 = a0 + 1, b0 = goc + 2 * j, b1 = b0 + 1;
      g.idx.push(a0, b0, a1, a1, b0, b1);
    }
  };

  // Hạt cầu tại P
  const cau = (g, P, r) => {
    const doc = 6, vong = 10, goc = g.pos.length / 3;
    for (let i = 0; i <= doc; i++) {
      const t = i / doc * Math.PI;
      for (let j = 0; j < vong; j++) {
        const f = j / vong * 2 * Math.PI, h = [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)];
        g.pos.push(...add(P, scale(h, r))); g.nor.push(...h);
      }
    }
    for (let i = 0; i < doc; i++) for (let j = 0; j < vong; j++) {
      const a = goc + i * vong + j, b = goc + i * vong + (j + 1) % vong, c = a + vong, d = b + vong;
      g.idx.push(a, c, b, b, c, d);
    }
  };

  // Đa giác lồi phẳng (mặt khối, thiết diện): chia quạt tam giác; vẽ hai mặt nên thêm cả mặt sau
  const daGiac = (g, ps) => {
    if (ps.length < 3) return;
    const n = newell(ps), goc = g.pos.length / 3;
    for (const p of ps) { g.pos.push(...p); g.nor.push(...n); }
    for (let i = 1; i + 1 < ps.length; i++) g.idx.push(goc, goc + i, goc + i + 1);
    const sau = g.pos.length / 3, m = scale(n, -1);
    for (const p of ps) { g.pos.push(...p); g.nor.push(...m); }
    for (let i = 1; i + 1 < ps.length; i++) g.idx.push(sau, sau + i + 1, sau + i);
  };

  // Mặt khối
  if (cheDo !== 'net') {
    const g = lay('mat', M.mat, cheDo === 'kin' ? 1 : 0.22);
    for (const f of hinh.mat) daGiac(g, f.map(t => doi(hinh.diem[t])));
  }
  // Thiết diện
  for (const dg of hinh.daGiac || []) {
    if (!dg.to_mau) continue;
    daGiac(lay('td', M.toTd, 0.55), dg.diem.map(t => doi(hinh.diem[t])));
  }
  // Nét
  for (const s of hinh.doan) {
    if (anPhu && s.loai === 'phu') continue;
    if (s.tron || s.an) continue; // lưới chia mặt cong: mặt 3D đã thể hiện, không vẽ cạnh
    const [P, Q] = dauMutDoan(hinh, s);
    const loai = s.loai === 'thiet-dien' || s.thietDien ? 'td' : s.loai === 'phu' || s.loai === 'keo-dai' ? 'phu' : s.loai === 'noi' ? 'noi' : 'canh';
    ong(lay('net-' + loai, M[loai]), doi(P), doi(Q), loai === 'canh' || loai === 'td' ? rOng : rOng * 0.75);
  }
  // Điểm và vị trí đặt tên (để trang xem gắn nhãn chữ)
  const nhan = [];
  const tam = doi([cx, cy, (Math.max(...zs) + z0) / 2]);
  for (const [t, p] of Object.entries(hinh.diem)) {
    if (hinh.diemAn?.has(t)) continue;
    const q = doi(p);
    cau(lay('diem', M.diem), q, rDiem);
    nhan.push({ ten: t.replace(/'/g, '′'), vi_tri: q, huong: norm(sub(q, tam)) });
  }
  return { glb: dongGoi([...nhom.values()]), nhan };
}

// Gói các nhóm (mỗi nhóm một chất liệu) thành tệp .glb
function dongGoi(nhom) {
  const ds = nhom.filter(g => g.idx.length);
  const phan = [], bufferViews = [], accessors = [], meshes = [], nodes = [], materials = [];
  let doDai = 0;
  const them = (mang, target) => {
    const b = new Uint8Array(mang.buffer);
    phan.push(b);
    bufferViews.push({ buffer: 0, byteOffset: doDai, byteLength: b.length, target });
    doDai += b.length;
    const pad = (4 - (doDai % 4)) % 4;
    if (pad) { phan.push(new Uint8Array(pad)); doDai += pad; }
    return bufferViews.length - 1;
  };
  ds.forEach((g, i) => {
    const pos = new Float32Array(g.pos), nor = new Float32Array(g.nor), idx = new Uint32Array(g.idx);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let j = 0; j < pos.length; j++) { min[j % 3] = Math.min(min[j % 3], pos[j]); max[j % 3] = Math.max(max[j % 3], pos[j]); }
    const aPos = accessors.push({ bufferView: them(pos, 34962), componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max }) - 1;
    const aNor = accessors.push({ bufferView: them(nor, 34962), componentType: 5126, count: nor.length / 3, type: 'VEC3' }) - 1;
    const aIdx = accessors.push({ bufferView: them(idx, 34963), componentType: 5125, count: idx.length, type: 'SCALAR' }) - 1;
    materials.push({
      pbrMetallicRoughness: { baseColorFactor: [...tuyenTinh(g.mau), g.alpha], metallicFactor: 0, roughnessFactor: 0.75 },
      ...(g.alpha < 1 ? { alphaMode: 'BLEND', doubleSided: true } : { doubleSided: true })
    });
    meshes.push({ primitives: [{ attributes: { POSITION: aPos, NORMAL: aNor }, indices: aIdx, material: i }] });
    nodes.push({ mesh: i });
  });
  const json = {
    asset: { version: '2.0', generator: 'Bang Hinh Khong Gian' },
    scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, materials, accessors, bufferViews,
    buffers: [{ byteLength: doDai }]
  };
  let jb = new TextEncoder().encode(JSON.stringify(json));
  const jpad = (4 - (jb.length % 4)) % 4;
  if (jpad) { const t = new Uint8Array(jb.length + jpad).fill(0x20); t.set(jb); jb = t; }
  const tong = 12 + 8 + jb.length + 8 + doDai;
  const ra = new Uint8Array(tong), dv = new DataView(ra.buffer);
  dv.setUint32(0, 0x46546c67, true); // "glTF"
  dv.setUint32(4, 2, true);
  dv.setUint32(8, tong, true);
  dv.setUint32(12, jb.length, true);
  dv.setUint32(16, 0x4e4f534a, true); // "JSON"
  ra.set(jb, 20);
  let o = 20 + jb.length;
  dv.setUint32(o, doDai, true);
  dv.setUint32(o + 4, 0x004e4942, true); // "BIN"
  o += 8;
  for (const p of phan) { ra.set(p, o); o += p.length; }
  return ra.buffer;
}
