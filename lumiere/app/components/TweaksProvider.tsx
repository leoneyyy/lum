'use client';
import React from 'react';
import type { Theme, ThemeKey, Voice, DimKey } from '@/app/components/lib/tokens';
import { LumiereThemes, DEFAULT_DIMS } from '@/app/components/lib/tokens';
import type { CryStyle } from '@/app/components/ui/CryMeter';

export interface Tweaks {
  theme: ThemeKey;
  cryStyle: CryStyle;
  voice: Voice;
  dims: DimKey[];
}

const DEFAULT_TWEAKS: Tweaks = {
  theme: 'indigo',
  cryStyle: 'bar',
  voice: 'dry',
  dims: DEFAULT_DIMS.map(d => d.key) as DimKey[],
};

interface Ctx {
  tweaks: Tweaks;
  setTweaks: (fn: (prev: Tweaks) => Tweaks) => void;
  theme: Theme;
}

const TweaksContext = React.createContext<Ctx | null>(null);

export function TweaksProvider({ children }: { children: React.ReactNode }) {
  const [tweaks, setTweaksState] = React.useState<Tweaks>(DEFAULT_TWEAKS);

  // hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lumiere:tweaks');
      if (saved) setTweaksState({ ...DEFAULT_TWEAKS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const setTweaks = React.useCallback((fn: (prev: Tweaks) => Tweaks) => {
    setTweaksState(prev => {
      const next = fn(prev);
      try { localStorage.setItem('lumiere:tweaks', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const theme = LumiereThemes[tweaks.theme];

  return (
    <TweaksContext.Provider value={{ tweaks, setTweaks, theme }}>
      {children}
    </TweaksContext.Provider>
  );
}

export function useTweaks(): Ctx {
  const v = React.useContext(TweaksContext);
  if (!v) throw new Error('useTweaks must be inside TweaksProvider');
  return v;
}
