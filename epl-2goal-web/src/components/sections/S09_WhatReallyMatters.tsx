'use client';

import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import summaryRegression from '@/data/summary_regression.json';
import type { SummaryRegression } from '@/lib/data';

const RegressionForest = dynamic(() => import('@/components/charts/RegressionForest'), { ssr: false });

const data = summaryRegression as SummaryRegression[];

export default function S09_WhatReallyMatters() {
  return (
    <SectionWrapper id="what-really-matters">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          What <span className="text-accent">Really</span> Matters
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-10">
          Logistic regression reveals which factors actually predict whether a two-goal lead holds,
          controlling for all other variables simultaneously.
        </p>

        <div className="w-full max-w-4xl">
          <RegressionForest data={data} />
        </div>
      </div>
    </SectionWrapper>
  );
}
