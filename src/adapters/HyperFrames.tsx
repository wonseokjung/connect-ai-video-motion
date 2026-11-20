// HyperFrames adapter: runs a HyperFrames block (HTML + CSS + a paused GSAP timeline in window.__timelines)
// inside Remotion, frame by frame. Same idea as @remotion/gsap: the timeline never plays on its own clock,
// every Remotion frame seeks it to frame / fps. Our own code; HyperFrames is Apache-2.0 (heygen-com/hyperframes).
//
// What the adapter does:
//  - takes the block's <template> (or body), drops CDN <script src> tags and gives the block the gsap that is
//    installed with the kit (work/vm-assets/gsap.min.js), so nothing is fetched from the internet
//  - runs it in its own <iframe> (its CSS and globals stay inside), transparent background
//  - puts your words into the block: meta.text = {"css selector": "plan field"}
//  - plays meta.window = [t0, t1] seconds of the block's timeline inside the graphic's time (stretched to fit)
//  - crops meta.crop = [x, y, w, h] of the block's canvas and scales it into the box the layout engine gave
//  - elements with data-start / data-duration (HyperFrames clips) are shown only in their time, like the HF runtime
// Blocks with WebGL, video, audio or their own requestAnimationFrame loop are marked unsupported by lib/hf-import.mjs.
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {assetName} from '../core/assets.mjs';
import {kindOf} from '../core/catalog.mjs';

// GSAP plugins a block loads from a CDN (SplitText, ScrambleTextPlugin, DrawSVGPlugin ...): the same files from the
// installed gsap package are copied to work/vm-assets/gsap-<Name>.min.js by lib/catalog-build.mjs
export const gsapPluginsIn = (html: string) => {
  const out: string[] = [];
  for (const m of html.matchAll(/<script[^>]*src=["'][^"']*gsap[^"']*\/(?:dist\/)?([A-Za-z0-9]+)\.min\.js["']/gi)) if (m[1] !== 'gsap' && !out.includes(m[1])) out.push(m[1]);
  return out;
};

const prepare = (html: string, gsapUrl: string, pluginUrl: (n: string) => string, text: Record<string, string>, values: Record<string, any>) => {
  const plugins = gsapPluginsIn(html);
  const tpl = html.match(/<template[^>]*>([\s\S]*)<\/template>/i);
  let body = tpl ? tpl[1] : (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html);
  body = body.replace(/<script[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, '');
  const head = (html.match(/<head[^>]*>([\s\S]*)<\/head>/i)?.[1] ?? '').replace(/<script[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, '').replace(/<link[^>]*>/gi, '');
  const fill = Object.entries(text || {})
    .map(([sel, field]) => (values[field] == null || values[field] === '' ? '' : `document.querySelectorAll(${JSON.stringify(sel)}).forEach(function(e){e.textContent=${JSON.stringify(String(values[field]))}});`))
    .join('');
  // compositions get their data-width / data-height as their real size (some blocks leave the root to its content), and your
  // words go in before the block's own script runs (so SplitText / scramble / counters use them)
  const size = `document.querySelectorAll('[data-composition-id][data-width]').forEach(function(e){var c=getComputedStyle(e);e.style.width=e.getAttribute('data-width')+'px';e.style.height=e.getAttribute('data-height')+'px';if(c.position==='static')e.style.position='relative';});`;
  const at = body.search(/<script/i);
  body = at >= 0 ? body.slice(0, at) + `<script>${size}${fill}</script>` + body.slice(at) : body + `<script>${size}${fill}</script>`;
  const libs = [gsapUrl, ...plugins.map(pluginUrl)].map((u) => `<script src="${u}"></script>`).join('');
  // same picture in every render tab: Math.random is seeded (mulberry32) from the block's text, and GSAP's own clock
  // is stopped so nothing plays by itself; the adapter seeks everything
  let seed = 2166136261;
  for (let i = 0; i < html.length; i += 97) seed = Math.imul(seed ^ html.charCodeAt(i), 16777619) >>> 0;
  const fixed = `<script>(function(){var a=${seed};Math.random=function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();</script>`;
  const stop = `<script>if(window.gsap){gsap.ticker.sleep();gsap.globalTimeline.pause();}</script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent!important;overflow:hidden}</style>${fixed}${head}${libs}${stop}</head><body>${body}<script>window.__vmReady=true;</script></body></html>`;
};

export const HyperFramesBlock: React.FC<any> = ({it, r, lf, dur, fps}) => {
  const mt = it.meta || {};
  const kind = kindOf(it.kind);
  const file = kind === 'hyperframes' ? assetName('hyperframes', it.src) : assetName(kind, mt.src);
  const [html, setHtml] = useState<string | null>(null);
  const [load] = useState(() => delayRender(`HyperFrames block ${file}`, {timeoutInMilliseconds: 30000}));
  const ifr = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const [readyHandle, setReadyHandle] = useState<number | null>(null);

  useEffect(() => {
    fetch(staticFile('vm-assets/' + file))
      .then((x) => {
        if (!x.ok) throw new Error(`${file}: ${x.status}`);
        return x.text();
      })
      .then((t) => setHtml(prepare(t, staticFile('vm-assets/gsap.min.js'), (n) => staticFile(`vm-assets/gsap-${n}.min.js`), mt.text || {}, it)))
      .catch((e) => {
        console.error('HyperFrames block failed', e);
        setHtml('<!doctype html><html><body></body></html>');
      });
  }, [file]);

  const canvas: number[] = mt.canvas || [1920, 1080];
  const crop: number[] = it.crop || mt.crop || [0, 0, canvas[0], canvas[1]]; // plan line "crop": [x, y, w, h] of the block's canvas (short words: crop tighter, they get bigger)
  const win: number[] = mt.window || [0, mt.blockDur || dur / fps];
  const k = Math.min(r[2] / crop[2], r[3] / crop[3]);
  const t = win[0] + Math.max(0, Math.min(1, lf / Math.max(1, dur - 1))) * (win[1] - win[0]);

  const seek = () => {
    const w: any = ifr.current?.contentWindow;
    if (!w || !w.__vmReady) return false;
    const tls = Object.values(w.__timelines || {}) as any[];
    // tweens made outside a named timeline live on GSAP's global timeline: seek that too
    try {
      if (w.gsap) w.gsap.globalTimeline.totalTime(t, true);
    } catch {}
    // CSS @keyframes / transitions / Web Animations run on the browser clock: hold them at the same time
    try {
      for (const a of w.document.getAnimations?.() || []) {
        a.pause();
        a.currentTime = t * 1000;
      }
    } catch {}
    for (const tl of tls) {
      try {
        tl.pause();
        tl.totalTime(Math.min(t, tl.totalDuration()), true); // suppress callbacks: same frame = same picture in any order
      } catch {}
    }
    // HyperFrames clips: shown only inside their own time
    w.document.querySelectorAll('[data-start]').forEach((e: any) => {
      if (e.hasAttribute('data-composition-id')) return;
      const s = parseFloat(e.getAttribute('data-start')), d = parseFloat(e.getAttribute('data-duration') || '1e9');
      e.style.visibility = t >= s && t < s + d ? '' : 'hidden';
    });
    return true;
  };

  useLayoutEffect(() => {
    if (!ready.current) return;
    const h = delayRender('seek HyperFrames');
    seek();
    const w: any = ifr.current?.contentWindow;
    (w?.requestAnimationFrame || requestAnimationFrame)(() => continueRender(h));
  }, [t, readyHandle]);

  return (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], overflow: 'hidden', pointerEvents: 'none'}}>
      {html && (
        <iframe
          ref={ifr}
          srcDoc={html}
          title={kind}
          onLoad={() => {
            ready.current = true;
            seek();
            const w: any = ifr.current?.contentWindow;
            const done = () => {
              setReadyHandle(Date.now());
              continueRender(load);
            };
            if (w?.document?.fonts?.ready) w.document.fonts.ready.then(done, done);
            else done();
          }}
          style={{position: 'absolute', left: (r[2] - crop[2] * k) / 2 - crop[0] * k, top: (r[3] - crop[3] * k) / 2 - crop[1] * k, width: canvas[0], height: canvas[1], border: 0, transform: `scale(${k})`, transformOrigin: '0 0', background: 'transparent', colorScheme: 'normal'}}
        />
      )}
    </div>
  );
};
