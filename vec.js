// Phép toán vectơ 3D trên mảng [x, y, z]

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a); return l ? scale(a, 1 / l) : [0, 0, 0]; };
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function centroid(pts) {
  const s = [0, 0, 0];
  for (const p of pts) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
  return scale(s, 1 / pts.length);
}

// Pháp tuyến đa giác phẳng theo phương pháp Newell (bền với đỉnh gần thẳng hàng)
export function newell(pts) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  }
  return norm(n);
}
