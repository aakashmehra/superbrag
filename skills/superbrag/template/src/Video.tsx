import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {SCENES} from './scenes';
import {Brand, BrandCtx, FontLoader, SceneStartCtx, Word, WordsCtx} from './ui';

export type Scene = {type: string; start: number; dur: number; enter?: 'cut' | 'slide' | 'blur'; words: Word[]; props: Record<string, unknown>};
export type Props = {
  brand: Brand;
  scenes: Scene[];
  voice?: string;                        // public-relative path, e.g. "voice.wav"
  music?: {src: string; volume: number}; // public-relative path
  speech: [number, number][];            // frames where the voice is talking (music ducks there)
  durationInFrames: number;
};

const T = 12; // transition length in frames

const Transition: React.FC<{enter: string; exit?: string; dur: number; children: React.ReactNode}> = ({enter, exit, dur, children}) => {
  const f = useCurrentFrame();
  const c = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  let x = 0, blur = 0, opacity = 1;
  if (enter === 'slide') x += interpolate(f, [0, T], [1920, 0], {...c, easing: (t) => 1 - (1 - t) ** 3});
  if (enter === 'blur') { opacity = interpolate(f, [0, T], [0, 1], c); blur += interpolate(f, [0, T], [18, 0], c); }
  if (exit === 'slide') x += interpolate(f, [dur, dur + T], [0, -1920], {...c, easing: (t) => 1 - (1 - t) ** 3});
  if (exit === 'blur') blur += interpolate(f, [dur, dur + T], [0, 18], c);
  return <AbsoluteFill style={{transform: `translateX(${x}px)`, filter: blur ? `blur(${blur}px)` : undefined, opacity}}>{children}</AbsoluteFill>;
};

const duckAt = (f: number, speech: [number, number][]) =>
  speech.reduce((v, [a, b]) => Math.min(v, interpolate(f, [a - 8, a, b, b + 12], [1, 0.38, 0.38, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})), 1);

export const Video: React.FC<Props> = ({brand, scenes, voice, music, speech, durationInFrames}) => (
  <BrandCtx.Provider value={brand}>
    <FontLoader fonts={brand.fonts} />
    <AbsoluteFill style={{background: '#000'}}>
      {scenes.map((s, i) => {
        const Comp = SCENES[s.type];
        if (!Comp) throw new Error(`Unknown scene type "${s.type}". Use one of: ${Object.keys(SCENES).join(', ')}`);
        const next = scenes[i + 1];
        const exit = next && next.enter && next.enter !== 'cut' ? next.enter : undefined;
        return (
          <Sequence key={i} from={s.start} durationInFrames={s.dur + (exit ? T : 0)} premountFor={30} name={`${i + 1}. ${s.type}`}>
            <Transition enter={i === 0 ? 'cut' : s.enter ?? 'cut'} exit={exit} dur={s.dur}>
              <SceneStartCtx.Provider value={s.start}>
                <WordsCtx.Provider value={s.words}>
                  <Comp p={s.props} dur={s.dur} />
                </WordsCtx.Provider>
              </SceneStartCtx.Provider>
            </Transition>
          </Sequence>
        );
      })}
      {voice && <Audio src={staticFile(voice)} />}
      {music && (
        <Audio
          src={staticFile(music.src)}
          volume={(f) => music.volume * duckAt(f, speech) * interpolate(f, [0, 6, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      )}
    </AbsoluteFill>
  </BrandCtx.Provider>
);
