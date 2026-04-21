'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';

interface Props { t: Theme; }

export function BottomNav({ t }: Props) {
  const pathname = usePathname();
  const tabs = [
    { href: '/', id: 'home', label: 'feed' },
    { href: '/search', id: 'search', label: 'find' },
    { href: '/log', id: 'log', label: 'log' },
    { href: '/orbit', id: 'orbit', label: 'orbit' },
    { href: '/profile', id: 'self', label: 'self' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 34, paddingTop: 8,
      background: t.bg, borderTop: `1px solid ${t.line}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
        {tabs.map(x => {
          const active = x.href === '/' ? pathname === '/' : pathname.startsWith(x.href);
          const c = active ? t.cream : t.muted;
          return (
            <Link key={x.id} href={x.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '6px 12px', minWidth: 56, textDecoration: 'none',
            }}>
              <Icon id={x.id} c={c} active={active} t={t} />
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.5,
                textTransform: 'uppercase', color: c,
              }}>{x.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Icon({ id, c, active, t }: { id: string; c: string; active: boolean; t: Theme }) {
  if (id === 'home') return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      {[[2,2],[9,2],[2,9],[9,9]].map(([x,y],i) => <rect key={i} x={x} y={y} width="5" height="5" stroke={c} fill="none" strokeWidth="1"/>)}
    </svg>
  );
  if (id === 'search') return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="5" stroke={c} fill="none" strokeWidth="1"/>
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke={c} strokeWidth="1"/>
    </svg>
  );
  if (id === 'log') return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="8" stroke={c} fill={active ? c : 'none'} strokeWidth="1"/>
      <line x1="9" y1="5" x2="9" y2="13" stroke={active ? t.bg : c} strokeWidth="1"/>
      <line x1="5" y1="9" x2="13" y2="9" stroke={active ? t.bg : c} strokeWidth="1"/>
    </svg>
  );
  if (id === 'orbit') return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2" fill={c}/>
      <ellipse cx="8" cy="8" rx="7" ry="3" stroke={c} fill="none" strokeWidth="0.8" transform="rotate(-25 8 8)"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="6" r="3" stroke={c} fill="none" strokeWidth="1"/>
      <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={c} fill="none" strokeWidth="1"/>
    </svg>
  );
}
