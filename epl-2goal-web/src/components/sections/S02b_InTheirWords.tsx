'use client';

import { motion } from 'framer-motion';
import SectionWrapper from '@/components/layout/SectionWrapper';
import QuoteCard from '@/components/ui/QuoteCard';
import { QUOTES } from '@/data/quotes';

const featured = QUOTES.filter(q =>
  ['collapse-intro', 'big-picture', 'lock-point', 'key-findings'].includes(q.section ?? '')
).slice(0, 4);

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function S02b_InTheirWords() {
  return (
    <SectionWrapper id="in-their-words" dark>
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          In Their Own Words
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-10">
          What managers and players say about blowing a two-goal lead.
        </p>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full"
        >
          {featured.map((q, i) => (
            <motion.div key={i} variants={fadeUp}>
              <QuoteCard quote={q} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
