// Adapted from heygen-com/hyperframes (Apache-2.0), commit e383abf475b6:
//   registry/components/hw-arrow/hw-arrow.html  (hwHash, hwArrowPath: seeded hand-wobble arrow)
//   registry/components/number-wheel/number-wheel.html  (digit strip: one column per digit, extra turns before landing)
// Licence: licenses/hyperframes-Apache-2.0.txt. What we changed: the arrow goes from any point A to any point B
// (the original draws inside a fixed w x h box), no GSAP, no DOM; the wheel returns numbers for React.

export const hwHash = (n, seed = 1) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

// Hand-drawn arrow from a to b. bend: 0 straight .. 0.55 swoop. Returns {body, headA, headB}.
export function arrowPath(a, b, {bend = 0.28, seed = 1, head = 30} = {}) {
  const wob = (v, n, r) => v + hwHash(n, seed) * r;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // normal, for the bend
  const x0 = wob(a[0], 1, 3), y0 = wob(a[1], 2, 3);
  const x1 = wob(b[0], 3, 3), y1 = wob(b[1], 4, 3);
  const c1x = wob(a[0] + dx * 0.35 + nx * len * bend * 0.5, 5, 8), c1y = wob(a[1] + dy * 0.35 + ny * len * bend * 0.5, 6, 8);
  const c2x = wob(a[0] + dx * 0.7 + nx * len * bend, 7, 8), c2y = wob(a[1] + dy * 0.7 + ny * len * bend, 8, 8);
  const ang = Math.atan2(y1 - c2y, x1 - c2x);
  const h = (da, L) => {
    const t = ang + Math.PI + da;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${(x1 + Math.cos(t) * L).toFixed(1)} ${(y1 + Math.sin(t) * L).toFixed(1)}`;
  };
  return {
    body: `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    headA: h(0.5, wob(head, 9, head * 0.18)),
    headB: h(-0.5, wob(head, 10, head * 0.18)),
  };
}

// Number wheel: for each digit of the target, how many steps its strip travels (cycles full turns + digit).
export const wheelStops = (value, cycles = 0) =>
  [...String(value)].map((ch) => (/\d/.test(ch) ? {digit: true, stops: cycles * 10 + Number(ch), ch} : {digit: false, ch}));
