'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import SectionWrapper from '@/components/layout/SectionWrapper';

const insights = [
  { text: 'Each additional minute increases win odds by 2.2%', icon: '\u23F1', color: 'text-accent' },
  { text: 'Pre-match favorites hold leads far more reliably (OR=66.7)', icon: '\uD83D\uDCAA', color: 'text-win' },
  { text: 'Home advantage is NOT significant (p=0.84)', icon: '\uD83C\uDFDF', color: 'text-text-muted' },
  { text: 'A red card for the leader halves the odds (OR=0.42)', icon: '\uD83D\uDFE5', color: 'text-loss' },
  { text: 'An opponent red card triples them (OR=3.46)', icon: '\u2705', color: 'text-win' },
];

export default function S09b_KeyFindings() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <SectionWrapper id="key-findings" dark>
      <div ref={ref} className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          Key Findings
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-10">
          Five takeaways from the regression model that tell us what actually
          moves the needle on holding a two-goal lead.
        </p>

        <div className="space-y-4 max-w-2xl w-full">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className="bg-surface-mid rounded-lg p-5 flex items-start gap-4 text-left"
            >
              <span className="text-3xl">{insight.icon}</span>
              <p className={`${insight.color} text-lg font-medium`}>{insight.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
