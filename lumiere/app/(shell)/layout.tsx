'use client';
import { BottomNav } from '@/app/components/ui/BottomNav';
import { Splash } from '@/app/components/ui/Splash';
import { LegalFooterLinks } from '@/app/components/ui/LegalPage';
import { SignedOutNotice } from '@/app/components/ui/SignedOutNotice';
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
      }}>
        <SignedOutNotice t={t} />
        {children}
        {/* Impressum has to be reachable from every page */}
        <footer style={{ padding: '32px 20px 8px', borderTop: `1px solid ${t.lineSoft}`, marginTop: 24 }}>
          <LegalFooterLinks />
        </footer>
      </div>
      <BottomNav t={t} />
      <Splash />
    </div>
  );
}
