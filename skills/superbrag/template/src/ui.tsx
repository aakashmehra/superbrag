import React, {createContext, useContext, useEffect, useState} from 'react';
import {
  AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, random,
  spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

// ---------- types ----------
export type Brand = {
  name: string;
  url: string;
  primary: string;      // main brand colour (sky background, buttons, links)
  accent: string;       // pill / badge colour (e.g. the yellow "Japan" pill)
  highlight: string;    // lime-style highlight (What you keep, AI answer, stamps)
  ink: string;          // dark text
  background: 'sky' | 'soft' | 'light'; // sky = clouds (only for sky-themed brands); soft = flat brand colour; light = the site's own pale page colour
  paper?: string;       // page colour for background "light" (e.g. the site's cream #faf7f2)
  dark?: string;        // background of the dark "problem" scenes (default #121212; use the site's dark/ink tone)
  style?: {             // the site's design language (capture.mjs -> site.json "design")
    radius?: number;    // card corner radius on the site, px (scaled up for 1080p)
    border?: string;    // card border colour, e.g. "#e7e0d6"; omit for borderless cards
    shadow?: 'lifted' | 'soft' | 'flat'; // lifted = deep drop shadow, soft = faint tinted shadow, flat = none
    tracking?: number;  // heading letter-spacing in em, e.g. -0.02
    headWeight?: number;// heading weight, e.g. 700
    emphasis?: string;  // colour for *emphasised* words in headlines (default primary)
  };
  fonts: {head: string; ui: string; script: string};
};
export type Word = {w: string; f: number}; // word + frame (relative to scene start)

// ---------- contexts ----------
export const BrandCtx = createContext<Brand>(null as unknown as Brand);
export const useBrand = () => useContext(BrandCtx);
export const WordsCtx = createContext<Word[]>([]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9¥$€£%]+/g, '');

/** cue("Japan") -> frame (scene-relative) when that word is spoken; fallback if not found. */
export const useCue = () => {
  const words = useContext(WordsCtx);
  return (needle: string, fallback: number) => {
    const n = needle.split(/\s+/).map(norm).filter(Boolean);
    if (!n.length) return fallback;
    for (let i = 0; i < words.length; i++) {
      if (n.every((x, k) => words[i + k] && norm(words[i + k].w).startsWith(x))) return words[i].f;
    }
    return fallback;
  };
};

export const asset = (p?: string) => (!p ? '' : /^(https?:|data:)/.test(p) ? p : staticFile(p));

// ---------- fonts ----------
export const FontLoader: React.FC<{fonts: Brand['fonts']}> = ({fonts}) => {
  const [handle] = useState(() => delayRender('Loading brand fonts'));
  useEffect(() => {
    const fams = [...new Set([fonts.head, fonts.ui, fonts.script])];
    const load = (fam: string, weights: string | null) =>
      new Promise<void>((resolve) => {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}${weights ? `:wght@${weights}` : ''}&display=block`;
        l.onload = () => resolve();
        l.onerror = () => (weights ? load(fam, null).then(resolve) : resolve()); // font without those weights: take the default
        document.head.appendChild(l);
      });
    Promise.all(fams.map((f) => load(f, '400;500;600;700;800')))
      .then(() => Promise.all(fams.flatMap((f) => [`400 40px "${f}"`, `700 40px "${f}"`].map((s) => document.fonts.load(s).catch(() => null)))))
      .then(() => continueRender(handle));
  }, [fonts, handle]);
  return null;
};

// ---------- motion helpers ----------
export const useSpring = (delay = 0, config: {damping?: number; stiffness?: number; mass?: number} = {damping: 200}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config});
};

/** Fade + rise in at `delay`. */
export const Rise: React.FC<{delay?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({delay = 0, y = 28, style, children}) => {
  const s = useSpring(delay);
  const {opacity = 1, transform = '', ...rest} = style ?? {};
  return <div style={{...rest, opacity: s * Number(opacity), transform: `translateY(${(1 - s) * y}px) ${transform}`}}>{children}</div>;
};

/** Springy pop (scale overshoot) at `delay`. */
export const Pop: React.FC<{delay?: number; from?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({delay = 0, from = 0.5, style, children}) => {
  const s = useSpring(delay, {damping: 11, stiffness: 160});
  const o = useSpring(delay, {damping: 200});
  const {opacity = 1, transform = '', ...rest} = style ?? {};
  return <div style={{...rest, opacity: o * Number(opacity), transform: `scale(${from + (1 - from) * s}) ${transform}`}}>{children}</div>;
};

/** Typewriter: returns visible slice of text. */
export const useTyped = (text: string, start: number, framesPerChar = 1.6) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) / framesPerChar)));
  return {shown: text.slice(0, n), done: n >= text.length, n};
};

export const Caret: React.FC<{color?: string; h?: number}> = ({color = '#1f6feb', h = 44}) => {
  const frame = useCurrentFrame();
  return <span style={{display: 'inline-block', width: 3, height: h, marginLeft: 3, verticalAlign: 'middle', background: color, opacity: Math.floor(frame / 15) % 2 ? 0 : 1}} />;
};

/** Slow camera move for the whole scene: scale + pan between two keyframes. */
export const Camera: React.FC<{from?: number; to?: number; x?: [number, number]; y?: [number, number]; origin?: string; dur: number; children: React.ReactNode}> = ({from = 1, to = 1.04, x = [0, 0], y = [0, 0], origin = '50% 50%', dur, children}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.2, 1)});
  return (
    <AbsoluteFill style={{transform: `translate(${x[0] + (x[1] - x[0]) * t}px, ${y[0] + (y[1] - y[0]) * t}px) scale(${from + (to - from) * t})`, transformOrigin: origin}}>
      {children}
    </AbsoluteFill>
  );
};

// ---------- sfx ----------
export const Sfx: React.FC<{at: number; src: string; volume?: number}> = ({at, src, volume = 0.5}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${src}`)} volume={volume} />
  </Sequence>
);

// ---------- backgrounds ----------
// Sky: classic puffy cartoon clouds (domed bumps, flat base), pale and
// heavily blurred, spread evenly on a jittered grid, drifting slowly. Continuous across scene cuts.
const Cloud: React.FC<{w: number; seed: number}> = ({w, seed}) => {
  const r = (k: string) => random(`cloud${seed}-${k}`);
  // three bumps: small left, big middle, medium right (sizes jittered per cloud)
  const bumps = [
    {cx: 30 + r('a') * 4, r: 15 + r('b') * 3},
    {cx: 52 + r('c') * 4, r: 22 + r('d') * 4},
    {cx: 73 + r('e') * 4, r: 16 + r('f') * 3},
  ];
  return (
    <svg width={w} height={w * 0.55} viewBox="0 0 110 60" style={{filter: `blur(${(w * 0.022).toFixed(1)}px)`, overflow: 'visible', display: 'block'}}>
      <g fill="#ffffff">
        {bumps.map((b, i) => <circle key={i} cx={b.cx} cy={46 - b.r * 0.8} r={b.r} />)}
        <rect x="14" y="34" width="80" height="16" rx="8" />
      </g>
    </svg>
  );
};

/** Frame offset of the current scene, so the sky keeps drifting across cuts instead of restarting. */
export const SceneStartCtx = createContext(0);

const COLS = 4, ROWS = 3;
const CLOUDS = Array.from({length: COLS * ROWS}, (_, i) => {
  const r = (k: string) => random(`sky${i}-${k}`);
  const col = i % COLS, row = Math.floor(i / COLS);
  return {
    seed: i,
    w: 200 + r('w') ** 2 * 360,
    x0: (col + 0.15 + r('x') * 0.7) * (2400 / COLS) - 240,
    y: (row + 0.1 + r('y') * 0.7) * (1080 / ROWS) - 60,
    alpha: 0.62 + r('a') * 0.25,
    vx: 10 + r('v') * 10, // px/s, all drifting right
  };
});

export const Sky: React.FC = () => {
  const frame = useCurrentFrame() + useContext(SceneStartCtx);
  const {fps} = useVideoConfig();
  const b = useBrand();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: b.primary, overflow: 'hidden'}}>
      {CLOUDS.map((c) => (
        <div key={c.seed} style={{position: 'absolute', left: ((c.x0 + c.vx * t) % 2400 + 2400) % 2400 - 240, top: c.y, opacity: c.alpha}}>
          <Cloud w={c.w} seed={c.seed} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const Soft: React.FC = () => {
  const b = useBrand();
  return <AbsoluteFill style={{background: b.primary}} />;
};

/** The site's own page colour, flat (house rule: no gradients anywhere). */
export const Light: React.FC = () => <AbsoluteFill style={{background: useBrand().paper ?? '#f8f7f4'}} />;

/** Brand background: sky clouds, flat brand colour, or the site's flat page colour. No gradients. */
export const BrandBg: React.FC = () => {
  const bg = useBrand().background;
  return bg === 'sky' ? <Sky /> : bg === 'light' ? <Light /> : <Soft />;
};
/** Text colour + shadow for text sitting directly on BrandBg. */
export const useFg = () => {
  const b = useBrand();
  return b.background === 'light'
    ? {color: b.ink, shadow: 'none', btnBg: b.primary, btnFg: '#fff'}
    : {color: '#fff', shadow: '0 4px 24px rgba(0,40,100,.25)', btnBg: '#fff', btnFg: b.primary};
};
export const DarkBg: React.FC = () => <AbsoluteFill style={{background: useBrand().dark ?? '#121212'}} />;
/** Backdrop for the white-card scenes: the site's flat page colour when known, else a flat pale blue. */
export const PaleBg: React.FC = () => {
  const b = useBrand();
  return <AbsoluteFill style={{background: b.paper ?? '#f3f9fb'}} />;
};

// ---------- small UI atoms ----------
export const SearchIcon: React.FC<{size?: number; color?: string}> = ({size = 36, color = '#1f6feb'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </svg>
);

export const Check: React.FC<{size?: number; color?: string; stroke?: number}> = ({size = 28, color = '#111', stroke = 3}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
);

export const Stars: React.FC<{n?: number; size?: number}> = ({n = 5, size = 26}) => (
  <span style={{display: 'inline-flex', gap: 4}}>
    {Array.from({length: n}, (_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="#f5b301">
        <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
      </svg>
    ))}
  </span>
);

export const Cursor: React.FC<{size?: number}> = ({size = 46}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 2.5v17.2l4.6-4.4 2.9 6.6 2.6-1.1-2.8-6.5H18z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

/** Card style from the site's design language. */
export const useCard = (): React.CSSProperties => {
  const b = useBrand();
  const s = b.style ?? {};
  const shadow = {
    lifted: '0 30px 80px rgba(16,40,80,0.18), 0 4px 14px rgba(16,40,80,0.08)',
    soft: `0 30px 60px -14px ${b.primary}2e, 0 2px 8px rgba(0,0,0,0.04)`,
    flat: 'none',
  }[s.shadow ?? 'lifted'];
  return {background: '#fff', borderRadius: Math.round((s.radius ?? 18) * 1.5), border: s.border ? `1.5px solid ${s.border}` : undefined, boxShadow: shadow};
};

/** Heading style from the site: font, weight, tracking. */
export const useHead = (): React.CSSProperties => {
  const b = useBrand();
  return {fontFamily: b.fonts.head, fontWeight: b.style?.headWeight ?? 800, letterSpacing: `${b.style?.tracking ?? -0.02}em`};
};

/** Headline text where *words* are drawn in the emphasis colour (the site's two-tone headline style). */
export const Em: React.FC<{text: string; on?: 'brand' | 'dark' | 'paper'}> = ({text, on = 'paper'}) => {
  const b = useBrand();
  const base = b.style?.emphasis ?? b.primary;
  const color = on === 'dark' ? `color-mix(in srgb, ${base} 72%, white)` : on === 'brand' && b.background !== 'light' ? b.highlight : base;
  return <>{text.split(/(\*[^*]+\*)/).map((s, i) => (s.startsWith('*') && s.endsWith('*') ? <span key={i} style={{color}}>{s.slice(1, -1)}</span> : s))}</>;
};

export {Img};
