'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryBucket from '@/data/summary_by_bucket.json';
import type { SummaryBucket } from '@/lib/data';

const SankeyFlow = dynamic(() => import('@/components/charts/SankeyFlow'), { ssr: false });

const data = summaryBucket as SummaryBucket[];

export default function S06b_SankeySlide() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      id="sankey-flow"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-surface-mid"
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="font-display text-3xl md:text-4xl font-bold text-text-primary mb-2 text-center"
      >
        Where the Leads <span className="text-win">Flow</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-text-secondary text-lg mb-6 text-center max-w-2xl"
      >
        Every two-goal lead flows from when it was established to its final outcome.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="w-full max-w-4xl"
        style={{ maxHeight: '60vh' }}
      >
        <SankeyFlow data={data} />
      </motion.div>
    </section>
  );
}
