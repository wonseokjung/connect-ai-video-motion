// A hologram projected from your hand: a real 3D object (@remotion/three, three.js) spins over a glowing platform,
// a light beam runs from your palm to it, scan lines drift through it. The hand is measured every frame; the
// hologram stands in the clear space next to the hand (never on your face or body) and moves with it.
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {GraphicProps, caps, exitK, fit, hueOf, k01, OUT, SNAP, type} from '../../../src/catalog/ui';

const PalmHologram: React.FC<GraphicProps> = ({it, r, lf, dur, st, u, L, mainF}) => {
  const tr = L?.track?.[(mainF ?? 0) - (L?.f0 ?? 0)];
  const a = tr?.anchor;
  const col = hueOf(it, '#38E8FF'), col2 = '#B26BFF';
  const out = exitK(lf, dur);
  const k = k01(lf, 0, 16, SNAP);
  const text = it.text ? String(it.text) : '';
  const D = Math.round(Math.min(r[2], r[3] * 0.78));
  const ox = r[0] + (r[2] - D) / 2, oy = r[1];
  const base = [r[0] + r[2] / 2, oy + D * 0.98];
  const fs = text ? fit(text, r[2] * 1.1, r[3] * 0.14, st.weight, st.tracking) : 0;
  const spin = lf * 0.06;
  // beam polygon: palm point -> platform edges
  const pw = D * 0.42 * k;
  const beam = a ? `${a[0]},${a[1]} ${base[0] - pw},${base[1]} ${base[0] + pw},${base[1]}` : '';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <linearGradient id="phBeam" gradientUnits="userSpaceOnUse" x1={a?.[0] ?? 0} y1={a?.[1] ?? 0} x2={base[0]} y2={base[1]}>
            <stop offset="0" stopColor={col} stopOpacity={0.05} />
            <stop offset="1" stopColor={col} stopOpacity={0.45} />
          </linearGradient>
          <radialGradient id="phDisc">
            <stop offset="0" stopColor={col} stopOpacity={0.9} />
            <stop offset="0.6" stopColor={col} stopOpacity={0.25} />
            <stop offset="1" stopColor={col} stopOpacity={0} />
          </radialGradient>
        </defs>
        {a && <polygon points={beam} fill="url(#phBeam)" opacity={k} />}
        {a && <circle cx={a[0]} cy={a[1]} r={7 * u * (1 + 0.3 * Math.sin(lf / 2.5))} fill="#fff" style={{filter: `drop-shadow(0 0 ${10 * u}px ${col})`}} opacity={k} />}
        <ellipse cx={base[0]} cy={base[1]} rx={D * 0.46 * k} ry={D * 0.09 * k} fill="url(#phDisc)" />
        <ellipse cx={base[0]} cy={base[1]} rx={D * 0.46 * k} ry={D * 0.09 * k} fill="none" stroke={col} strokeWidth={2 * u} />
        <ellipse cx={base[0]} cy={base[1]} rx={D * 0.3 * k * (1 + 0.15 * Math.sin(lf / 4))} ry={D * 0.06 * k} fill="none" stroke={col2} strokeWidth={1.5 * u} opacity={0.8} />
      </svg>
      <div style={{position: 'absolute', left: ox, top: oy, width: D, height: D, opacity: k01(lf, 4, 14), filter: `drop-shadow(0 0 ${14 * u}px ${col})`}}>
        <ThreeCanvas width={D} height={D} gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}} camera={{position: [0, 0, 6], fov: 40}}>
          <ambientLight intensity={0.6} />
          <pointLight position={[3, 3, 5]} intensity={60} color={col} />
          <pointLight position={[-3, -2, 4]} intensity={50} color={col2} />
          <group rotation={[0.4 + Math.sin(lf / 20) * 0.2, spin, 0]} scale={0.3 + 0.7 * k01(lf, 2, 20, OUT)} position={[0, Math.sin(lf / 9) * 0.12, 0]}>
            <mesh>
              <icosahedronGeometry args={[1.5, 0]} />
              <meshStandardMaterial color={col} emissive={col2} emissiveIntensity={0.35} metalness={0.3} roughness={0.25} transparent opacity={0.55} />
            </mesh>
            <mesh scale={1.18}>
              <icosahedronGeometry args={[1.5, 1]} />
              <meshBasicMaterial color={col} wireframe transparent opacity={0.9} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, spin * 1.7]}>
              <torusGeometry args={[2.25, 0.03, 8, 96]} />
              <meshBasicMaterial color={col2} />
            </mesh>
          </group>
        </ThreeCanvas>
        {/* scan lines */}
        <div style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(0deg, rgba(56,232,255,0.10) 0px, rgba(56,232,255,0.10) ${2 * u}px, transparent ${2 * u}px, transparent ${7 * u}px)`, backgroundPositionY: lf * 2 * u, maskImage: 'radial-gradient(circle, black 45%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 70%)'}} />
      </div>
      {text && <div style={{position: 'absolute', left: r[0] - r[2] * 0.05, width: r[2] * 1.1, top: base[1] + D * 0.12, textAlign: 'center', ...caps(st, fs * 0.7, col), opacity: k01(lf, 12, 22)}}>{text}</div>}
    </div>
  );
};
export default PalmHologram;
