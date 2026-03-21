'use client';

import CountUp from 'react-countup';
import { useInView } from '@/hooks/useInView';

interface KpiCardProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  color?: string;
}

export default function KpiCard({
  value,
  label,
  prefix = '',
  suffix = '',
  decimals = 0,
  color = '#3498db',
}: KpiCardProps) {
  const { ref, inView } = useInView({ threshold: 0.3 });

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl glass card-hover p-6"
    >
      {/* accent glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-30 blur-2xl"
        style={{ backgroundColor: color }}
      />

      <p className="text-4xl font-bold tracking-tight" style={{ color }}>
        {prefix}
        {inView ? (
          <CountUp end={value} decimals={decimals} duration={2} separator="," />
        ) : (
          '0'
        )}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
}
