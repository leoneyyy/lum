'use client';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import { retryLog } from '@/app/components/lib/logStore';
import type { LogStatus } from '@/app/components/lib/logStore';

/** Stand-in for an empty log while it's still loading or failed to load. */
export function LogPending({ t, status }: { t: Theme; status: Exclude<LogStatus, 'loaded'> }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 17, color: t.creamDim,
      }}>
        {status === 'loading' ? 'reading the archive…' : 'couldn’t reach your log just now.'}
      </div>
      {status === 'error' && (
        <button onClick={retryLog} style={{
          marginTop: 16, padding: '10px 18px', cursor: 'pointer',
          background: 'transparent', color: t.cream, border: `1px solid ${t.cream}`,
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
        }}>try again</button>
      )}
    </div>
  );
}
