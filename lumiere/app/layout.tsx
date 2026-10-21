import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { TweaksProvider } from '@/app/components/TweaksProvider';
import { AuthProvider } from '@/app/components/AuthProvider';
import './globals.css';

const serifDisplay = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-display', style: ['normal', 'italic'] });
const serifBody = Cormorant_Garamond({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-body', style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-mono' });

// Absolute base for share-preview URLs. Set NEXT_PUBLIC_SITE_URL once there's
// a custom domain; until then Vercel's production URL is used.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Lumière',
  description: 'A field guide to what you watched.',
  // set here rather than as app/opengraph-image so profile and film pages
  // can bring their own image (file-based images would override them)
  openGraph: {
    siteName: 'Lumière',
    title: 'Lumière',
    description: 'A field guide to what you watched.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'lumière' }],
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: {
    capable: true,
    title: 'Lumière',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#06040a',
  // Draw under the notch / home indicator when installed; the shell pads
  // itself with the safe-area insets.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serifDisplay.variable} ${serifBody.variable} ${mono.variable}`}>
      <body style={{ margin: 0, background: '#06040a', fontFamily: 'var(--font-body)', color: '#ebe6d8' }}>
        <TweaksProvider>
          <AuthProvider>{children}</AuthProvider>
        </TweaksProvider>
      </body>
    </html>
  );
}