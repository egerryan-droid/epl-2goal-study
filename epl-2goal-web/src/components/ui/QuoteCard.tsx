'use client';

import { motion } from 'framer-motion';
import type { Quote } from '@/data/quotes';

export default function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <motion.blockquote
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-xl p-6 border-l-4 border-accent"
    >
      <p className="font-display text-xl italic text-text-primary leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <footer className="mt-3 flex items-center gap-3">
        <div>
          <cite className="not-italic font-bold text-accent text-sm">
            {quote.author}
          </cite>
          <p className="text-text-muted text-xs">{quote.role}</p>
        </div>
      </footer>
    </motion.blockquote>
  );
}
