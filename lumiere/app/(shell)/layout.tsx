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
    }}>
      <div style={{ paddingBottom: 100 }}>{children}</div>
      <BottomNav t={t} />
      <Splash />
    </div>
  );
}
