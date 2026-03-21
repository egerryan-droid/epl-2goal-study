'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryBucket from '@/data/summary_by_bucket.json';
import type { SummaryBucket } from '@/lib/data';

const SankeyFlow = dynamic(() => import('@/components/charts/SankeyFlow'), { ssr: false });

const data = summaryBucket as SummaryBucket[];

export default function S06_TheLockPoint() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      id="lock-point"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 50%, #1a1a2e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1, type: 'spring' }}
        className="text-center mb-4"
      >
        <div className="text-8xl md:text-[10rem] font-bold text-win leading-none">
          {inView && <CountUp end={99.7} decimals={1} duration={2.5} suffix="%" />}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-center mb-12 max-w-2xl"
      >
        <h2 className="text-2xl md:text-4xl font-bold text-text-primary mb-4">
          The <span className="text-win">Lock Point</span>
        </h2>
        <p className="text-text-secondary text-lg">
          In the 76&ndash;90+ minute window, <strong className="text-text-primary">388 out of 389</strong> two-goal
          leads held. Only <strong className="text-draw">one draw</strong>. Zero losses.
        </p>
      </motion.div>

      {/* Sankey moved to S06b_SankeySlide */}
    </section>
  );
}
