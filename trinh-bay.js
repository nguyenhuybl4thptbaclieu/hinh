// Kịch bản trình chiếu từng bước cho học sinh: dãy "khung", mỗi khung là những gì đã dựng tới bước đó
// cùng lời giải thích. Bắt đầu bằng cách vẽ khối (đáy, đường cao, cạnh bên), rồi lần lượt từng bước dựng thêm.
// Thiết diện được tách thành nhiều khung theo phương pháp giao tuyến như khi giảng trên lớp:
// nối hai điểm cùng nằm trên một mặt, lấy giao điểm của giao tuyến với cạnh, kẻ song song, kéo dài lấy điểm phụ.

import { apDung, matPhang, moTa, giaoHaiDuong, doanCuaDuong } from './dung.js';
import { khoaDoan } from './hinh.js';
import { LOAI_DAY } from './khoi.js';
import { sub, dot, cross, len } from './vec.js';

const ht = t => String(t).replace(/'/g, '′');
const nn = ds => ds.map(ht).join('');
const TEN_PHU = 'EFIJKLQRTUVXYZ'.split('');
const TEN_DA_GIAC = { 3: 'tam giác', 4: 'tứ giác', 5: 'ngũ giác', 6: 'lục giác' };

// hinhGoc: khối chưa dựng thêm (taoHinh); buoc: các bước dựng của tệp hình.
// Kết quả: { hinh: hình đủ (thêm điểm phụ, đoạn kéo dài chỉ dùng khi trình chiếu), khung: [{ chu, doan, diem, daGiac, moi }] }
export function taoKichBan(hinhGoc, buoc = []) {
  const them = { diem: {}, doan: [] };
  // duong: các đoạn đã được vẽ kéo dài thành đường thẳng tới khung này (trước đó vẽ như đoạn thường)
  const hien = { doan: new Set(), diem: new Set(), daGiac: new Set(), duong: new Set() };
  const khung = [];
  const ghi = (chu, { doan = [], diem = [], daGiac = [], duong = [] } = {}) => {
    doan.forEach(x => hien.doan.add(x));
    diem.forEach(x => hien.diem.add(x));
    daGiac.forEach(x => hien.daGiac.add(x));
    duong.forEach(x => hien.duong.add(x));
    khung.push({ chu, doan: new Set(hien.doan), diem: new Set(hien.diem), daGiac: new Set(hien.daGiac), duong: new Set(hien.duong), moi: new Set([...doan, ...diem, ...daGiac]) });
  };

  veKhoi(hinhGoc, ghi);

  let truoc = apDung(hinhGoc, []);
  for (let i = 0; i < buoc.length; i++) {
    const b = buoc[i];
    const sau = apDung(hinhGoc, buoc.slice(0, i + 1));
    if (!sau.loi[b.id]) {
      if (b.loai === 'thiet-dien') giaiThichThietDien(hinhGoc, b, sau, ghi, them);
      else {
        const diemMoi = Object.keys(sau.diem).filter(t => !truoc.diem[t]);
        const coTruoc = new Set(truoc.doan.map(d => d.id));
        const doanMoi = sau.doan.filter(d => !coTruoc.has(d.id)).map(d => d.id);
        // Đường thẳng qua một cạnh đã có: vẫn tô nổi cạnh đó và từ đây mới vẽ kéo dài
        const duong = doanCuaDuong(b) ? [doanCuaDuong(b)] : [];
        ghi(b.ghi_chu || cauMacDinh(b), { diem: diemMoi, doan: [...new Set([...doanMoi, ...duong])], duong });
      }
    }
    truoc = sau;
  }
  const du = apDung(hinhGoc, buoc);
  return { hinh: { ...du, diem: { ...du.diem, ...them.diem }, doan: [...du.doan, ...them.doan] }, khung };
}

function cauMacDinh(b) {
  if (b.loai === 'doan') return `Nối ${nn([b.a, b.b])}.`;
  if (b.loai === 'duong-thang') return `Vẽ đường thẳng ${b.ten ? ht(b.ten) + ' ' : ''}đi qua ${ht(b.a)} và ${ht(b.b)}.`;
  if (b.loai === 'duong-song-song') return `Qua ${ht(b.qua)} kẻ đường thẳng ${b.ten ? ht(b.ten) + ' ' : ''}song song với ${nn(b.song_song)}.`;
  if (b.loai === 'giao-diem') return `Gọi ${moTa(b)}.`;
  if (b.loai === 'hinh-chieu') return `${moTa(b)}.`;
  return `Lấy ${moTa(b)}.`;
}

// ---------- Vẽ khối ----------

function moTaChan(chan, tenChan, dayTamGiac) {
  if (chan === 'tam') return dayTamGiac ? `tâm ${tenChan} của tam giác đáy` : `tâm ${tenChan} của đáy (giao hai đường chéo)`;
  if (chan === 'trong-tam') return `trọng tâm ${tenChan} của đáy`;
  if (chan === 'tam-ngoai-tiep') return `tâm ${tenChan} của đường tròn ngoại tiếp đáy`;
  if (chan === 'tam-noi-tiep') return `tâm ${tenChan} của đường tròn nội tiếp đáy`;
  if (chan === 'truc-tam') return `trực tâm ${tenChan} của đáy`;
  let m = /^trung-diem-(.+)$/.exec(chan || '');
  if (m) return `trung điểm ${tenChan} của ${ht(m[1])}`;
  m = /^tren-(.+)-/.exec(chan || '');
  if (m) return `điểm ${tenChan} trên ${ht(m[1])}`;
  return `điểm ${tenChan}`;
}

function veKhoi(h, ghi) {
  const ts = h.thamSo || {};
  const canhCua = ten => ten.map((t, i) => khoaDoan(t, ten[(i + 1) % ten.length]));
  const tenDay = h.mat[0];
  const hinhDay = (ts.mo_ta_day || `${LOAI_DAY[ts.day] || 'Đáy'} ${nn(tenDay)}`).split(';')[0];
  const phu = h.doan.filter(d => d.loai === 'phu');

  if (h.loai === 'chop') {
    const S = ts.ten_dinh || 'S';
    ghi(`Vẽ đáy: ${hinhDay}. Trong hình biểu diễn, cạnh chạy ra phía sau vẽ chéo và ngắn lại, các cạnh song song vẫn vẽ song song.`, { doan: canhCua(tenDay), diem: tenDay });
    const duongCao = phu.find(d => d.a === S || d.b === S);
    if (duongCao) {
      const O = duongCao.a === S ? duongCao.b : duongCao.a;
      const khac = phu.filter(d => d !== duongCao);
      ghi(`Chân đường cao là ${moTaChan(ts.chan, ht(O), tenDay.length === 3)}. Vẽ ${ht(S)}${ht(O)} ⊥ (${nn(tenDay)}): trong hình biểu diễn, đường vuông góc với đáy vẽ thẳng đứng.`,
        { doan: [duongCao.id, ...khac.map(d => d.id)], diem: [O, S] });
    } else {
      const A = ts.chan;
      ghi(`${ht(S)}${ht(A)} ⊥ (${nn(tenDay)}): vẽ ${ht(S)}${ht(A)} thẳng đứng.`, { doan: [khoaDoan(S, A)], diem: [S] });
    }
    const daCo = new Set([...canhCua(tenDay), khoaDoan(S, ts.chan || '')]);
    const conLai = h.doan.filter(d => d.loai === 'canh' && !daCo.has(d.id)).map(d => d.id);
    if (conLai.length) ghi(`Nối ${ht(S)} với các đỉnh của đáy, ta được hình chóp ${ht(S)}.${nn(tenDay)}. Cạnh bị các mặt che khuất vẽ nét đứt.`, { doan: conLai });
    return;
  }

  // Lăng trụ
  const tenTren = h.mat[1];
  ghi(`Vẽ đáy dưới: ${hinhDay}.`, { doan: canhCua(tenDay), diem: tenDay });
  const duongCao = phu[0];
  if (duongCao) {
    const H = tenTren.includes(duongCao.a) ? duongCao.b : duongCao.a;
    const A1 = H === duongCao.a ? duongCao.b : duongCao.a;
    ghi(`Hình chiếu của ${ht(A1)} lên đáy là ${moTaChan(ts.chan, ht(H), tenDay.length === 3)}. Vẽ ${ht(A1)}${ht(H)} thẳng đứng.`, { doan: [duongCao.id], diem: [H, A1] });
  }
  const dung = !(ts.xien?.[0] || ts.xien?.[1]);
  ghi(`Vẽ các cạnh bên ${tenDay.map(t => ht(t) + ht(t + "'")).join(', ')} song song và bằng nhau${dung ? ' (lăng trụ đứng: vẽ thẳng đứng)' : ''}, rồi nối đáy trên ${nn(tenTren)}.`,
    { doan: h.doan.filter(d => d.loai === 'canh' && !canhCua(tenDay).includes(d.id)).map(d => d.id), diem: tenTren });
}

// ---------- Thiết diện theo phương pháp giao tuyến ----------

function giaiThichThietDien(hinhGoc, b, sau, ghi, them) {
  const dg = sau.daGiac.find(d => d.id === b.id);
  if (!dg) return;
  const vong = dg.diem;
  const R = hinhGoc.banKinh, eps = 1e-7 * (1 + R);
  const P = t => sau.diem[t] ?? them.diem[t];
  const mats = hinhGoc.matChe;
  const tren = (t, m) => Math.abs(dot(m.n, sub(P(t), m.goc))) < eps;
  // Đọc tên như SGK: đỉnh chóp đứng trước, ví dụ (SAB), SD
  const dinh = hinhGoc.loai === 'chop' ? (hinhGoc.thamSo?.ten_dinh || 'S') : null;
  const truocDinh = ds => (ds.includes(dinh) ? [dinh, ...ds.filter(t => t !== dinh)] : ds);
  const tenMat = m => `(${nn(truocDinh(m.ten))})`;
  const canhMat = m => m.ten.map((t, i) => [t, m.ten[(i + 1) % m.ten.length]]);
  // Cạnh của mặt m chứa điểm w (w nằm giữa hai đầu), không có nếu w là đỉnh
  const canhChua = (w, m) => {
    const c = canhMat(m).find(([X, Y]) => {
      const l = len(sub(P(Y), P(X))), a = len(sub(P(w), P(X))), c2 = len(sub(P(w), P(Y)));
      return a > eps && c2 > eps && Math.abs(a + c2 - l) < 1e-7 * (1 + l);
    });
    return c && truocDinh(c);
  };
  const cungCho = (s, t) => len(sub(P(s), P(t))) < eps;
  const ganNhat = (E, ds) => ds.reduce((x, y) => (len(sub(P(y), P(E))) < len(sub(P(x), P(E))) ? y : x));
  const themDoanPhu = (a, c) => {
    const id = khoaDoan(a, c);
    if (!them.doan.some(d => d.id === id) && !sau.doan.some(d => d.id === id)) them.doan.push({ id, a, b: c, loai: 'keo-dai', matKe: [] });
    return id;
  };
  const tenTu = () => TEN_PHU.find(c => !sau.diem[c] && !them.diem[c]) || 'X' + Object.keys(them.diem).length;

  const mp = b.mp;
  const tenMp = mp.kieu === 'ba-diem' ? `(${nn(mp.diem)})` : '(α)';
  ghi(b.ghi_chu || (mp.kieu === 'ba-diem' ? `Tìm thiết diện của hình với mặt phẳng ${tenMp}.`
    : mp.kieu === 'song-song-mat' ? `Mặt phẳng (α) đi qua ${ht(mp.diem)} và song song với (${nn(mp.mat)}). Tìm thiết diện của hình với (α).`
    : `Mặt phẳng (α) đi qua ${ht(mp.diem)} và vuông góc với ${nn(mp.duong)}. Tìm thiết diện của hình với (α).`));

  const canhTD = vong.map((t, i) => [t, vong[(i + 1) % vong.length]]);
  const matCua = ([u, v]) => mats.find(m => tren(u, m) && tren(v, m));
  const daBiet = new Set([].concat(mp.diem).filter(t => P(t)));
  // Đỉnh thiết diện trùng một điểm đã cho thì coi như đã biết
  for (const t of vong) if ([...daBiet].some(k => cungCho(k, t))) daBiet.add(t);
  const daVe = new Set();
  const matSS = mp.kieu === 'song-song-mat' ? { ten: mp.mat, n: matPhang({ kieu: 'ba-diem', diem: mp.mat.slice(0, 3) }, sau.diem).n } : null;

  for (let lap = 0; lap < 40 && daVe.size < canhTD.length; lap++) {
    let tien = false;

    // 1) Mặt có hai điểm đã biết: giao tuyến là đường thẳng qua hai điểm đó
    for (const [u, v] of canhTD) {
      const id = khoaDoan(u, v);
      if (daVe.has(id)) continue;
      const m = matCua([u, v]);
      if (!m) continue;
      if (daBiet.has(u) && daBiet.has(v)) {
        ghi(`${ht(u)} và ${ht(v)} cùng nằm trong mặt phẳng ${tenMat(m)}: nối ${nn([u, v])}.`, { doan: [id] });
        daVe.add(id); tien = true; break;
      }
      const biet = [...daBiet].filter(t => tren(t, m));
      const p = daBiet.has(u) ? u : daBiet.has(v) ? v : biet[0];
      const q = biet.find(t => t !== p && !cungCho(t, p));
      if (!p || !q) continue;
      const moi = [u, v].filter(t => !daBiet.has(t));
      const cau = moi.map(w => { const e = canhChua(w, m); return e ? `${nn([p, q])} cắt ${nn(e)} tại ${ht(w)}` : `${nn([p, q])} đi qua ${ht(w)}`; });
      const doan = [id];
      for (const x of [p, q]) if (them.diem[x]) doan.push(themDoanPhu(x, ganNhat(x, [u, v])));
      ghi(`Trong mặt phẳng ${tenMat(m)}, đường thẳng ${cau.join('; ')}. Nối ${nn([u, v])}.`, { doan, diem: moi });
      moi.forEach(w => daBiet.add(w));
      daVe.add(id); tien = true; break;
    }
    if (tien) continue;

    // 2) Mặt phẳng cắt song song với một mặt: giao tuyến qua điểm đã biết, song song với giao tuyến của hai mặt kia
    if (matSS) {
      for (const [u, v] of canhTD) {
        const id = khoaDoan(u, v);
        if (daVe.has(id)) continue;
        const m = matCua([u, v]);
        if (!m || len(cross(m.n, matSS.n)) < 1e-9) continue;
        const p = daBiet.has(u) ? u : daBiet.has(v) ? v : null;
        if (!p) continue;
        const chung = truocDinh(m.ten.filter(t => matSS.ten.includes(t)));
        const ss = chung.length >= 2 ? nn(chung.slice(0, 2)) : `giao tuyến của ${tenMat(m)} và (${nn(matSS.ten)})`;
        const moi = [u, v].filter(t => !daBiet.has(t));
        const cau = moi.map(w => { const e = canhChua(w, m); return e ? `cắt ${nn(e)} tại ${ht(w)}` : `đi qua ${ht(w)}`; });
        ghi(`Vì (α) ∥ (${nn(matSS.ten)}) nên giao tuyến của (α) với ${tenMat(m)} đi qua ${ht(p)} và song song với ${ss}; đường này ${cau.join(', ')}.`, { doan: [id], diem: moi });
        moi.forEach(w => daBiet.add(w));
        daVe.add(id); tien = true; break;
      }
      if (tien) continue;
    }

    // 3) Kéo dài: giao tuyến đã có trong mặt m cắt đường thẳng chứa một cạnh của m tại E (ngoài khối);
    //    E nằm trên mặt bên cạnh, nối E với một điểm đã biết của mặt đó sẽ ra giao tuyến mới
    for (const m of mats) {
      const biet = [...daBiet].filter(t => tren(t, m));
      if (biet.length < 2) continue;
      const p = biet[0], q = biet.find(t => !cungCho(t, p));
      if (!q) continue;
      for (const [X, Y] of canhMat(m)) {
        let E;
        try { E = giaoHaiDuong(P(p), P(q), P(X), P(Y), 1e-9); } catch { continue; }
        const u = sub(P(Y), P(X)), t = dot(sub(E, P(X)), u) / dot(u, u);
        if (t > -1e-6 && t < 1 + 1e-6) continue;
        if (len(sub(E, hinhGoc.tam)) > 8 * R) continue;
        const m2 = mats.find(k => k !== m && tren(X, k) && tren(Y, k));
        if (!m2) continue;
        const conCanh = canhTD.some(([a, c]) => !daVe.has(khoaDoan(a, c)) && matCua([a, c]) === m2);
        const bietM2 = [...daBiet].filter(k => tren(k, m2) && len(sub(P(k), E)) > eps);
        if (!conCanh || !bietM2.length || [...daBiet].some(k => len(sub(P(k), E)) < eps)) continue;
        const ten = tenTu();
        them.diem[ten] = E;
        const doan = [themDoanPhu(t < 0 ? X : Y, ten), themDoanPhu(ganNhat(ten, [p, q]), ten)];
        ghi(`Trong mặt phẳng ${tenMat(m)}, kéo dài ${nn([p, q])} cắt đường thẳng ${nn(truocDinh([X, Y]))} tại ${ht(ten)}.`, { doan, diem: [ten] });
        daBiet.add(ten);
        tien = true; break;
      }
      if (tien) break;
    }
    if (!tien) break;
  }

  // Phần app chưa giải thích được theo các cách trên: vẽ thẳng
  const con = canhTD.filter(([u, v]) => !daVe.has(khoaDoan(u, v)));
  if (con.length) {
    const moi = vong.filter(t => !daBiet.has(t));
    ghi(`Các giao điểm còn lại${moi.length ? ` (${moi.map(ht).join(', ')})` : ''}: nối các cạnh ${con.map(c => nn(c)).join(', ')}.`, { doan: con.map(([u, v]) => khoaDoan(u, v)), diem: moi });
  }
  ghi(`Thiết diện là ${TEN_DA_GIAC[vong.length] || 'đa giác'} ${nn(vong)}.`, { daGiac: [b.id] });
}
