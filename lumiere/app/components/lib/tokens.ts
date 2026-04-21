// lib/tokens.ts — Lumiere design tokens

export type ThemeKey = 'indigo' | 'oxblood' | 'bone' | 'acid';

export interface Theme {
  bg: string;
  surface: string;
  surfaceHi: string;
  cream: string;
  creamDim: string;
  muted: string;
  line: string;
  lineSoft: string;
  accent: string;
  signal: string;
  danger: string;
}

export const LumiereThemes: Record<ThemeKey, Theme> = {
  indigo: {
    bg: '#0b0a14', surface: '#14122a', surfaceHi: '#1c1935',
    cream: '#ebe6d8', creamDim: '#c9c3b3', muted: '#8b85a8',
    line: 'rgba(235, 230, 216, 0.12)', lineSoft: 'rgba(235, 230, 216, 0.06)',
    accent: '#7a6bc2', signal: '#d4c5f9', danger: '#d96b5a',
  },
  oxblood: {
    bg: '#0d0707', surface: '#1a0f0f', surfaceHi: '#251515',
    cream: '#f0e8d8', creamDim: '#d4ccbc', muted: '#a08880',
    line: 'rgba(240, 232, 216, 0.12)', lineSoft: 'rgba(240, 232, 216, 0.06)',
    accent: '#c94a3f', signal: '#e89488', danger: '#c94a3f',
  },
  bone: {
    bg: '#ebe6d8', surface: '#f2efe5', surfaceHi: '#ffffff',
    cream: '#1a1820', creamDim: '#403d50', muted: '#6a6680',
    line: 'rgba(26, 24, 32, 0.12)', lineSoft: 'rgba(26, 24, 32, 0.06)',
    accent: '#4a3b7a', signal: '#4a3b7a', danger: '#b04030',
  },
  acid: {
    bg: '#0a0a0a', surface: '#141414', surfaceHi: '#1e1e1e',
    cream: '#f0f0f0', creamDim: '#c8c8c8', muted: '#7a7a7a',
    line: 'rgba(240, 240, 240, 0.12)', lineSoft: 'rgba(240, 240, 240, 0.06)',
    accent: '#d4f542', signal: '#d4f542', danger: '#ff5544',
  },
};

export const LumiereType = {
  display: "'DM Serif Display', 'Playfair Display', Georgia, serif",
  body: "'Cormorant Garamond', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export type Voice = 'dry' | 'poetic' | 'playful';

export const LumiereVoice: Record<Voice, {
  greeting: string[]; cryLow: string[]; cryMid: string[]; cryHigh: string[]; verdict: string[];
}> = {
  dry: {
    greeting: ['you watched something.', 'the log is open.', 'describe what you saw.', 'another one.'],
    cryLow: ['you felt nothing. noted.', 'dry as expected.', 'no tears. a choice.'],
    cryMid: ['a single tear. be honest.', 'contained. barely.', 'the throat tightened.'],
    cryHigh: ['you sobbed. the record reflects this.', 'undignified. documented.', 'you cried. we saw.'],
    verdict: ['you are developing a pattern.', 'your taste is suspicious today.', 'this says something about you.'],
  },
  poetic: {
    greeting: ['the evening has left its residue.', 'something was witnessed.', 'tell us what lingered.'],
    cryLow: ['the eyes stayed still tonight.', 'no water moved.', 'a quiet stillness.'],
    cryMid: ['a soft glisten at the corner.', 'you almost did.', 'the ache was real.'],
    cryHigh: ['the tears remembered themselves.', 'you were fully undone.', 'a full rain.'],
    verdict: ['tonight you were porous.', 'this one enters the bloodstream.', 'a memory forms.'],
  },
  playful: {
    greeting: ['oh this should be good.', 'confession time.', 'what did you DO.'],
    cryLow: ['dry-eyed king/queen behavior.', 'stone cold. respect.', 'no tears? brave.'],
    cryMid: ['a little teary little guy.', 'leaked a little. normal.', 'one (1) tear.'],
    cryHigh: ['you WEPT wept.', 'soaked through. iconic.', 'sobbing is a love language.'],
    verdict: ['okay main character energy.', 'this is your villain era isn\'t it.', 'noted and judged.'],
  },
};

export const DEFAULT_DIMS = [
  { key: 'plot', label: 'plot' },
  { key: 'characters', label: 'characters' },
  { key: 'visuals', label: 'visuals' },
  { key: 'score', label: 'score' },
  { key: 'pacing', label: 'pacing' },
  { key: 'originality', label: 'originality' },
  { key: 'dialogue', label: 'dialogue' },
  { key: 'vibe', label: 'vibe' },
  { key: 'rewatch', label: 'rewatch' },
  { key: 'ending', label: 'ending' },
] as const;

export type DimKey = typeof DEFAULT_DIMS[number]['key'];
