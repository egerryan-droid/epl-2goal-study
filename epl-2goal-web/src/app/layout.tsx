import type { Metadata } from 'next';
import { Barlow_Condensed, Barlow } from 'next/font/google';
import ThemeToggle from '@/components/ui/ThemeToggle';
import './globals.css';

// Premier League brand uses the proprietary "PremierLeague" typeface (DesignStudio,
// 2016 rebrand). The closest freely-distributable substitute per the design
// system zip's `colors_and_type.css` is Barlow Condensed for display, Barlow
// for body. Condensed all-caps display type is the PL signature look.
const display = Barlow_Condensed({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Barlow({
  weight: ['400', '500', '600', '700'],
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
    <html lang="en" className={`${display.variable} ${sans.variable} font-sans`}>
      <body className="min-h-screen bg-surface-dark text-text-primary font-sans transition-colors duration-300">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
