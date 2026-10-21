'use client';
import { BottomNav } from '@/app/components/ui/BottomNav';
import { Splash } from '@/app/components/ui/Splash';
import { useTweaks } from '@/app/components/TweaksProvider';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { theme: t } = useTweaks();
  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      background: t.bg, color: t.cream,
      // installed on a phone the page draws under the status bar
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
      }}>{children}</div>
      <BottomNav t={t} />
      <Splash />
    </div>
  );
}
