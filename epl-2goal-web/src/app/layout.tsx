import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';

const serif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EPL 2-Goal Lead Study',
  description:
    'Interactive analysis of 2-goal lead outcomes in the English Premier League (2015-2025).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} font-sans`}>
      <body className="min-h-screen bg-surface-dark text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
