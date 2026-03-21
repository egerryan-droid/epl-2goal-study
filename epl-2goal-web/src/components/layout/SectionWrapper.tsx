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
      className={`relative flex h-screen snap-start snap-always items-center overflow-hidden ${
        dark ? 'bg-[#1a1a2e]' : 'bg-[#16213e]'
      } ${className}`}
    >
      {/* Section divider — gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      {/* Subtle center glow for dark sections */}
      {dark && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(15,52,96,0.25) 0%, transparent 60%)',
          }}
        />
      )}

      <motion.div
        className="relative mx-auto w-full max-w-7xl px-6 py-16 sm:px-10 lg:px-16"
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </section>
  );
}
