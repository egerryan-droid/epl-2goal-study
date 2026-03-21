'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';

const KpiCard = dynamic(() => import('@/components/ui/KpiCard'), { ssr: false });

export default function S03_TheData() {
  const { ref, inView } = useInView({ threshold: 0.3 });

  const stats = [
    { value: 3800, label: 'Matches Examined', suffix: '+' },
    { value: 1907, label: 'Two-Goal Leads Identified', color: '#3498db' },
    { value: 10, label: 'EPL Seasons (2014/15 – 2023/24)' },
  ];

  return (
    <section
      ref={ref}
      id="the-data"
      className="min-h-[75vh] flex flex-col items-center justify-center px-6 py-20 bg-surface-dark"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          The Data
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Shot-level data from Understat and match controls from Football-Data.co.uk,
          covering a full decade of Premier League football.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 * i }}
          >
            <KpiCard
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              color={stat.color}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
