// Phép chiếu song song kiểu hình biểu diễn SGK (chiếu xiên).
// Hệ trục thế giới: x sang phải, y chạy ra sau, z hướng lên.
// Trước khi chiếu, xoay hình quanh trục z một góc `xoay`.
// Trục y sau khi xoay được vẽ chéo một góc `goc` so với phương ngang, rút ngắn theo `heSo`.
// Đường thẳng đứng luôn vẽ thẳng đứng, đúng như cách vẽ tay trên bảng.

const RAD = Math.PI / 180;

export function taoPhepChieu({ xoay = 0, goc = 45, heSo = 0.5 } = {}) {
  const c = Math.cos(xoay * RAD), s = Math.sin(xoay * RAD);
  const kx = heSo * Math.cos(goc * RAD), ky = heSo * Math.sin(goc * RAD);

  // Toạ độ trên mặt phẳng vẽ (đơn vị như thế giới, Y hướng lên)
  const chieu = p => {
    const x = p[0] * c - p[1] * s;
    const y = p[0] * s + p[1] * c;
    return [x + kx * y, p[2] + ky * y];
  };

  // Hướng chiếu: phương mà mọi điểm trên nó chiếu về cùng một điểm, chỉ vào trong hình (xa người nhìn).
  // Trong hệ đã xoay là (-kx, 1, -ky); xoay ngược lại về hệ thế giới.
  const dx = -kx, dy = 1, dz = -ky;
  const huong = [dx * c + dy * s, -dx * s + dy * c, dz];

  return { xoay, goc, heSo, chieu, huong };
}

// Nhìn thẳng từ trên xuống (để xem hình trải phẳng đúng hình dạng thật), vẫn giữ góc xoay quanh trục z
export function taoPhepChieuTren({ xoay = 0 } = {}) {
  const c = Math.cos(xoay * RAD), s = Math.sin(xoay * RAD);
  return { xoay, chieu: p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c], huong: [0, 0, -1] };
}
