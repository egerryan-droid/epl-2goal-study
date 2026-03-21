'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';

interface SectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  dark?: boolean;
}

export default function SectionWrapper({
  children,
  id,
  className = '',
  dark = false,
}: SectionWrapperProps) {
  const { ref, inView } = useInView({ threshold: 0.15 });

  return (
    <section
      id={id}
      ref={ref}
      className={`relative flex min-h-screen items-center ${
        dark ? 'bg-[#1a1a2e]' : 'bg-[#16213e]'
      } ${className}`}
    >
      <motion.div
        className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </section>
  );
}
