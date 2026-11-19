// Code-drawn stand-in footage for the samples. Our own work (CC0, see NOTICE). No real person; an illustrated front-facing presenter.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {pose, SCREEN} from './motion.mjs';
import {FONT} from '../brand';

export type StandInProps = {variant: string; env?: number[]; audio?: string; matte?: boolean; seconds?: number};

const Person: React.FC<{p: ReturnType<typeof pose>; matte?: boolean}> = ({p, matte}) => {
  // front-facing illustrated person: bright face oval, hair, neck, shoulders, sweater. Warm key light from the left.
  const neckY = p.cy + p.hh * 0.4;
  const sh = p.shoulder;
  const shY = neckY + p.hh * 0.36;
  const body = `M ${p.cx - p.hw * 0.19} ${neckY + 10} C ${p.cx - p.hw * 0.22} ${shY - 30}, ${p.cx - sh * 0.34} ${shY - 22}, ${p.cx - sh / 2} ${shY + 50}
    L ${p.cx - sh * 0.52} ${p.H + 10} L ${p.cx + sh * 0.52} ${p.H + 10} L ${p.cx + sh / 2} ${shY + 50}
    C ${p.cx + sh * 0.34} ${shY - 22}, ${p.cx + p.hw * 0.22} ${shY - 30}, ${p.cx + p.hw * 0.19} ${neckY + 10} Z`;
  const rot = `rotate(${p.tilt} ${p.cx} ${p.cy + p.hh / 2})`;
  if (matte)
    return (
      <g fill="#fff">
        <path d={body} />
        <ellipse cx={p.cx} cy={p.cy} rx={p.hw / 2} ry={p.hh / 2} transform={rot} />
      </g>
    );
  const ex = p.hw * 0.19, ey = p.cy - p.hh * 0.02, er = p.hw * 0.045;
  const mo = 4 + p.mouth * p.hh * 0.07;
  return (
    <g>
      <defs>
        <radialGradient id="skin" cx="0.38" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#F6D3B4" />
          <stop offset="0.6" stopColor="#E3AF8A" />
          <stop offset="1" stopColor="#B9805E" />
        </radialGradient>
        <linearGradient id="neck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B57B5A" />
          <stop offset="1" stopColor="#D9A27E" />
        </linearGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#E9DCC6" />
          <stop offset="0.55" stopColor="#C9B79A" />
          <stop offset="1" stopColor="#8E7E66" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A3426" />
          <stop offset="1" stopColor="#1E1510" />
        </linearGradient>
      </defs>
      <rect x={p.cx - p.hw * 0.19} y={neckY - 20} width={p.hw * 0.38} height={p.hh * 0.5} fill="url(#neck)" />
      <path d={body} fill="url(#shirt)" />
      <path d={`M ${p.cx - p.hw * 0.24} ${neckY + 18} Q ${p.cx} ${neckY + p.hh * 0.3} ${p.cx + p.hw * 0.24} ${neckY + 18}`} fill="none" stroke="#A6937A" strokeWidth={6} />
      <g transform={rot}>
        <ellipse cx={p.cx - p.hw * 0.5} cy={p.cy + p.hh * 0.03} rx={p.hw * 0.07} ry={p.hh * 0.09} fill="#D79C78" />
        <ellipse cx={p.cx + p.hw * 0.5} cy={p.cy + p.hh * 0.03} rx={p.hw * 0.07} ry={p.hh * 0.09} fill="#B9805E" />
        <ellipse cx={p.cx} cy={p.cy} rx={p.hw / 2} ry={p.hh / 2} fill="url(#skin)" />
        <path d={`M ${p.cx - p.hw * 0.53} ${p.cy - p.hh * 0.02} C ${p.cx - p.hw * 0.6} ${p.cy - p.hh * 0.62}, ${p.cx + p.hw * 0.6} ${p.cy - p.hh * 0.66}, ${p.cx + p.hw * 0.53} ${p.cy - p.hh * 0.04}
          C ${p.cx + p.hw * 0.44} ${p.cy - p.hh * 0.3}, ${p.cx + p.hw * 0.1} ${p.cy - p.hh * 0.34}, ${p.cx - p.hw * 0.12} ${p.cy - p.hh * 0.3}
          C ${p.cx - p.hw * 0.34} ${p.cy - p.hh * 0.26}, ${p.cx - p.hw * 0.46} ${p.cy - p.hh * 0.18}, ${p.cx - p.hw * 0.53} ${p.cy - p.hh * 0.02} Z`} fill="url(#hair)" />
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M ${p.cx + s * ex - er * 2.2} ${ey - er * 2.6} Q ${p.cx + s * ex} ${ey - er * 3.6} ${p.cx + s * ex + er * 2.2} ${ey - er * 2.8}`} stroke="#3A281D" strokeWidth={er * 0.7} fill="none" strokeLinecap="round" />
            {p.blink ? (
              <line x1={p.cx + s * ex - er * 1.3} y1={ey} x2={p.cx + s * ex + er * 1.3} y2={ey} stroke="#2A1D15" strokeWidth={er * 0.5} strokeLinecap="round" />
            ) : (
              <g>
                <ellipse cx={p.cx + s * ex} cy={ey} rx={er * 1.35} ry={er} fill="#FBF4EC" />
                <circle cx={p.cx + s * ex} cy={ey} r={er * 0.75} fill="#3B2A1F" />
                <circle cx={p.cx + s * ex - er * 0.25} cy={ey - er * 0.3} r={er * 0.22} fill="#fff" />
              </g>
            )}
          </g>
        ))}
        <path d={`M ${p.cx - er * 0.4} ${ey + p.hh * 0.08} Q ${p.cx + er * 0.9} ${ey + p.hh * 0.16} ${p.cx - er * 0.3} ${ey + p.hh * 0.19}`} stroke="#B97E5C" strokeWidth={er * 0.4} fill="none" strokeLinecap="round" />
        <ellipse cx={p.cx} cy={p.cy + p.hh * 0.28} rx={p.hw * 0.11} ry={mo / 2} fill="#7A3B33" />
        <path d={`M ${p.cx - p.hw * 0.12} ${p.cy + p.hh * 0.27} Q ${p.cx} ${p.cy + p.hh * 0.3} ${p.cx + p.hw * 0.12} ${p.cy + p.hh * 0.27}`} stroke="#9C5348" strokeWidth={er * 0.4} fill="none" strokeLinecap="round" />
        <ellipse cx={p.cx - p.hw * 0.27} cy={p.cy + p.hh * 0.16} rx={p.hw * 0.08} ry={p.hh * 0.04} fill="#E88E7A" opacity={0.25} />
        <ellipse cx={p.cx + p.hw * 0.27} cy={p.cy + p.hh * 0.16} rx={p.hw * 0.08} ry={p.hh * 0.04} fill="#E88E7A" opacity={0.25} />
      </g>
    </g>
  );
};

// a fake app on a monitor, for the screen-explain sample
const Screen: React.FC<{f: number}> = ({f}) => {
  const [x, y, w, h] = SCREEN.panel;
  const d = SCREEN.deploy, lg = SCREEN.log, st = SCREEN.settings;
  const logLines = 6;
  return (
    <g>
      <rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx={18} fill="#060606" />
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#14181b" />
      <rect x={x} y={y} width={w} height={44} rx={8} fill="#1c2226" />
      {[0, 1, 2].map((i) => <circle key={i} cx={x + 26 + i * 22} cy={y + 22} r={7} fill={['#E0605A', '#E3B04A', '#5DBB63'][i]} />)}
      <text x={x + 120} y={y + 29} fill="#8a96a0" fontSize={18} fontFamily={FONT}>app.example / dashboard</text>
      <rect x={x} y={y + 44} width={250} height={h - 44} fill="#11151a" />
      {['Overview', 'Builds', 'Domains', 'Settings'].map((t, i) => (
        <text key={t} x={x + 34} y={y + 110 + i * 60 + (t === 'Settings' ? 160 : 0)} fill={i === 0 ? '#e8eef2' : '#7d8992'} fontSize={22} fontFamily={FONT}>{t}</text>
      ))}
      <text x={x + 290} y={y + 120} fill="#e8eef2" fontSize={40} fontWeight={300} fontFamily={FONT}>Dashboard</text>
      <rect x={d[0]} y={d[1]} width={d[2]} height={d[3]} rx={8} fill="#2F6FA8" />
      <text x={d[0] + d[2] / 2} y={d[1] + 37} textAnchor="middle" fill="#fff" fontSize={22} fontFamily={FONT}>Deploy</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={x + 290 + i * 245} y={y + 170} width={225} height={120} rx={8} fill="#1a2025" />
          <rect x={x + 310 + i * 245} y={y + 196} width={80} height={12} rx={4} fill="#3b464e" />
          <rect x={x + 310 + i * 245} y={y + 226} width={130} height={30} rx={4} fill={['#3FB7A6', '#E08A2E', '#8FB7E0'][i]} opacity={0.8} />
        </g>
      ))}
      <polyline fill="none" stroke="#3FB7A6" strokeWidth={3} points={Array.from({length: 24}, (_, i) => `${x + 300 + i * 30},${y + 400 - Math.sin(i * 0.6 + f * 0.02) * 26 - i * 2}`).join(' ')} />
      <rect x={lg[0]} y={lg[1]} width={lg[2]} height={lg[3]} rx={8} fill="#0d1013" stroke="#26303a" />
      {Array.from({length: logLines}, (_, i) => {
        const shown = Math.min(logLines, Math.floor(f / 20) % (logLines + 4));
        return i < shown ? <rect key={i} x={lg[0] + 24} y={lg[1] + 22 + i * 32} width={200 + ((i * 137) % 480)} height={12} rx={4} fill={i === shown - 1 ? '#5DBB63' : '#36424c'} /> : null;
      })}
      <rect x={st[0] - 8} y={st[1] - 30} width={st[2]} height={st[3]} rx={6} fill="none" stroke="#2a3440" />
    </g>
  );
};

export const StandIn: React.FC<StandInProps> = ({variant, env, audio, matte}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pose(variant, f / fps, env, fps);
  const screen = variant === 'screen20';
  if (matte)
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <svg width={1920} height={1080}><Person p={p} matte /></svg>
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{background: '#2C6F6A'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 85% at 50% 38%, #4E9C94 0%, #2F716B 50%, #173E3B 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 18% 26%, rgba(255,214,160,0.45) 0%, rgba(255,214,160,0.12) 30%, transparent 52%)'}} />
      {!screen && (
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <rect x={1480} y={560} width={360} height={14} fill="#1E4642" />
          <rect x={1520} y={440} width={84} height={120} rx={6} fill="#C68A4A" opacity={0.7} />
          <rect x={1630} y={480} width={56} height={80} rx={6} fill="#E7DCC8" opacity={0.6} />
        </svg>
      )}
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {screen && <Screen f={f} />}
        <Person p={p} />
        <rect x={0} y={1000} width={1920} height={80} fill="#6B4A32" />
        <rect x={0} y={1000} width={1920} height={6} fill="#A87A52" />
      </svg>
      <div style={{position: 'absolute', right: 40, top: 30, fontFamily: FONT, fontWeight: 300, fontSize: 18, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.7)'}}>SAMPLE FOOTAGE · STAND-IN</div>
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
