'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import {
  fetchListWithFilms, updateList, deleteList,
  removeFilmFromList, useLists,
} from '@/app/components/lib/listsStore';
import type { ListWithFilms } from '@/app/components/lib/listsStore';
import { useFilmsByIds } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import type { Film } from '@/app/components/lib/types';
import { Poster } from '@/app/components/ui/Poster';

export default function ListDetailPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? '');
  const auth = useAuth();
  const { lists } = useLists();

  const [list, setList] = React.useState<ListWithFilms | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const r = await fetchListWithFilms(id);
    if (r) setList(r);
    else setErr('not found');
  }, [id]);

  React.useEffect(() => {
    let cancel = false;
    fetchListWithFilms(id).then(r => {
      if (cancel) return;
      if (r) setList(r);
      else setErr('not found');
    });
    return () => { cancel = true; };
  }, [id]);

  // refresh when local lists store changes (after add/remove from this list)
  React.useEffect(() => {
    if (!list) return;
    const matching = lists.find(l => l.id === id);
    if (matching && matching.updatedAt !== list.updatedAt) {
      void refresh();
    }
  }, [lists, list, id, refresh]);

  const filmsRaw = useFilmsByIds(list?.filmIds ?? []);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [fid, f] of Object.entries(filmsRaw)) {
      out[fid] = overrides[fid] ? applyOverride(f, overrides[fid]) : f;
    }
    return out;
  }, [filmsRaw, overrides]);

  if (err) return <Center t={t} text={err} />;
  if (!list) return <Center t={t} text="loading…" />;

  const isOwner = auth.userId === list.userId;

  const onRemoveFilm = async (filmId: string) => {
    const e = await removeFilmFromList(list.id, filmId);
    if (e) { setErr(e); return; }
    setList({ ...list, filmIds: list.filmIds.filter(f => f !== filmId) });
  };

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>

        {editing && isOwner ? (
          <EditForm
            t={t}
            list={list}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false);
              await refresh();
            }}
            onDelete={async () => {
              const e = await deleteList(list.id);
              if (e) setErr(e);
              else router.push('/profile/lists');
            }}
          />
        ) : (
          <>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase', color: t.muted, marginBottom: 10,
            }}>{list.visibility} · {list.filmIds.length} films</div>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 40, lineHeight: 1,
              color: t.cream, letterSpacing: -1, marginBottom: 6,
            }}>{list.name}</div>
            {list.description && (
              <div style={{
                fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
                color: t.creamDim, lineHeight: 1.45,
              }}>{list.description}</div>
            )}
            {isOwner && (
              <button onClick={() => setEditing(true)} style={{
                marginTop: 14, padding: '6px 12px',
                background: 'transparent', border: `1px solid ${t.line}`,
                color: t.creamDim, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}>edit</button>
            )}
          </>
        )}
      </div>

      <div style={{ padding: 20 }}>
        {list.filmIds.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center', border: `1px dashed ${t.line}`,
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
            color: t.creamDim,
          }}>empty list. add films from any film page.</div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 10,
          }}>
            {list.filmIds.map(fid => {
              const film = films[fid];
              return (
                <div key={fid} style={{ position: 'relative' }}>
                  <Link
                    href={`/films/${encodeURIComponent(fid)}`}
                    style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                  >
                    {film
                      ? <div style={{ width: '100%', aspectRatio: '2/3' }}>
                          <Poster film={film} size="sm" t={t} style={{ width: '100%', height: '100%' }} />
                        </div>
                      : <div style={{
                          width: '100%', aspectRatio: '2/3', background: t.surfaceHi,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: LumiereType.mono, fontSize: 10, color: t.muted,
                        }}>·</div>
                    }
                    {film && (
                      <div style={{
                        fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1,
                        color: t.muted, marginTop: 6,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{film.title}</div>
                    )}
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => void onRemoveFilm(fid)}
                      title="remove"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        background: 'rgba(0,0,0,0.7)', border: `1px solid ${t.line}`,
                        cursor: 'pointer', padding: '2px 6px',
                        fontFamily: LumiereType.mono, fontSize: 9, color: t.cream,
                      }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({
  t, list, onCancel, onSaved, onDelete,
}: {
  t: Theme;
  list: ListWithFilms;
  onCancel: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = React.useState(list.name);
  const [description, setDescription] = React.useState(list.description ?? '');
  const [visibility, setVisibility] = React.useState(list.visibility);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [confirmDel, setConfirmDel] = React.useState(false);

  const save = async () => {
    setBusy(true);
    setErr(null);
    const e = await updateList(list.id, { name, description, visibility });
    setBusy(false);
    if (e) setErr(e);
    else onSaved();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="name"
        style={inputStyle(t)}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="optional description"
        rows={2}
        style={{ ...inputStyle(t), resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        {(['private', 'public'] as const).map(v => {
          const active = visibility === v;
          return (
            <button key={v} onClick={() => setVisibility(v)} style={{
              flex: 1, padding: '8px 0', cursor: 'pointer',
              background: active ? t.cream : 'transparent',
              color: active ? t.bg : t.creamDim,
              border: `1px solid ${active ? t.cream : t.line}`,
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}>{v}</button>
          );
        })}
      </div>
      {err && (
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: t.danger,
        }}>{err}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px 0', background: 'transparent',
          border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}>cancel</button>
        <button onClick={save} disabled={busy || !name.trim()} style={{
          flex: 2, padding: '10px 0', background: t.cream, color: t.bg,
          border: 'none', cursor: busy || !name.trim() ? 'default' : 'pointer',
          opacity: busy || !name.trim() ? 0.6 : 1,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}>{busy ? 'saving…' : 'save'}</button>
      </div>
      {!confirmDel ? (
        <button onClick={() => setConfirmDel(true)} style={{
          marginTop: 4, padding: '8px 0', background: 'transparent',
          border: `1px solid ${t.danger}`, color: t.danger, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}>delete list</button>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => setConfirmDel(false)} style={{
            flex: 1, padding: '8px 0', background: 'transparent',
            border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>cancel</button>
          <button onClick={onDelete} style={{
            flex: 2, padding: '8px 0', background: t.danger, color: t.bg,
            border: 'none', cursor: 'pointer',
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>confirm delete</button>
        </div>
      )}
    </div>
  );
}

function inputStyle(t: Theme): React.CSSProperties {
  return {
    width: '100%', padding: 10,
    background: t.bg, color: t.cream,
    border: `1px solid ${t.line}`, outline: 'none',
    fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
  };
}

function Center({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '80px 20px', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 18,
      color: t.creamDim,
    }}>{text}</div>
  );
}
