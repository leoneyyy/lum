import type { Metadata } from 'next';
import { DM_Serif_Display, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { TweaksProvider } from '@/app/components/TweaksProvider';
import { AuthProvider } from '@/app/components/AuthProvider';
import './globals.css';

const serifDisplay = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-display', style: ['normal', 'italic'] });
const serifBody = Cormorant_Garamond({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-body', style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Lumiere',
  description: 'A field guide to what you watched.',
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