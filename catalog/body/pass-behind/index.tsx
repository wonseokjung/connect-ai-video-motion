// A real 3D object (three.js) flies through the room and passes BEHIND you, Free-Guy style: it enters on one side at
// head height, disappears behind your head and shoulders (person matte in front) and comes out on the other side,
// leaving a light trail. The height follows your measured face, so it always crosses right behind you.
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate} from 'remotion';
import {GraphicProps, HUE, caps, clamp, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {rigAt} from '../../../src/catalog/rig';

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const PassBehind: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W, H}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const col = hueOf(it, HUE.goldHi), glow = HUE.coral, core = HUE.teal;
  const ltr = it.from !== 'right';
  // where to cross: at the height of the eyes when the graphic starts (steady path, no jitter)
  const r0 = rigAt(L, 0, 12);
  const fy = r0?.face ? r0.face[1] + r0.face[3] * 0.45 : H * 0.38;
  const D = Math.round(Math.min(W, H) * 0.34);
  const t = ease(interpolate(lf, [0, dur * 0.92], [0, 1], clamp));
  const x = ltr ? -D * 0.6 + (W + D * 1.2) * t : W + D * 0.6 - (W + D * 1.2) * t;
  const y = fy - D * 0.15 * Math.sin(Math.PI * t) + Math.sin(lf / 8) * 6 * u;
  const sc = 0.85 + 0.3 * Math.sin(Math.PI * t); // a little closer in the middle
  const dir = ltr ? -1 : 1;
  const trail = D * 2.6 * Math.min(1, t * 4);
  const out = exitK(lf, dur, 6);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <linearGradient id="pbTrail" gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={x + dir * trail} y2={y}>
            <stop offset="0" stopColor={col} stopOpacity={0.85} />
            <stop offset="0.4" stopColor={glow} stopOpacity={0.35} />
            <stop offset="1" stopColor={glow} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={`${x},${y - D * 0.2 * sc} ${x + dir * trail},${y - 2 * u} ${x + dir * trail},${y + 2 * u} ${x},${y + D * 0.2 * sc}`} fill="url(#pbTrail)" />
        <line x1={x} y1={y} x2={x + dir * trail * 1.15} y2={y} stroke="#FFF3DC" strokeWidth={2 * u} opacity={0.8} />
      </svg>
      <div style={{position: 'absolute', left: x - (D * sc) / 2, top: y - (D * sc) / 2, width: D * sc, height: D * sc, filter: `drop-shadow(0 0 ${24 * u}px ${glow})`}}>
        <ThreeCanvas width={D} height={D} style={{width: '100%', height: '100%'}} gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}} camera={{position: [0, 0, 6], fov: 38}}>
          <ambientLight intensity={0.5} />
          <pointLight position={[4, 4, 6]} intensity={90} color="#FFFFFF" />
          <pointLight position={[-4, -2, 3]} intensity={60} color={glow} />
          <pointLight position={[0, 0, 0]} intensity={30} color={core} />
          <group rotation={[0.5, lf * 0.07 * -dir, 0.25]}>
            {/* gold shell with cut windows, a glowing core inside, a ring around it */}
            <mesh>
              <sphereGeometry args={[1.1, 48, 48]} />
              <meshStandardMaterial color={core} emissive={core} emissiveIntensity={1.4} />
            </mesh>
            <mesh>
              <icosahedronGeometry args={[1.55, 1]} />
              <meshStandardMaterial color={col} metalness={0.95} roughness={0.22} wireframe={false} flatShading transparent opacity={0.55} />
            </mesh>
            <mesh scale={1.01}>
              <icosahedronGeometry args={[1.55, 1]} />
              <meshBasicMaterial color={col} wireframe />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0, lf * 0.05]}>
              <torusGeometry args={[2.25, 0.06, 16, 120]} />
              <meshStandardMaterial color={col} metalness={1} roughness={0.15} emissive={glow} emissiveIntensity={0.3} />
            </mesh>
          </group>
        </ThreeCanvas>
      </div>
      {it.text && (
        <div style={{position: 'absolute', left: x + dir * D * 0.55 * sc - (ltr ? 260 * u : 0), width: 260 * u, textAlign: ltr ? 'right' : 'left', top: y + D * 0.32 * sc, ...caps(st, 22 * u, col), textShadow: `0 0 ${14 * u}px ${glow}`, opacity: k01(lf, 6, 16)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default PassBehind;
