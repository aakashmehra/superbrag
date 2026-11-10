import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {
  BrandBg, Camera, Caret, Check, Cursor, DarkBg, Img, PaleBg, Pop, Rise, SearchIcon, Sfx, Stars,
  Em, asset, useBrand, useCard, useCue, useFg, useHead, useSpring, useTyped,
} from './ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type S<P> = React.FC<{p: P; dur: number}>;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const KEYS = ['keypress-001.wav', 'keypress-002.wav', 'keypress-003.wav', 'keypress-004.wav', 'keypress-005.wav', 'keypress-006.wav'];
const first = (s?: string) => (s ?? '').split(/\s+/)[0] ?? '';

/* 1. search: a search box types the customer's query, suggestions drop in. */
export const SearchScene: S<{title?: string; query: string; suggestions?: string[]}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const fg = useFg();
  const start = 6, fpc = 1.7;
  const {shown} = useTyped(p.query, start, fpc);
  const typedEnd = start + p.query.length * fpc;
  return (
    <AbsoluteFill>
      <BrandBg />
      <Camera dur={Math.min(dur, 55)} from={1.3} to={1} origin="28% 28%">
        <AbsoluteFill style={{alignItems: 'center'}}>
          {p.title && (
            <Rise delay={typedEnd} style={{position: 'absolute', top: 92, color: fg.color, ...hs, fontSize: 66, textShadow: fg.shadow}}>
              <Em text={p.title} on="brand" />
            </Rise>
          )}
          <div style={{...cs, position: 'absolute', top: 215, width: 1180, minHeight: 470, overflow: 'hidden', fontFamily: b.fonts.ui}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 24, height: 122, padding: '0 44px', fontSize: 50, color: b.ink, borderBottom: '1px solid #edf0f4'}}>
              <SearchIcon size={42} color={b.primary} />
              <span>{shown}<Caret h={54} color={b.ink} /></span>
            </div>
            <div style={{padding: '14px 0'}}>
              {(p.suggestions ?? []).map((s, i) => (
                <Rise key={i} delay={typedEnd + 4 + i * 4} y={12}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '0 50px', height: 76, fontSize: 34, color: '#5f6672'}}>
                    <SearchIcon size={26} color="#9aa1ab" />{s}
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      </Camera>
      {p.query.split('').map((c, i) => (c === ' ' ? null : <Sfx key={i} at={start + i * fpc} src={KEYS[i % KEYS.length]} volume={0.32} />))}
    </AbsoluteFill>
  );
};

/* 2. results (dark): the business is buried under ads / competitors. */
export const ResultsScene: S<{query: string; results: {title: string; sub?: string}[]; title: string; pill?: string}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const cue = useCue();
  const pillAt = cue(first(p.title), 14) + 10;
  return (
    <AbsoluteFill>
      <DarkBg />
      <Camera dur={Math.min(dur, 45)} from={1.35} to={1} origin="20% 30%">
        <Rise delay={2} style={{position: 'absolute', left: 96, top: 70, color: '#fff', ...hs, fontSize: 64}}><Em text={p.title} on="dark" /></Rise>
        <div style={{position: 'absolute', left: 96, right: 96, top: 180, bottom: 90, background: `color-mix(in srgb, ${b.dark ?? '#121212'} 90%, white)`, border: `1px solid color-mix(in srgb, ${b.dark ?? '#121212'} 82%, white)`, borderRadius: 30, padding: 40, fontFamily: b.fonts.ui}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, background: `${b.dark ?? '#121212'}`, borderRadius: 18, height: 84, padding: '0 30px', color: '#eee', fontSize: 36}}>
            <SearchIcon size={32} color="#9aa0a6" />{p.query}
          </div>
          {p.results.map((r, i) => (
            <Rise key={i} delay={4 + i * 5} y={16} style={{padding: '30px 10px 0', opacity: i === p.results.length - 1 ? 0.55 : 1}}>
              <div style={{color: '#8ab4f8', fontSize: 38, fontWeight: 500}}>{r.title}</div>
              {r.sub && <div style={{color: '#71767d', fontSize: 24, marginTop: 6}}>{r.sub}</div>}
            </Rise>
          ))}
          {p.pill && (
            <Pop delay={pillAt} from={0.8} style={{position: 'absolute', left: 40, right: 40, bottom: 40, display: 'flex', justifyContent: 'center'}}>
              <div style={{width: '100%', textAlign: 'center', border: `1.5px solid color-mix(in srgb, ${b.dark ?? '#121212'} 75%, white)`, background: `${b.dark ?? '#121212'}`, borderRadius: 999, padding: '20px 0', color: '#fff', fontSize: 34, fontWeight: 700}}>{p.pill}</div>
            </Pop>
          )}
        </div>
      </Camera>
      <Sfx at={0} src="impactSoft_heavy_003.ogg" volume={0.5} />
      {p.pill && <Sfx at={pillAt} src="drop_002.ogg" volume={0.4} />}
    </AbsoluteFill>
  );
};

/* 3. cost (dark): a receipt where the business keeps less than it should. */
export const CostScene: S<{title: string; label?: string; items: {name: string; price: string}[]; totalLabel: string; total: string; keep: string; cut: string; cutCue?: string}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const cue = useCue();
  const frame = useCurrentFrame();
  const totalAt = 14;
  const shrinkAt = cue(p.cutCue ?? 'commission', Math.round(dur * 0.55));
  const w = interpolate(frame, [shrinkAt, shrinkAt + 16], [100, 70], {...clamp, easing: Easing.bezier(0.5, 0, 0.2, 1)});
  return (
    <AbsoluteFill>
      <DarkBg />
      <Camera dur={dur} from={1} to={1.06} origin="50% 60%">
        <Rise delay={2} style={{position: 'absolute', left: 96, top: 70, color: '#fff', ...hs, fontSize: 64}}><Em text={p.title} on="dark" /></Rise>
        <div style={{position: 'absolute', left: 96, right: 96, top: 180, background: `color-mix(in srgb, ${b.dark ?? '#121212'} 90%, white)`, border: `1px solid color-mix(in srgb, ${b.dark ?? '#121212'} 82%, white)`, borderRadius: 30, padding: '44px 54px', fontFamily: b.fonts.ui, color: '#fff'}}>
          {p.label && <div style={{color: '#7c8088', fontSize: 22, letterSpacing: 3, fontWeight: 600, textTransform: 'uppercase'}}>{p.label}</div>}
          {p.items.map((it, i) => (
            <Rise key={i} delay={4 + i * 4} y={10} style={{display: 'flex', justifyContent: 'space-between', fontSize: 36, marginTop: 22}}>
              <span>{it.name}</span><span style={{color: '#8b9097'}}>{it.price}</span>
            </Rise>
          ))}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 46}}>
            <span style={{color: '#8b9097', fontSize: 32}}>{p.totalLabel}</span>
            <Pop delay={totalAt} from={0.7}><span style={{fontSize: 88, fontWeight: 800, fontFamily: b.fonts.head}}>{p.total}</span></Pop>
          </div>
          <div style={{position: 'relative', marginTop: 34, height: 74, borderRadius: 999, background: 'rgba(255,255,255,0.1)'}}>
            <div style={{position: 'absolute', inset: 0, width: `${w}%`, borderRadius: 999, background: b.highlight, display: 'flex', alignItems: 'center', padding: '0 30px', color: '#111', fontSize: 30, fontWeight: 700}}>{p.keep}</div>
          </div>
          <div style={{textAlign: 'right', marginTop: 16, fontSize: 30, fontWeight: 600, color: '#c9ccd1', opacity: interpolate(frame, [shrinkAt + 6, shrinkAt + 16], [0, 1], clamp)}}>− {p.cut}</div>
        </div>
      </Camera>
      <Sfx at={totalAt} src="click2.ogg" volume={0.4} />
      <Sfx at={shrinkAt} src="switch_002.ogg" volume={0.5} />
    </AbsoluteFill>
  );
};

/* 4. meet: photo card + avatar badge, name and role reveal on the spoken words. */
export const MeetScene: S<{photo: string; avatar?: string; kicker?: string; name: string; role?: string; place?: string; tagline?: string}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const fg = useFg();
  const cue = useCue();
  const s = useSpring(0, {damping: 16, stiffness: 120});
  const nameAt = cue(first(p.name), 10);
  const roleAt = cue(first(p.role), nameAt + 18);
  const placeAt = cue(p.place ?? '', roleAt + 14);
  const tagAt = cue(first(p.tagline), placeAt + 16);
  return (
    <AbsoluteFill>
      <BrandBg />
      <Camera dur={dur} from={1} to={1.05} origin="40% 50%">
        <div style={{position: 'absolute', left: 110, top: 130, width: 600, height: 800, transform: `translateY(${(1 - s) * 160}px) rotate(${-10 + 6 * s}deg)`, opacity: Math.min(1, s * 2)}}>
          <div style={{width: '100%', height: '100%', background: '#fff', borderRadius: 30, padding: 12, boxShadow: '0 40px 90px rgba(0,30,80,.35)'}}>
            <Img src={asset(p.photo)} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20}} />
          </div>
          {p.avatar && (
            <Pop delay={nameAt + 6} from={0.3} style={{position: 'absolute', right: -40, bottom: -36}}>
              <div style={{width: 160, height: 160, borderRadius: 40, background: '#cfe3fb', border: '8px solid #fff', boxShadow: '0 16px 40px rgba(0,30,80,.3)', overflow: 'hidden'}}>
                <Img src={asset(p.avatar)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
            </Pop>
          )}
        </div>
        <div style={{position: 'absolute', left: 850, top: 280, right: 60, color: fg.color, fontFamily: b.fonts.ui}}>
          {p.kicker && <Rise delay={2} style={{fontSize: 52, fontWeight: 600, opacity: 0.9}}>{p.kicker}</Rise>}
          <Rise delay={nameAt} y={36} style={{...hs, fontSize: 146, lineHeight: 1.08}}><Em text={p.name} on="brand" /></Rise>
          {p.role && (
            <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 24, fontSize: 60, fontWeight: 600, whiteSpace: 'nowrap'}}>
              <Rise delay={roleAt}>{p.role}</Rise>
              {p.place && (
                <Pop delay={placeAt} from={0.4}>
                  <span style={{background: b.accent, color: b.ink, borderRadius: 999, padding: '4px 26px', fontWeight: 700}}>{p.place}</span>
                </Pop>
              )}
            </div>
          )}
          {p.tagline && <Rise delay={tagAt} style={{marginTop: 36, fontSize: 52, lineHeight: 1.3, opacity: 0.85, maxWidth: 960}}>{p.tagline}</Rise>}
        </div>
      </Camera>
      <Sfx at={2} src="card-slide-1.ogg" volume={0.45} />
      {p.avatar && <Sfx at={nameAt + 6} src="click2.ogg" volume={0.45} />}
      {p.place && <Sfx at={placeAt} src="bong_001.ogg" volume={0.5} />}
    </AbsoluteFill>
  );
};

/* 5. browser: the real site screenshot + a product panel that does the job (order, book, apply, quote). */
export const BrowserScene: S<{screenshot: string; tab?: string; panel: {title: string; items?: {name: string; price?: string}[]; chips?: string[]; extra?: {image?: string; title: string; sub?: string}; highlight?: {label: string; value: string; cue?: string}; button?: string}}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const cue = useCue();
  const frame = useCurrentFrame();
  const pn = p.panel;
  const chips = pn.chips ?? [];
  const chipAt: number[] = [];
  chips.forEach((c, i) => chipAt.push(Math.max(cue(c, 22 + i * Math.round((dur * 0.45) / Math.max(1, chips.length))), i ? chipAt[i - 1] + 10 : 0)));
  const active = chipAt.reduce((a, f, i) => (frame >= f ? i : a), -1);
  const extraAt = chips.length ? chipAt[chips.length - 1] + 6 : 30;
  const hiAt = pn.highlight ? cue(pn.highlight.cue ?? pn.highlight.label, Math.round(dur * 0.7)) : 0;
  const panelIn = useSpring(8, {damping: 18, stiffness: 110});
  return (
    <AbsoluteFill>
      <PaleBg />
      <Camera dur={dur} from={0.94} to={1.2} origin="80% 55%">
        <div style={{position: 'absolute', left: 110, top: 120, width: 1400, height: 840, ...cs, overflow: 'hidden'}}>
          <div style={{height: 50, background: '#f5f6f8', display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: '1px solid #e7e9ee'}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
            <span style={{marginLeft: 18, fontFamily: b.fonts.ui, fontSize: 20, color: '#7a808a'}}>{p.tab}</span>
          </div>
          <Img src={asset(p.screenshot)} style={{width: '100%', height: 790, objectFit: 'cover', objectPosition: 'top'}} />
        </div>
        <div style={{position: 'absolute', left: 1190, top: 200, width: 620, ...cs, padding: 38, fontFamily: b.fonts.ui, color: b.ink, opacity: panelIn, transform: `translateX(${(1 - panelIn) * 140}px)`}}>
          <div style={{fontSize: 40, fontWeight: 700}}>{pn.title}</div>
          {(pn.items ?? []).map((it, i) => (
            <Rise key={i} delay={16 + i * 5} y={10} style={{display: 'flex', justifyContent: 'space-between', fontSize: 30, marginTop: 16}}>
              <span>{it.name}</span><span style={{color: '#6b7280'}}>{it.price}</span>
            </Rise>
          ))}
          {chips.length > 0 && (
            <div style={{display: 'flex', gap: 10, marginTop: 26}}>
              {chips.map((c, i) => (
                <span key={c} style={{fontSize: 26, fontWeight: 600, padding: '8px 20px', borderRadius: 999, background: i === active ? b.primary : '#f1f3f6', color: i === active ? '#fff' : b.ink}}>{c}</span>
              ))}
            </div>
          )}
          {pn.extra && frame >= extraAt && (
            <Rise delay={extraAt} y={10} style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 22}}>
              {pn.extra.image && <Img src={asset(pn.extra.image)} style={{width: 84, height: 58, objectFit: 'cover', borderRadius: 10}} />}
              <div>
                <div style={{fontSize: 26, fontWeight: 700}}>{pn.extra.title}</div>
                {pn.extra.sub && <div style={{fontSize: 21, color: '#6b7280'}}>{pn.extra.sub}</div>}
              </div>
            </Rise>
          )}
          {pn.highlight && (
            <Pop delay={hiAt} from={0.85} style={{marginTop: 22}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: b.highlight, borderRadius: 16, padding: '16px 24px', fontSize: 30, fontWeight: 600}}>
                <span>{pn.highlight.label}</span><span style={{fontSize: 42, fontWeight: 800}}>{pn.highlight.value}</span>
              </div>
            </Pop>
          )}
          {pn.button && <div style={{marginTop: 24, background: b.primary, color: '#fff', borderRadius: 999, textAlign: 'center', padding: '18px 0', fontSize: 30, fontWeight: 700}}>{pn.button}</div>}
        </div>
      </Camera>
      <Sfx at={8} src="card-slide-1.ogg" volume={0.45} />
      {chipAt.map((f, i) => <Sfx key={i} at={f} src="click_003.ogg" volume={0.6} />)}
      {pn.highlight && <Sfx at={hiAt} src="switch_002.ogg" volume={0.5} />}
    </AbsoluteFill>
  );
};

/* Map-pack tile for businesses without a photo: streets, a park, and a numbered pin. */
const MapTile: React.FC<{color: string}> = ({color}) => {
  const drop = useSpring(4, {damping: 10, stiffness: 140});
  const road = (s: React.CSSProperties) => <div style={{position: 'absolute', background: '#fff', boxShadow: '0 0 0 1px #dfe5ec', ...s}} />;
  return (
    <div style={{position: 'relative', width: '100%', height: 340, borderRadius: 18, overflow: 'hidden', background: '#eef2f6'}}>
      <div style={{position: 'absolute', left: 430, top: 40, width: 220, height: 150, borderRadius: 30, background: '#d7ecd9'}} />
      <div style={{position: 'absolute', left: -40, top: 230, width: 300, height: 160, borderRadius: 40, background: '#d4e6f7'}} />
      {road({left: 0, right: 0, top: 120, height: 18, transform: 'rotate(-8deg)'})}
      {road({left: 0, right: 0, top: 250, height: 12})}
      {road({top: 0, bottom: 0, left: 210, width: 16, transform: 'rotate(12deg)'})}
      {road({top: 0, bottom: 0, left: 560, width: 12})}
      {[[150, 200, '2'], [620, 250, '3']].map(([x, y, n]) => (
        <div key={n as string} style={{position: 'absolute', left: x as number, top: y as number, width: 40, height: 40, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: '#9aa3ad', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <span style={{transform: 'rotate(45deg)', fontSize: 20, fontWeight: 700}}>{n}</span>
        </div>
      ))}
      <div style={{position: 'absolute', left: 360, top: 90 - (1 - drop) * 80, width: 74, height: 74, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: color, boxShadow: '0 10px 24px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, drop * 2)}}>
        <span style={{transform: 'rotate(45deg)', color: '#fff', fontSize: 34, fontWeight: 800}}>1</span>
      </div>
    </div>
  );
};

/* 6. answer: the business ranks #1 and an AI answer recommends it. */
export const AnswerScene: S<{query: string; result: {image?: string; rank?: string; name: string; meta?: string; rating?: number; ratingLabel?: string}; below?: string; aiLabel?: string; answer: string; source?: {icon?: string; label: string}}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const r = p.result;
  const start = 16;
  const fpc = Math.max(0.7, Math.min(1.8, (dur * 0.55) / p.answer.length));
  const {shown, done, n} = useTyped(p.answer, start, fpc);
  const doneAt = start + p.answer.length * fpc;
  return (
    <AbsoluteFill>
      <PaleBg />
      <Camera dur={dur} from={1} to={1.05}>
        <div style={{position: 'absolute', left: 140, top: 100, width: 1640, height: 880, ...cs, overflow: 'hidden', fontFamily: b.fonts.ui, color: b.ink}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 22, height: 112, padding: '0 46px', fontSize: 44, borderBottom: '1px solid #eef1f5'}}>
            <SearchIcon size={38} color={b.primary} />{p.query}
          </div>
          <div style={{display: 'flex', height: 768}}>
            <div style={{width: 820, padding: '36px 46px', position: 'relative'}}>
              {r.image ? <Img src={asset(r.image)} style={{width: '100%', height: 340, objectFit: 'cover', borderRadius: 18}} /> : <MapTile color={b.primary} />}
              <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 26}}>
                {r.rank && <Pop delay={6}><span style={{background: b.primary, color: '#fff', fontSize: 28, fontWeight: 800, borderRadius: 12, padding: '2px 14px'}}>{r.rank}</span></Pop>}
                <span style={{fontSize: 50, fontWeight: 800}}>{r.name}</span>
              </div>
              {r.meta && <div style={{fontSize: 24, color: '#6b7280', marginTop: 6}}>{r.meta}</div>}
              {r.rating != null && (
                <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, fontSize: 32, fontWeight: 600}}>
                  <Stars n={Math.round(r.rating)} size={30} />{r.ratingLabel ?? `${r.rating} on Google`}
                </div>
              )}
              {p.below && <div style={{position: 'absolute', left: 46, right: 46, bottom: 34, paddingTop: 22, borderTop: '1px solid #eef1f5', fontSize: 26, color: '#8a9099'}}>{p.below}</div>}
            </div>
            <div style={{flex: 1, margin: '36px 46px 36px 0', background: b.paper ? `color-mix(in srgb, ${b.paper} 70%, white)` : '#f3f7fc', borderRadius: 24, padding: 40, position: 'relative'}}>
              <span style={{background: b.highlight, borderRadius: 999, padding: '6px 18px', fontSize: 26, fontWeight: 700}}>✦ {p.aiLabel ?? 'AI answer'}</span>
              <div style={{fontSize: 42, lineHeight: 1.4, marginTop: 30}}>{shown}{!done && <Caret h={44} color={b.primary} />}</div>
              {p.source && (
                <Rise delay={doneAt + 4} style={{position: 'absolute', left: 40, bottom: 36, display: 'flex', alignItems: 'center', gap: 14, color: b.primary, fontSize: 28, fontWeight: 600}}>
                  {p.source.icon && <Img src={asset(p.source.icon)} style={{width: 40, height: 40, borderRadius: 10, objectFit: 'cover'}} />}
                  {p.source.label}
                </Rise>
              )}
            </div>
          </div>
        </div>
      </Camera>
      {r.rank && <Sfx at={6} src="click2.ogg" volume={0.45} />}
      {Array.from({length: Math.floor(n / 4)}, (_, i) => <Sfx key={i} at={start + i * 4 * fpc} src={KEYS[i % KEYS.length]} volume={0.12} />)}
      {p.source && <Sfx at={doneAt + 4} src="bong_001.ogg" volume={0.35} />}
    </AbsoluteFill>
  );
};

/* 7. quote: the offer on paper — checklist ticks, stamp slams, signature writes itself. */
export const QuoteScene: S<{title: string; forLabel?: string; checks: string[]; priceLabel?: string; price: string; stamp?: string; signature?: string; signNote?: string; signCue?: string}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const cue = useCue();
  const frame = useCurrentFrame();
  const checkAt = p.checks.map((_, i) => 8 + i * Math.round((dur * 0.35) / Math.max(1, p.checks.length)));
  const stampAt = cue(p.price, Math.round(dur * 0.3)) + 6;
  const signAt = cue(p.signCue ?? 'writing', Math.round(dur * 0.5));
  const ink = interpolate(frame, [signAt, signAt + 30], [100, 0], {...clamp, easing: Easing.inOut(Easing.quad)});
  return (
    <AbsoluteFill>
      <PaleBg />
      <Camera dur={dur} from={1} to={1.05} origin="60% 55%">
        <div style={{position: 'absolute', left: 200, top: 110, width: 1520, height: 860, ...cs, borderTop: `12px solid ${b.primary}`, padding: '70px 90px', fontFamily: b.fonts.ui, color: b.ink}}>
          <Rise delay={2} style={{...hs, fontSize: Math.min(100, 1500 / Math.max(1, p.title.replace(/\*/g, '').length)), lineHeight: 1.05, maxWidth: 860}}><Em text={p.title} on="paper" /></Rise>
          {p.forLabel && <Rise delay={5} style={{fontSize: 30, color: '#7a808a', marginTop: 12}}>{p.forLabel}</Rise>}
          <div style={{marginTop: 64}}>
            {p.checks.map((c, i) => (
              <Pop key={i} delay={checkAt[i]} from={0.9} style={{display: 'flex', alignItems: 'center', gap: 22, fontSize: 38, marginTop: i ? 26 : 0, transformOrigin: 'left center'}}>
                <span style={{width: 44, height: 44, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Check size={30} color="#15803d" /></span>
                {c}
              </Pop>
            ))}
          </div>
          <div style={{position: 'absolute', left: 1000, top: 80, width: 460}}>
            {p.priceLabel && <div style={{fontSize: 22, letterSpacing: 4, color: '#8a9099', fontWeight: 700, textTransform: 'uppercase'}}>{p.priceLabel}</div>}
            <Rise delay={4} style={{fontFamily: b.fonts.head, fontSize: Math.min(128, 820 / Math.max(1, p.price.length)), fontWeight: 800, color: b.primary, lineHeight: 1.05, whiteSpace: 'nowrap'}}>{p.price}</Rise>
            {p.stamp && (
              <Pop delay={stampAt} from={1.8} style={{display: 'inline-block', marginTop: 18}}>
                <div style={{transform: 'rotate(-7deg)', background: b.highlight, border: `4px solid ${b.ink}`, borderRadius: 12, padding: '8px 26px', fontSize: 46, fontWeight: 800, letterSpacing: 1}}>{p.stamp}</div>
              </Pop>
            )}
            {p.signature && (
              <div style={{position: 'absolute', top: 430, left: 0, width: 460}}>
                <div style={{fontFamily: b.fonts.script, fontSize: Math.min(108, 1100 / Math.max(1, p.signature.length)), fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', clipPath: `inset(0 ${ink}% 0 0)`}}>{p.signature}</div>
                <div style={{height: 2, background: '#c9ced6', marginTop: 6}} />
                {p.signNote && <div style={{fontSize: 28, marginTop: 14, opacity: interpolate(frame, [signAt + 20, signAt + 32], [0, 1], clamp)}}>{p.signNote}</div>}
              </div>
            )}
          </div>
        </div>
      </Camera>
      {checkAt.map((f, i) => <Sfx key={i} at={f} src="click_003.ogg" volume={0.55} />)}
      {p.stamp && <Sfx at={stampAt} src="impactSoft_medium_001.ogg" volume={0.7} />}
    </AbsoluteFill>
  );
};

/* 8. payoff: tagline with highlighted word; the opening search turns into the result (order placed / booked / hired). */
export const PayoffScene: S<{headline: string; highlight?: string; query: string; toast: {title: string; sub?: string; meta?: string}}> = ({p, dur}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const fg = useFg();
  const cue = useCue();
  const frame = useCurrentFrame();
  const hiAt = cue(p.highlight ?? '', Math.round(dur * 0.45));
  const morph = Math.max(14, hiAt - 6);
  // headline + search start together in the middle; at the morph they slide up (search fades away),
  // the headline settles at the top, and the result pops up from the middle into the space they left
  const slide = useSpring(morph, {damping: 200, stiffness: 120});
  const pop = useSpring(morph + 4, {damping: 13, stiffness: 150});
  const headTop = interpolate(slide, [0, 1], [330, 110]);
  return (
    <AbsoluteFill>
      <BrandBg />
      <Camera dur={dur} from={1} to={1.04}>
        <div style={{position: 'absolute', top: headTop, left: 0, right: 0, textAlign: 'center', color: fg.color, ...hs, fontSize: 72, textShadow: fg.shadow}}>
          <Rise delay={2}><Em text={p.headline} on="brand" /></Rise>
          {p.highlight && (
            <Pop delay={hiAt} from={0.4} style={{marginTop: 18, display: 'inline-block'}}>
              <span style={{background: b.highlight, color: b.ink, borderRadius: 16, padding: '2px 30px', textShadow: 'none'}}>{p.highlight}</span>
            </Pop>
          )}
        </div>
        <Rise delay={6} style={{position: 'absolute', left: 0, right: 0, top: headTop + 150, display: 'flex', justifyContent: 'center', opacity: Math.max(0, 1 - slide * 1.6), transform: `scale(${1 - 0.08 * slide})`, fontFamily: b.fonts.ui, color: b.ink}}>
          <div style={{...cs, borderRadius: 999, width: 1000, height: 124, display: 'flex', alignItems: 'center', gap: 24, padding: '0 50px', fontSize: 48}}>
            <SearchIcon size={42} color={b.primary} />{p.query}
          </div>
        </Rise>
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', fontFamily: b.fonts.ui, color: b.ink, opacity: Math.min(1, pop * 1.5), transform: `translateY(${(1 - pop) * 70}px) scale(${0.86 + 0.14 * pop})`}}>
          <div style={{...cs, width: 1080, display: 'flex', alignItems: 'center', gap: 40, padding: '50px 60px'}}>
            <div style={{width: 136, height: 136, borderRadius: 68, background: b.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><Check size={72} color={b.ink} stroke={3.2} /></div>
            <div>
              <div style={{...hs, fontSize: 68}}>{p.toast.title}</div>
              {p.toast.sub && <div style={{fontSize: 36, marginTop: 4}}>{p.toast.sub}</div>}
              {p.toast.meta && <div style={{fontSize: 27, color: '#7a808a', marginTop: 8}}>{p.toast.meta}</div>}
            </div>
          </div>
        </div>
      </Camera>
      <Sfx at={morph} src="chime_soft.wav" volume={0.3} />
    </AbsoluteFill>
  );
};

/* 9. end: avatar, name, CTA button that gets clicked, URL. */
export const EndScene: S<{avatar?: string; name: string; button: string; url?: string}> = ({p}) => {
  const b = useBrand();
  const cs = useCard();
  const hs = useHead();
  const fg = useFg();
  const frame = useCurrentFrame();
  const clickAt = 46;
  const mv = interpolate(frame, [16, clickAt - 4], [0, 1], {...clamp, easing: Easing.bezier(0.3, 0, 0.1, 1)});
  const press = interpolate(frame, [clickAt, clickAt + 3, clickAt + 9], [1, 0.93, 1], clamp);
  return (
    <AbsoluteFill>
      <BrandBg />
      <AbsoluteFill style={{alignItems: 'center', fontFamily: b.fonts.ui}}>
        {p.avatar && (
          <Pop delay={2} from={0.3} style={{position: 'absolute', top: 170}}>
            <div style={{width: 176, height: 176, borderRadius: 40, border: '7px solid #fff', background: '#cfe3fb', overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,30,80,.3)'}}>
              <Img src={asset(p.avatar)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </div>
          </Pop>
        )}
        <Rise delay={6} y={30} style={{position: 'absolute', top: 380, color: fg.color, ...hs, fontSize: 184, textShadow: fg.shadow}}><Em text={p.name} on="brand" /></Rise>
        <Pop delay={12} from={0.6} style={{position: 'absolute', top: 640}}>
          <div style={{transform: `scale(${press})`, background: fg.btnBg, color: fg.btnFg, borderRadius: 999, padding: '26px 76px', fontSize: 66, fontWeight: 700, boxShadow: '0 14px 40px rgba(0,30,80,.25)'}}>{p.button}</div>
        </Pop>
        {p.url && <Rise delay={clickAt + 8} style={{position: 'absolute', top: 820, color: fg.color, fontSize: 48, fontWeight: 500, opacity: 0.9}}>{p.url}</Rise>}
        <div style={{position: 'absolute', left: interpolate(mv, [0, 1], [1480, 1010]), top: interpolate(mv, [0, 1], [1010, 718]), opacity: interpolate(frame, [14, 18], [0, 1], clamp)}}>
          <Cursor size={54} />
        </div>
      </AbsoluteFill>
      <Sfx at={clickAt} src="click2.ogg" volume={0.6} />
    </AbsoluteFill>
  );
};

/* phone: an app screen in a real phone frame, with a headline and feature chips that pop on the spoken words.
   For apps (and mobile-first products). bg: brand (sky/soft/light), paper (site page colour) or dark. */
export const PhoneScene: S<{phone: string; kicker?: string; title: string; big?: string; points?: string[]; icon?: string; side?: 'left' | 'right'; bg?: 'brand' | 'paper' | 'dark'}> = ({p, dur}) => {
  const b = useBrand();
  const hs = useHead();
  const fg = useFg();
  const cue = useCue();
  const frame = useCurrentFrame();
  const bg = p.bg ?? 'paper';
  const color = bg === 'dark' ? '#fff' : bg === 'brand' ? fg.color : b.ink;
  const on = bg === 'dark' ? 'dark' : bg === 'brand' ? 'brand' : 'paper';
  const chipBg = bg === 'paper' ? `color-mix(in srgb, ${b.primary} 12%, white)` : 'rgba(255,255,255,0.16)';
  const chipFg = bg === 'paper' ? b.ink : '#fff';
  const left = (p.side ?? 'left') === 'left';
  const enter = useSpring(0, {damping: 16, stiffness: 110});
  const float = Math.sin((frame / 30) * 1.4) * 8;
  const pts = p.points ?? [];
  const ptAt: number[] = [];
  pts.forEach((t, i) => ptAt.push(Math.max(cue(first(t), 18 + i * 14), i ? ptAt[i - 1] + 8 : 10)));
  return (
    <AbsoluteFill>
      {bg === 'dark' ? <DarkBg /> : bg === 'brand' ? <BrandBg /> : <PaleBg />}
      <Camera dur={dur} from={1} to={1.04} origin={left ? '30% 50%' : '70% 50%'}>
        <Img src={asset(p.phone)} style={{position: 'absolute', height: 960, top: 60, left: left ? 300 : 1140, transform: `translateY(${(1 - enter) * 260 + float}px) rotate(${(1 - enter) * (left ? -6 : 6)}deg)`, opacity: Math.min(1, enter * 2), filter: 'drop-shadow(0 40px 60px rgba(0,20,60,0.28))'}} />
        <div style={{position: 'absolute', top: 0, bottom: 0, left: left ? 900 : 130, width: 860, display: 'flex', flexDirection: 'column', justifyContent: 'center', color, fontFamily: b.fonts.ui}}>
          {p.icon && <Pop delay={4} from={0.4}><Img src={asset(p.icon)} style={{width: 132, height: 132, borderRadius: 30, boxShadow: '0 16px 40px rgba(0,20,60,.25)', marginBottom: 26}} /></Pop>}
          {p.kicker && <Rise delay={6} style={{fontSize: 46, fontWeight: 600, opacity: 0.75}}>{p.kicker}</Rise>}
          {p.big && <Pop delay={6} from={0.6} style={{...hs, fontSize: 300, lineHeight: 0.9, transformOrigin: 'left bottom'}}><Em text={p.big} on={on} /></Pop>}
          <Rise delay={8} style={{...hs, fontSize: 96, lineHeight: 1.05, marginTop: 8}}><Em text={p.title} on={on} /></Rise>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 40}}>
            {pts.map((t, i) => (
              <Pop key={i} delay={ptAt[i]} from={0.6}>
                <span style={{display: 'inline-block', background: chipBg, color: chipFg, borderRadius: 999, padding: '12px 30px', fontSize: 40, fontWeight: 600}}>{t}</span>
              </Pop>
            ))}
          </div>
        </div>
      </Camera>
      <Sfx at={2} src="card-slide-1.ogg" volume={0.4} />
      {ptAt.map((f, i) => <Sfx key={i} at={f} src="click2.ogg" volume={0.4} />)}
    </AbsoluteFill>
  );
};

export const SCENES: Record<string, S<any>> = {
  phone: PhoneScene,
  search: SearchScene, results: ResultsScene, cost: CostScene, meet: MeetScene, browser: BrowserScene,
  answer: AnswerScene, quote: QuoteScene, payoff: PayoffScene, end: EndScene,
};
