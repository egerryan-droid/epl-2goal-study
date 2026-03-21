import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-dark text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
