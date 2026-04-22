'use client';
import React from 'react';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import { getFilmImages } from '@/app/components/lib/api';
import type { ImageCatalog } from '@/app/components/lib/tmdb';

type Kind = 'poster' | 'backdrop';

interface Props {
  filmId: string;
  kind: Kind;
  current: string | null | undefined;
  defaultUrl: string | null | undefined;
  t: Theme;
  onPick: (url: string | null) => void;
  onClose: () => void;
}

export function ImagePicker({ filmId, kind, current, defaultUrl, t, onPick, onClose }: Props) {
  const [catalog, setCatalog] = React.useState<ImageCatalog | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    getFilmImages(filmId)
      .then(c => { if (!cancel) setCatalog(c); })
      .catch(e => { if (!cancel) setErr(e instanceof Error ? e.message : 'failed'); });
    return () => { cancel = true; };
  }, [filmId]);

  const list = kind === 'poster' ? catalog?.posters : catalog?.backdrops;
  const thumbW = kind === 'poster' ? 80 : 140;
  const thumbH = kind === 'poster' ? 120 : 80;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.bg, borderTop: `1px solid ${t.line}`,
          padding: '20px 20px 34px', maxHeight: '70vh', overflow: 'auto',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.muted,
          }}>§ choose {kind}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.creamDim,
          }}>close</button>
        </div>

        {err && (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 14, color: t.danger,
          }}>error · {err}</div>
        )}
        {!catalog && !err && (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 14, color: t.creamDim,
          }}>loading…</div>
        )}

        {catalog && list && list.length === 0 && (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 14, color: t.creamDim,
          }}>no alternates found.</div>
        )}

        {catalog && list && list.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbW}px, 1fr))`,
            gap: 8,
          }}>
            {defaultUrl && (
              <ImageTile
                key="__default"
                src={defaultUrl}
                w={thumbW}
                h={thumbH}
                label="default"
                active={!current || current === defaultUrl}
                t={t}
                onClick={() => { onPick(null); onClose(); }}
              />
            )}
            {list.map(img => (
              <ImageTile
                key={img.url}
                src={img.thumb}
                w={thumbW}
                h={thumbH}
                active={current === img.url}
                t={t}
                onClick={() => { onPick(img.url); onClose(); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageTile({
  src, w, h, label, active, t, onClick,
}: {
  src: string; w: number; h: number; label?: string; active: boolean; t: Theme;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', padding: 0, border: `2px solid ${active ? t.signal : 'transparent'}`,
      background: t.surfaceHi, cursor: 'pointer', overflow: 'hidden',
      width: '100%', aspectRatio: `${w}/${h}`,
    }}>
      <img src={src} alt="" style={{
        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
      }} />
      {label && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '4px 6px', background: 'rgba(0,0,0,0.55)',
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
          textTransform: 'uppercase', color: '#fff',
        }}>{label}</div>
      )}
    </button>
  );
}
