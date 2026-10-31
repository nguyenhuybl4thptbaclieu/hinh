// Trang xem cho học sinh: mở hình từ link (phần sau dấu #), chỉ để xem, không sửa, không gọi AI, không cần máy chủ của thầy.
// Hình vẽ kiểu SGK (xoay, dựng từng bước, trải phẳng) và 3D/AR (model-viewer: WebXR trên Android, Quick Look trên iPhone).

import { giaiMa } from './chia-se.js';
import { taoHinh } from './hinh.js';
import { apDung } from './dung.js';
import { taoPhepChieu, taoPhepChieuTren } from './chieu.js';
import { taoKichBan } from './trinh-bay.js';
import { lapBanLe, traiPhang, traiPhangDayDu } from './trai-phang.js';
import { GOC_NHIN_CHUAN } from './thu-vien.js';
import { veHinh, veTraiPhang } from './ve-svg.js';
import { taoGLB } from './glb.js';

// Thư viện xem 3D/AR của Google, bản cố định; chỉ tải khi học sinh mở phần 3D
const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

const $ = s => document.querySelector(s);
const svg = $('#ve');
let doc, hinh, gocNhin;
let trinhBay = null; // { kb, i }
let trai = null;     // { muc, tren, chay }

function baoLoi(chu) {
  $('#ten').textContent = 'Không mở được hình';
  const p = document.createElement('p');
  p.className = 'loi';
  p.textContent = chu + ' Hãy nhờ thầy cô gửi lại link hoặc quét lại mã QR.';
  $('#noi-dung').replaceChildren(p);
  $('#chon-che-do').hidden = true;
}

// ---------- Hình vẽ ----------

function ve() {
  const ht = doc.hien_thi;
  if (trai) {
    const pc = (trai.tren ? taoPhepChieuTren : taoPhepChieu)(gocNhin);
    const bl = lapBanLe(hinh);
    const khungDiem = [0, 0.25, 0.5, 0.75, 1].flatMap(m => traiPhang(hinh, m, bl).flatMap(x => x.p));
    veTraiPhang(svg, traiPhangDayDu(hinh, trai.muc, bl), pc, { kieu: ht.kieu, khungDiem, anPhu: ht.an_phu, doTrong: Math.max(0, 1 - trai.muc / 0.35) });
    return;
  }
  const pc = taoPhepChieu(gocNhin);
  if (trinhBay) veHinh(svg, trinhBay.kb.hinh, pc, { kieu: ht.kieu, anPhu: ht.an_phu, ep: ht.net_chinh_tay, khung: trinhBay.kb.khung[trinhBay.i], matDay: ht.mat_day });
  else veHinh(svg, hinh, pc, { kieu: ht.kieu, anPhu: ht.an_phu, ep: ht.net_chinh_tay, matDay: ht.mat_day });
  // Trang xem không cho chọn nét: bỏ vùng bấm để chạm vào hình chỉ để xoay
  svg.querySelectorAll('[data-doan], [data-diem]').forEach(e => e.remove());
}

function denKhung(i) {
  const n = trinhBay.kb.khung.length;
  trinhBay.i = Math.max(0, Math.min(n - 1, i));
  $('#tb-chu').textContent = trinhBay.kb.khung[trinhBay.i].chu;
  $('#tb-so').textContent = `${trinhBay.i + 1} / ${n}`;
  $('#tb-lui').disabled = trinhBay.i === 0;
  $('#tb-toi').disabled = trinhBay.i === n - 1;
  ve();
}

function datTrinhBay(bat) {
  if (bat) {
    datTrai(false);
    trinhBay = { kb: taoKichBan(taoHinh(doc.goc.loai, doc.goc.tham_so), doc.buoc_dung), i: 0 };
    denKhung(0);
  } else {
    trinhBay = null;
    ve();
  }
  $('#thanh-tb').hidden = !bat;
  $('#trinh-bay').classList.toggle('bat', bat);
  $('#trinh-bay').textContent = bat ? '■ Thôi dựng từng bước' : '▶ Dựng từng bước';
}

function datTrai(bat) {
  if (!bat && trai) cancelAnimationFrame(trai.chay);
  if (bat) { if (trinhBay) datTrinhBay(false); trai = { muc: 0, tren: false, chay: null }; }
  else trai = null;
  $('#thanh-trai').hidden = !bat;
  $('#trai-phang').classList.toggle('bat', bat);
  capNhatTrai();
  ve();
}

function capNhatTrai() {
  if (!trai) return;
  $('#muc-trai').value = trai.muc;
  $('#pt-trai').textContent = Math.round(trai.muc * 100) + '%';
  $('#chay-trai').textContent = trai.chay ? '❚❚ Dừng' : trai.muc > 0.99 ? '↺ Gập lại' : '▶ Mở ra';
  $('#nhin-tren').classList.toggle('bat', trai.tren);
}

function chayTrai() {
  if (trai.chay) { cancelAnimationFrame(trai.chay); trai.chay = null; return capNhatTrai(); }
  const tu = trai.muc, den = trai.muc > 0.99 ? 0 : 1, bd = performance.now(), dai = 2500 * Math.abs(den - tu);
  const buoc = luc => {
    if (!trai) return;
    const x = Math.min(1, (luc - bd) / Math.max(dai, 1)), e = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
    trai.muc = tu + (den - tu) * e;
    trai.chay = x < 1 ? requestAnimationFrame(buoc) : null;
    capNhatTrai();
    ve();
  };
  trai.chay = requestAnimationFrame(buoc);
}

// Kéo để xoay (ngang: quanh trục đứng, dọc: đổi góc nhìn)
let keo = null;
svg.addEventListener('pointerdown', e => { keo = { x: e.clientX, y: e.clientY, g: { ...gocNhin } }; svg.setPointerCapture(e.pointerId); });
svg.addEventListener('pointermove', e => {
  if (!keo) return;
  const dx = e.clientX - keo.x, dy = e.clientY - keo.y;
  gocNhin = { ...keo.g, xoay: ((keo.g.xoay - dx * 0.5 + 180) % 360 + 360) % 360 - 180, goc: Math.min(75, Math.max(15, keo.g.goc - dy * 0.3)) };
  ve();
});
svg.addEventListener('pointerup', () => { keo = null; });
svg.addEventListener('pointercancel', () => { keo = null; });
new ResizeObserver(() => doc && ve()).observe(svg);

$('#trinh-bay').onclick = () => datTrinhBay(!trinhBay);
$('#tb-lui').onclick = () => denKhung(trinhBay.i - 1);
$('#tb-toi').onclick = () => denKhung(trinhBay.i + 1);
$('#trai-phang').onclick = () => datTrai(!trai);
$('#chay-trai').onclick = chayTrai;
$('#muc-trai').oninput = e => { if (trai.chay) { cancelAnimationFrame(trai.chay); trai.chay = null; } trai.muc = +e.target.value; capNhatTrai(); ve(); };
$('#nhin-tren').onclick = () => { trai.tren = !trai.tren; capNhatTrai(); ve(); };
$('#goc-chuan').onclick = () => { gocNhin = { ...doc.hien_thi.goc_nhin }; ve(); };
document.addEventListener('keydown', e => {
  if (!trinhBay) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); denKhung(trinhBay.i + 1); }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); denKhung(trinhBay.i - 1); }
});

// ---------- 3D và AR ----------

let mv = null, kieu3d = 'trong', urlCu = null;

async function mo3D() {
  if (!mv) {
    try {
      await new Promise((ok, loi) => {
        const s = document.createElement('script');
        s.type = 'module'; s.src = MODEL_VIEWER; s.onload = ok; s.onerror = loi;
        document.head.appendChild(s);
      });
      await customElements.whenDefined('model-viewer');
    } catch {
      $('#cho-3d').textContent = 'Không tải được phần xem 3D. Kiểm tra kết nối mạng rồi tải lại trang.';
      return;
    }
    mv = document.createElement('model-viewer');
    for (const [k, v] of Object.entries({
      'camera-controls': '', 'touch-action': 'pan-y', ar: '', loading: 'eager', reveal: 'auto', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-placement': 'floor',
      'shadow-intensity': '0.6', exposure: '1.05', 'camera-orbit': '30deg 70deg auto', 'interaction-prompt': 'none', alt: 'Mô hình 3D của hình'
    })) mv.setAttribute(k, v);
    const nut = document.createElement('button');
    nut.slot = 'ar-button'; nut.id = 'nut-ar'; nut.textContent = 'Xem AR trên mặt bàn';
    mv.appendChild(nut);
    mv.addEventListener('error', () => { $('#ghi-3d').textContent = 'Máy này không hiển thị được mô hình 3D.'; });
    $('#the-3d').replaceChildren(mv);
  }
  dungMoHinh();
}

function dungMoHinh() {
  const { glb, nhan } = taoGLB(hinh, { kieu: doc.hien_thi.kieu, cheDo: kieu3d, anPhu: doc.hien_thi.an_phu });
  if (urlCu) URL.revokeObjectURL(urlCu);
  urlCu = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
  mv.querySelectorAll('.nhan-3d').forEach(e => e.remove());
  nhan.forEach((n, i) => {
    const b = document.createElement('div');
    b.className = 'nhan-3d';
    b.slot = 'hotspot-' + i;
    // Đẩy tên ra khỏi điểm một chút, theo hướng ra ngoài hình
    const p = n.vi_tri.map((v, k) => v + n.huong[k] * 0.012);
    b.dataset.position = p.map(v => v.toFixed(4) + 'm').join(' ');
    b.textContent = n.ten;
    mv.appendChild(b);
  });
  mv.src = urlCu;
}

function datCheDo(cd) {
  document.querySelectorAll('#chon-che-do button').forEach(b => b.classList.toggle('bat', b.dataset.cheDo === cd));
  const la3d = cd === '3d';
  $('#the-ve').hidden = $('#cc-ve').hidden = $('#ghi-ve').hidden = la3d;
  $('#the-3d').hidden = $('#cc-3d').hidden = $('#ghi-3d').hidden = !la3d;
  if (la3d) { datTrinhBay(false); datTrai(false); $('#thanh-tb').hidden = $('#thanh-trai').hidden = true; mo3D(); }
  else ve();
}

document.querySelectorAll('#chon-che-do button').forEach(b => b.onclick = () => datCheDo(b.dataset.cheDo));
document.querySelectorAll('#kieu-3d button').forEach(b => b.onclick = () => {
  kieu3d = b.dataset.kieu;
  document.querySelectorAll('#kieu-3d button').forEach(x => x.classList.toggle('bat', x === b));
  if (mv) dungMoHinh();
});
$('#hien-nhan').onclick = e => {
  const bat = !e.currentTarget.classList.contains('bat');
  e.currentTarget.classList.toggle('bat', bat);
  $('#the-3d').classList.toggle('an-nhan', !bat);
};

// ---------- Mở hình từ link ----------

(async () => {
  if (!location.hash) return baoLoi('Link không có hình.');
  try {
    doc = await giaiMa(location.hash);
    hinh = apDung(taoHinh(doc.goc.loai, doc.goc.tham_so), doc.buoc_dung);
  } catch (e) {
    return baoLoi(e.message + '.');
  }
  gocNhin = { ...GOC_NHIN_CHUAN, ...doc.hien_thi.goc_nhin };
  $('#ten').textContent = doc.meta.ten;
  document.title = doc.meta.ten + ' · Xem hình không gian';
  ve();
})();

// Mở link của hình khác ngay trong thẻ này: chỉ phần sau # đổi, nên tải lại để đọc hình mới
addEventListener('hashchange', () => location.reload());
