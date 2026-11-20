// A gold coin flips in real 3D and settles, the number lands beside it (@remotion/three: React Three Fiber, WebGL).
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {Box, GraphicProps, OUT, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const ThreeCoin: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const D = Math.round(Math.min(r[3], r[2] * 0.42));
  const k = k01(lf, 0, 34, OUT), out = exitK(lf, dur);
  const spin = (1 - k) * Math.PI * 5;
  const text = String(it.value ?? it.text ?? '1');
  const fs = fit(text, r[2] - D - 20 * u, D * 0.5, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, width: D, height: D}}>
        <ThreeCanvas width={D} height={D} gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}} camera={{position: [0, 0, 6], fov: 36}}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[0, 0, 6]} intensity={2.2} />
          <directionalLight position={[3, 4, 5]} intensity={2.8} />
          <pointLight position={[-4, -2, 3]} intensity={30} color="#F2B45A" />
          <group rotation={[0.25, spin + Math.sin(lf / 18) * 0.12, 0]} scale={0.6 + 0.4 * k}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.5, 1.5, 0.22, 96]} />
              <meshStandardMaterial color="#D6892A" metalness={0.55} roughness={0.32} />
            </mesh>
            <mesh position={[0, 0, 0.115]}>
              <torusGeometry args={[1.22, 0.05, 16, 96]} />
              <meshStandardMaterial color="#F2B45A" metalness={0.6} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, -0.115]}>
              <torusGeometry args={[1.22, 0.05, 16, 96]} />
              <meshStandardMaterial color="#F2B45A" metalness={0.6} roughness={0.25} />
            </mesh>
          </group>
        </ThreeCanvas>
      </div>
      <div style={{position: 'absolute', left: D + 16 * u, top: r[3] / 2 - fs * 0.7, ...type(st, fs, ink), opacity: k01(lf, 20, 30), fontVariantNumeric: 'tabular-nums'}}>{text}</div>
      {it.unit && <div style={{position: 'absolute', left: D + 18 * u, top: r[3] / 2 + fs * 0.45, ...caps(st, Math.max(10, fs * 0.22), st.accentHi), opacity: k01(lf, 24, 34)}}>{String(it.unit)}</div>}
    </Box>
  );
};
export default ThreeCoin;
