'use client';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';

export default function HomePage() {
  const { theme: t } = useTweaks();
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '8px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 20,
        }}>
          <span>lumiere</span>
          <span>vol. iii · no. 001</span>
          <span>apr. 19</span>
        </div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 56, lineHeight: 0.9,
          color: t.cream, letterSpacing: -2,
        }}>
          the<br/><span style={{ fontStyle: 'italic', color: t.signal }}>log</span>book
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontSize: 17, fontStyle: 'italic',
          color: t.creamDim, marginTop: 16,
        }}>the log is open. describe what you saw.</div>
      </div>

      <div style={{ padding: '32px 20px' }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 10,
        }}>§ getting started</div>
        <Link href="/search" style={{
          display: 'block', padding: '18px 0', textAlign: 'center',
          background: t.cream, color: t.bg, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 3,
          textTransform: 'uppercase', textDecoration: 'none',
        }}>search the archive →</Link>
      </div>
    </div>
  );
}
