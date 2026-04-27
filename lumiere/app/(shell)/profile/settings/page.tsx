'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import {
  LumiereType, LumiereThemes, DEFAULT_DIMS,
} from '@/app/components/lib/tokens';
import type { ThemeKey, Voice, DimKey } from '@/app/components/lib/tokens';
import type { Film, MediaKind, Profile } from '@/app/components/lib/types';
import { useLog } from '@/app/components/lib/logStore';
import { useAuth } from '@/app/components/AuthProvider';
import {
  useMyProfile, saveMyProfile, setTopPicks, setPublicTheme,
  uploadMyAvatar, clearMyAvatar,
} from '@/app/components/lib/profileStore';
import { useFollowing } from '@/app/components/lib/followStore';
import { useWatched } from '@/app/components/lib/watchedStore';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import { startEmailAuth, signOut } from '@/app/components/lib/auth';
import { CryMeter } from '@/app/components/ui/CryMeter';
import type { CryStyle } from '@/app/components/ui/CryMeter';
import { Eyebrow, Avatar, avatarFor } from '@/app/components/ui/Primitives';
import { TopPicksGrid, TopPicksPicker } from '@/app/components/ui/TopPicks';

const THEMES: ThemeKey[] = ['indigo', 'oxblood', 'bone', 'acid'];
const VOICES: Voice[] = ['dry', 'poetic', 'playful'];
const CRY_STYLES: CryStyle[] = ['bar', 'dots', 'wave'];

export default function SettingsPage() {
  const { theme: t, tweaks, setTweaks } = useTweaks();
  const router = useRouter();
  const entries = useLog();
  const auth = useAuth();
  const avg = entries.length ? Math.round(entries.reduce((s, e) => s + e.cry, 0) / entries.length) : 0;
  const max = entries.reduce((m, e) => Math.max(m, e.cry), 0);

  const toggleDim = (k: DimKey) => setTweaks(prev => ({
    ...prev,
    dims: prev.dims.includes(k) ? prev.dims.filter(d => d !== k) : [...prev.dims, k],
  }));

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
        }}>§ tweaks</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 48, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.4,
        }}>the<br/><span style={{ fontStyle: 'italic', color: t.signal }}>workshop</span></div>
      </div>

      <div style={{ padding: '20px' }}>
        <Eyebrow num="00" label="identity" t={t} style={{ marginBottom: 12 }} />
        <AuthStrip auth={auth} t={t} />

        <div style={{ height: 18 }} />
        <HandleBlock t={t} />

        <div style={{ height: 28 }} />
        <Eyebrow num="01" label="instrument" t={t} style={{ marginBottom: 12 }} />
        <Stat t={t} label="logged" value={entries.length.toString().padStart(3, '0')} />
        <WatchedStat t={t} />
        <Stat t={t} label="avg cry" value={avg.toString().padStart(3, '0')} />
        <Stat t={t} label="peak cry" value={max.toString().padStart(3, '0')} />
        <FollowingStat t={t} />
        <ImportLink t={t} />

        <div style={{ height: 28 }} />
        <Eyebrow num="02" label="canon" t={t} style={{ marginBottom: 12 }} />
        <TopPicksOwnBlock t={t} />

        <div style={{ height: 28 }} />
        <Eyebrow num="03" label="theme" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {THEMES.map(key => {
            const th = LumiereThemes[key];
            const active = tweaks.theme === key;
            return (
              <button key={key} onClick={() => setTweaks(p => ({ ...p, theme: key }))} style={{
                padding: 12, cursor: 'pointer', textAlign: 'left',
                background: th.bg, color: th.cream,
                border: `1px solid ${active ? th.cream : t.line}`,
              }}>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: th.muted, marginBottom: 6,
                }}>{key}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[th.cream, th.signal, th.accent, th.muted].map((c, i) => (
                    <div key={i} style={{ flex: 1, height: 16, background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="04" label="public theme" t={t} style={{ marginBottom: 12 }} />
        <PublicThemeBlock t={t} />

        <div style={{ height: 28 }} />
        <Eyebrow num="05" label="cry style" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CRY_STYLES.map(s => {
            const active = tweaks.cryStyle === s;
            return (
              <button key={s} onClick={() => setTweaks(p => ({ ...p, cryStyle: s }))} style={{
                padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                background: active ? t.surface : 'transparent',
                color: 'inherit', border: `1px solid ${active ? t.cream : t.line}`,
              }}>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: t.muted, marginBottom: 8,
                }}>{s}</div>
                <CryMeter value={62} t={t} style={s} />
              </button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="06" label="voice" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {VOICES.map(v => {
            const active = tweaks.voice === v;
            return (
              <button key={v} onClick={() => setTweaks(p => ({ ...p, voice: v }))} style={{
                flex: 1, padding: '10px 0', cursor: 'pointer',
                background: active ? t.cream : 'transparent',
                color: active ? t.bg : t.creamDim,
                border: `1px solid ${active ? t.cream : t.line}`,
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase',
              }}>{v}</button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="07" label="dimensions" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEFAULT_DIMS.map(d => {
            const active = tweaks.dims.includes(d.key as DimKey);
            return (
              <button key={d.key} onClick={() => toggleDim(d.key as DimKey)} style={{
                padding: '6px 12px', cursor: 'pointer',
                background: active ? t.cream : 'transparent',
                color: active ? t.bg : t.creamDim,
                border: `1px solid ${active ? t.cream : t.line}`,
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}>{d.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AuthStrip({
  auth, t,
}: {
  auth: ReturnType<typeof useAuth>;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const label =
    auth.status === 'disabled' ? 'local · not synced' :
    auth.status === 'init' ? 'connecting…' :
    auth.status === 'anon' ? 'anon · synced on this device' :
    auth.status === 'user' ? (auth.email || 'signed in') :
    auth.status === 'error' ? `error · ${auth.error ?? 'unknown'}` : '—';

  const dot =
    auth.status === 'user' ? t.signal :
    auth.status === 'anon' ? t.accent :
    auth.status === 'error' ? t.danger : t.muted;

  const [expanded, setExpanded] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState<'upgrade' | 'signin' | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [confirmOut, setConfirmOut] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await startEmailAuth(email);
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? 'failed'); return; }
    setSent(res.intent);
  };

  const doSignOut = async () => {
    setBusy(true);
    const err = await signOut();
    setBusy(false);
    if (err) setMsg(err);
  };

  return (
    <div style={{
      border: `1px solid ${t.line}`, background: t.surface,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
            textTransform: 'uppercase', color: t.cream,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{label}</div>
          {auth.userId && (
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.2,
              color: t.muted, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>id · {auth.userId}</div>
          )}
        </div>
        {(auth.status === 'anon' || auth.status === 'user') && !expanded && (
          <button onClick={() => { setExpanded(true); setSent(null); setMsg(null); setConfirmOut(false); }} style={{
            background: 'transparent', border: `1px solid ${t.line}`, cursor: 'pointer',
            padding: '6px 10px', color: t.creamDim,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>{auth.status === 'anon' ? 'connect email' : 'account'}</button>
        )}
      </div>

      {expanded && auth.status === 'anon' && (
        <div style={{
          padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {sent === 'upgrade' && (
            <EmailSentNote t={t} email={email} note="check your inbox · click the link to anchor this device to that email. your log stays." />
          )}
          {sent === 'signin' && (
            <EmailSentNote t={t} email={email} note="check your inbox · that email already has an account. clicking the link signs you into it and replaces this anonymous session." />
          )}
          {!sent && (
            <>
              <div style={{
                fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
                color: t.creamDim, lineHeight: 1.4,
              }}>attach an email so you don&apos;t lose your log if this browser gets wiped.</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@somewhere.com"
                autoCapitalize="off"
                autoCorrect="off"
                style={{
                  width: '100%', padding: 10,
                  background: t.bg, color: t.cream,
                  border: `1px solid ${t.line}`, outline: 'none',
                  fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
                }}
              />
              {msg && <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
                textTransform: 'uppercase', color: t.danger,
              }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setExpanded(false)} style={{
                  flex: 1, padding: '10px 0', background: 'transparent',
                  border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}>cancel</button>
                <button onClick={submit} disabled={busy || !email.trim()} style={{
                  flex: 2, padding: '10px 0', background: t.cream, color: t.bg,
                  border: 'none', cursor: busy ? 'default' : 'pointer',
                  opacity: busy || !email.trim() ? 0.6 : 1,
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}>{busy ? 'sending…' : 'send magic link'}</button>
              </div>
            </>
          )}
          {sent && (
            <button onClick={() => setExpanded(false)} style={{
              padding: '10px 0', background: 'transparent',
              border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}>ok</button>
          )}
        </div>
      )}

      {expanded && auth.status === 'user' && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msg && <div style={{
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
            textTransform: 'uppercase', color: t.danger,
          }}>{msg}</div>}
          {!confirmOut ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setExpanded(false)} style={{
                flex: 1, padding: '10px 0', background: 'transparent',
                border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}>close</button>
              <button onClick={() => setConfirmOut(true)} style={{
                flex: 2, padding: '10px 0', background: 'transparent',
                border: `1px solid ${t.danger}`, color: t.danger, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}>sign out</button>
            </div>
          ) : (
            <>
              <div style={{
                fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
                color: t.creamDim, lineHeight: 1.4,
              }}>sign out and go back to anonymous? your remote log stays safe · you can sign back in anytime with the same email.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmOut(false)} style={{
                  flex: 1, padding: '10px 0', background: 'transparent',
                  border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}>cancel</button>
                <button onClick={doSignOut} disabled={busy} style={{
                  flex: 2, padding: '10px 0', background: t.danger, color: t.bg,
                  border: 'none', cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                  textTransform: 'uppercase',
                }}>{busy ? 'signing out…' : 'confirm sign out'}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HandleBlock({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const auth = useAuth();
  const { profile, state } = useMyProfile();
  const [editing, setEditing] = React.useState(false);

  if (auth.status !== 'anon' && auth.status !== 'user') return null;

  const avatar = profile
    ? avatarFor(profile.id, profile.handle, profile.avatarUrl)
    : auth.userId ? avatarFor(auth.userId) : { initials: '??', tint: t.muted };

  if (editing) {
    const formKey = profile ? `${profile.id}:${profile.handle}:${profile.name ?? ''}:${profile.bio ?? ''}` : 'new';
    return (
      <HandleEditForm
        key={formKey}
        t={t}
        profile={profile}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  if (profile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', border: `1px solid ${t.line}`, background: t.surface,
      }}>
        <AvatarUploader avatar={avatar} hasAvatar={!!profile.avatarUrl} t={t} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 1.6,
            color: t.cream,
          }}>@{profile.handle}</div>
          {profile.name && <div style={{
            fontFamily: LumiereType.body, fontSize: 14, fontStyle: 'italic',
            color: t.creamDim, marginTop: 2,
          }}>{profile.name}</div>}
        </div>
        <button onClick={() => setEditing(true)} style={{
          background: 'transparent', border: `1px solid ${t.line}`,
          padding: '8px 12px', cursor: 'pointer', color: t.creamDim,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}>edit</button>
      </div>
    );
  }

  if (state !== 'loaded' && state !== 'missing') {
    return (
      <div style={{
        padding: '12px 14px', border: `1px solid ${t.line}`, background: t.surface,
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14, color: t.creamDim,
      }}>loading profile…</div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} style={{
      display: 'block', width: '100%', padding: '14px 0',
      background: 'transparent', color: t.cream, cursor: 'pointer',
      border: `1px dashed ${t.line}`,
      fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
      textTransform: 'uppercase',
    }}>+ claim a handle</button>
  );
}

function HandleEditForm({
  t, profile, onCancel, onSaved,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  profile: Profile | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = React.useState(profile?.handle ?? '');
  const [name, setName] = React.useState(profile?.name ?? '');
  const [bio, setBio] = React.useState(profile?.bio ?? '');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const err = await saveMyProfile({ handle, name, bio });
    setSaving(false);
    if (err) { setMsg(err); return; }
    onSaved();
  };

  return (
    <div style={{
      border: `1px solid ${t.line}`, padding: 14, background: t.surface,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Field label="handle" t={t}>
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="yourname"
          autoCapitalize="off"
          autoCorrect="off"
          style={inputStyle(t)}
        />
      </Field>
      <Field label="name" t={t}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="optional display name"
          style={inputStyle(t)}
        />
      </Field>
      <Field label="bio" t={t}>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="one line about you"
          rows={2}
          style={{ ...inputStyle(t), resize: 'vertical' }}
        />
      </Field>
      {msg && <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
        textTransform: 'uppercase', color: t.danger,
      }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        {profile && (
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', background: 'transparent',
            border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}>cancel</button>
        )}
        <button onClick={save} disabled={saving || !handle.trim()} style={{
          flex: 2, padding: '10px 0', background: t.cream, color: t.bg,
          border: 'none', cursor: saving ? 'default' : 'pointer',
          opacity: saving || !handle.trim() ? 0.6 : 1,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}>{saving ? 'saving…' : profile ? 'save' : 'claim'}</button>
      </div>
    </div>
  );
}

function Field({ label, t, children }: {
  label: string; t: ReturnType<typeof useTweaks>['theme']; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 4,
      }}>{label}</div>
      {children}
    </div>
  );
}

function inputStyle(t: ReturnType<typeof useTweaks>['theme']): React.CSSProperties {
  return {
    width: '100%', padding: 10,
    background: t.bg, color: t.cream,
    border: `1px solid ${t.line}`, outline: 'none',
    fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
  };
}

function FollowingStat({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const { ids, state } = useFollowing();
  const value = state === 'loaded' ? ids.length.toString().padStart(3, '0') : '···';
  return (
    <Link href="/friends" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
      textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted,
      }}>following →</div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
        color: t.cream, letterSpacing: -0.6,
      }}>{value}</div>
    </Link>
  );
}

function WatchedStat({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const { ids, state } = useWatched();
  const value = state === 'loaded' ? ids.length.toString().padStart(3, '0') : '···';
  return <Stat t={t} label="watched" value={value} />;
}

function ImportLink({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  return (
    <Link href="/profile/settings/import" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
      textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted,
      }}>import letterboxd →</div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 13,
        color: t.creamDim,
      }}>diary.csv</div>
    </Link>
  );
}

function EmailSentNote({
  t, email, note,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  email: string;
  note: string;
}) {
  return (
    <div style={{
      padding: '10px 12px', background: t.bg, border: `1px solid ${t.line}`,
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.signal, marginBottom: 6,
      }}>✓ sent to {email}</div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        color: t.creamDim, lineHeight: 1.4,
      }}>{note}</div>
    </div>
  );
}

function Stat({ t, label, value }: { t: ReturnType<typeof useTweaks>['theme']; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted,
      }}>{label}</div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
        color: t.cream, letterSpacing: -0.6,
      }}>{value}</div>
    </div>
  );
}

function TopPicksOwnBlock({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const { profile } = useMyProfile();
  const entries = useLog();
  const rawFilms = useFilmsForEntries(entries);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides]);

  const [picker, setPicker] = React.useState<MediaKind | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!profile) {
    return (
      <div style={{
        padding: '12px 14px', border: `1px dashed ${t.line}`,
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        color: t.creamDim,
      }}>claim a handle first to set your top picks.</div>
    );
  }

  const addPick = async (kind: MediaKind, filmId: string) => {
    setError(null);
    setPicker(null);
    const err = kind === 'film'
      ? await setTopPicks({
          topFilms: [...profile.topFilms.filter(id => id !== filmId), filmId].slice(-4),
        })
      : await setTopPicks({
          topSeries: [...profile.topSeries.filter(id => id !== filmId), filmId].slice(-4),
        });
    if (err) setError(err);
  };

  const removePick = async (kind: MediaKind, filmId: string) => {
    setError(null);
    const err = kind === 'film'
      ? await setTopPicks({ topFilms: profile.topFilms.filter(id => id !== filmId) })
      : await setTopPicks({ topSeries: profile.topSeries.filter(id => id !== filmId) });
    if (err) setError(err);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <TopPicksGrid
        picks={profile.topFilms}
        films={films}
        t={t}
        label="top films"
        onAdd={profile.topFilms.length < 4 ? () => setPicker('film') : undefined}
        onRemove={(id) => void removePick('film', id)}
      />
      <TopPicksGrid
        picks={profile.topSeries}
        films={films}
        t={t}
        label="top series"
        onAdd={profile.topSeries.length < 4 ? () => setPicker('series') : undefined}
        onRemove={(id) => void removePick('series', id)}
      />
      {error && (
        <div style={{
          padding: '10px 12px', border: `1px solid ${t.danger}`, background: t.surface,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: t.danger, lineHeight: 1.5,
        }}>error · {error}</div>
      )}
      {picker && (
        <TopPicksPicker
          kind={picker}
          entries={entries}
          films={films}
          current={picker === 'film' ? profile.topFilms : profile.topSeries}
          t={t}
          onPick={(id) => void addPick(picker, id)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function AvatarUploader({
  avatar, hasAvatar, t,
}: {
  avatar: { initials: string; tint: string; avatarUrl?: string | null };
  hasAvatar: boolean;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr(null);
    const error = await uploadMyAvatar(file);
    setBusy(false);
    if (error) setErr(error);
  };

  const onClear = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const error = await clearMyAvatar();
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="change picture"
        style={{
          padding: 0, border: 'none', background: 'transparent',
          cursor: busy ? 'default' : 'pointer', position: 'relative',
          display: 'block', borderRadius: '50%', overflow: 'hidden',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Avatar friend={avatar} size={48} t={t} />
      </button>
      {hasAvatar && !busy && (
        <button
          onClick={onClear}
          title="remove picture"
          style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: t.bg, border: `1px solid ${t.line}`,
            color: t.creamDim, cursor: 'pointer', padding: 0,
            fontFamily: LumiereType.mono, fontSize: 9, lineHeight: 1,
          }}
        >×</button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        style={{ display: 'none' }}
      />
      {err && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.2,
          textTransform: 'uppercase', color: t.danger, whiteSpace: 'nowrap',
        }}>{err}</div>
      )}
    </div>
  );
}

function PublicThemeBlock({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const { profile } = useMyProfile();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  if (!profile) {
    return (
      <div style={{
        padding: '12px 14px', border: `1px dashed ${t.line}`,
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        color: t.creamDim,
      }}>claim a handle first to skin your public profile.</div>
    );
  }

  const apply = async (next: ThemeKey | null) => {
    setBusy(next ?? '__clear__');
    setErr(null);
    const e = await setPublicTheme(next);
    setBusy(null);
    if (e) setErr(e);
  };

  const current = profile.publicTheme ?? null;

  return (
    <div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 13,
        color: t.creamDim, marginBottom: 12, lineHeight: 1.45,
      }}>colors others see when they open your profile. defaults to whatever theme they&apos;re using.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {THEMES.map(key => {
          const th = LumiereThemes[key];
          const active = current === key;
          const loading = busy === key;
          return (
            <button
              key={key}
              onClick={() => void apply(key)}
              disabled={busy !== null}
              style={{
                padding: 12, cursor: busy ? 'default' : 'pointer', textAlign: 'left',
                background: th.bg, color: th.cream,
                border: `1px solid ${active ? th.signal : t.line}`,
                opacity: loading ? 0.6 : 1,
                position: 'relative',
              }}
            >
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                textTransform: 'uppercase', color: th.muted, marginBottom: 6,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{key}</span>
                {active && <span style={{ color: th.signal }}>✓ public</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[th.cream, th.signal, th.accent, th.muted].map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 16, background: c }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void apply(null)}
        disabled={busy !== null || current === null}
        style={{
          display: 'block', width: '100%', marginTop: 10,
          padding: '10px 0', background: 'transparent',
          border: `1px solid ${t.line}`, color: t.creamDim,
          cursor: busy || current === null ? 'default' : 'pointer',
          opacity: busy === '__clear__' ? 0.6 : current === null ? 0.4 : 1,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}
      >{current === null ? '✓ using viewer\'s theme' : 'use viewer\'s theme'}</button>

      {err && (
        <div style={{
          marginTop: 8,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: t.danger,
        }}>error · {err}</div>
      )}
    </div>
  );
}
