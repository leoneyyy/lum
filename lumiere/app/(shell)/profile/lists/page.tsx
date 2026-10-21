'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useLists, createList } from '@/app/components/lib/listsStore';

export default function ListsPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const auth = useAuth();
  const { lists, state } = useLists();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submitNew = async () => {
    setBusy(true);
    setErr(null);
    const r = await createList(name);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setName('');
    setCreating(false);
    if (r.id) router.push(`/profile/lists/${r.id}`);
  };

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ shelves</div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14,
          fontFamily: LumiereType.display, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.4,
        }}>
          <span style={{ fontSize: 48, fontStyle: 'italic', color: t.signal }}>lists</span>
          <span style={{ fontSize: 36, color: t.creamDim }}>{lists.length.toString().padStart(3, '0')}</span>
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {auth.status !== 'anon' && auth.status !== 'user' && (
          <Empty t={t} text="connect to make lists." />
        )}

        {(auth.status === 'anon' || auth.status === 'user') && state !== 'loaded' && (
          <Empty t={t} text="loading…" />
        )}

        {state === 'loaded' && lists.length === 0 && !creating && (
          <Empty t={t} text='no lists yet. create one below.' />
        )}

        {state === 'loaded' && lists.map(l => (
          <Link
            key={l.id}
            href={`/profile/lists/${l.id}`}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', border: `1px solid ${t.line}`, background: t.surface,
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: LumiereType.display, fontSize: 22, lineHeight: 1.05,
                color: t.cream, letterSpacing: -0.4,
              }}>{l.name}</div>
              {l.description && (
                <div style={{
                  fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
                  color: t.creamDim, marginTop: 4, lineHeight: 1.4,
                }}>{l.description}</div>
              )}
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
                textTransform: 'uppercase', color: t.muted, marginTop: 6,
              }}>{l.visibility}</div>
            </div>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 14, color: t.creamDim,
              marginLeft: 8,
            }}>›</div>
          </Link>
        ))}

        {!creating ? (
          (auth.status === 'anon' || auth.status === 'user') && state === 'loaded' && (
            <button
              onClick={() => setCreating(true)}
              style={{
                padding: '12px 0', background: 'transparent',
                border: `1px dashed ${t.line}`, color: t.creamDim, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >+ new list</button>
          )
        ) : (
          <div style={{
            padding: 14, border: `1px solid ${t.line}`, background: t.surface,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="list name"
              autoFocus
              style={{
                width: '100%', padding: 10,
                background: t.bg, color: t.cream,
                border: `1px solid ${t.line}`, outline: 'none',
                fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
              }}
            />
            {err && <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
              textTransform: 'uppercase', color: t.danger,
            }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setCreating(false); setName(''); setErr(null); }} style={{
                flex: 1, padding: '10px 0', background: 'transparent',
                border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}>cancel</button>
              <button onClick={() => void submitNew()} disabled={busy || !name.trim()} style={{
                flex: 2, padding: '10px 0', background: t.cream, color: t.bg,
                border: 'none', cursor: busy || !name.trim() ? 'default' : 'pointer',
                opacity: busy || !name.trim() ? 0.6 : 1,
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}>{busy ? 'creating…' : 'create'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center', border: `1px dashed ${t.line}`,
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
      color: t.creamDim,
    }}>{text}</div>
  );
}
