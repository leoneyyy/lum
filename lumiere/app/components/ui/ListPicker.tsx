'use client';
import React from 'react';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import {
  useLists, useListMembership, addFilmToList, removeFilmFromList, createList,
} from '@/app/components/lib/listsStore';

export function ListPicker({
  filmId, t, onClose,
}: {
  filmId: string;
  t: Theme;
  onClose: () => void;
}) {
  const { lists, state } = useLists();
  const memberOf = useListMembership(filmId);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const toggle = async (listId: string) => {
    setErr(null);
    if (memberOf.has(listId)) {
      const e = await removeFilmFromList(listId, filmId);
      if (e) setErr(e);
    } else {
      const e = await addFilmToList(listId, filmId);
      if (e) setErr(e);
    }
  };

  const submitNew = async () => {
    setBusy(true);
    setErr(null);
    const r = await createList(name);
    if (r.error) {
      setErr(r.error);
      setBusy(false);
      return;
    }
    if (r.id) await addFilmToList(r.id, filmId);
    setBusy(false);
    setName('');
    setCreating(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: t.bg, borderTop: `1px solid ${t.line}`,
        padding: '20px 20px 34px', maxHeight: '70vh', overflow: 'auto',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.muted,
          }}>§ add to list</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.creamDim,
          }}>close</button>
        </div>

        {err && (
          <div style={{
            padding: '10px 12px', border: `1px solid ${t.danger}`, color: t.danger,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
            textTransform: 'uppercase', marginBottom: 12,
          }}>{err}</div>
        )}

        {state !== 'loaded' && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
            color: t.creamDim, padding: '12px 0',
          }}>loading…</div>
        )}

        {state === 'loaded' && lists.length === 0 && !creating && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
            color: t.creamDim, padding: '12px 0',
          }}>no lists yet. make your first one.</div>
        )}

        {state === 'loaded' && lists.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {lists.map(l => {
              const active = memberOf.has(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => void toggle(l.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', cursor: 'pointer',
                    background: active ? t.surface : 'transparent',
                    color: 'inherit', textAlign: 'left',
                    border: `1px solid ${active ? t.signal : t.line}`,
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: LumiereType.body, fontSize: 15,
                      color: t.cream,
                    }}>{l.name}</div>
                    <div style={{
                      fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.2,
                      textTransform: 'uppercase', color: t.muted, marginTop: 2,
                    }}>{l.visibility}</div>
                  </div>
                  <div style={{
                    fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 1.4,
                    color: active ? t.signal : t.muted,
                  }}>{active ? '✓ in' : '+ add'}</div>
                </button>
              );
            })}
          </div>
        )}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: '10px 0', width: '100%', background: 'transparent',
              border: `1px dashed ${t.line}`, color: t.creamDim, cursor: 'pointer',
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >+ new list</button>
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
              }}>{busy ? 'creating…' : 'create + add'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
