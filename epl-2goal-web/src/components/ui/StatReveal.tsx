'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';

interface StatRevealProps {
  value: string;
  subtitle: string;
  color?: string;
}

export default function StatReveal({
  value,
  subtitle,
  color = '#ECF0F1',
}: StatRevealProps) {
  const { ref, inView } = useInView({ threshold: 0.3 });

  return (
    <div ref={ref} className="flex w-full flex-col items-center py-16 text-center">
      <motion.p
        className="text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl"
        style={{ color }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {value}
      </motion.p>
      <motion.p
        className="mt-4 max-w-lg text-lg text-slate-400"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
