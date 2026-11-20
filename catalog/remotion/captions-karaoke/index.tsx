// One line of words, lit one by one in time (@remotion/captions createTikTokStyleCaptions). With "words" from
// work/words.json (startMs/endMs) it follows your real timing; without, the words share the graphic's time.
import React, {useMemo} from 'react';
import {createTikTokStyleCaptions} from '@remotion/captions';
import {Box, GraphicProps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const CaptionsKaraoke: React.FC<GraphicProps> = ({it, r, lf, dur, fps, st, ink, scrim, u}) => {
  const words: string[] = String(it.text || 'say it in words').split(/\s+/).filter(Boolean);
  const span = ((dur - 12) / fps) * 1000;
  const caps0 = it.words || words.map((t, i) => ({text: (i ? ' ' : '') + t, startMs: (i / words.length) * span, endMs: ((i + 1) / words.length) * span, timestampMs: null, confidence: null}));
  const {pages} = useMemo(() => createTikTokStyleCaptions({captions: caps0, combineTokensWithinMilliseconds: 1200}), [JSON.stringify(caps0)]);
  const ms = (lf / fps) * 1000;
  const page = pages.filter((p) => p.startMs <= ms).pop() || pages[0];
  const fs = fit(page.text, r[2] * 0.96, r[3] * 0.56, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: k01(lf, 0, 6) * (1 - exitK(lf, dur))}}>
      <div style={{position: 'absolute', left: 0, top: (r[3] - fs * 1.2) / 2, ...type(st, fs, ink)}}>
        {page.tokens.map((t, i) => {
          const on = ms >= t.fromMs, now = on && ms < t.toMs;
          return (
            <span key={i} style={{whiteSpace: 'pre', color: now ? st.accentHi : on ? ink : 'rgba(235,226,210,0.28)', borderBottom: now ? `${2 * u}px solid ${st.accent}` : `${2 * u}px solid transparent`}}>
              {t.text}
            </span>
          );
        })}
      </div>
    </Box>
  );
};
export default CaptionsKaraoke;
