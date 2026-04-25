'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import DeckChrome from '@/components/layout/DeckChrome';

const S01_Hero = dynamic(() => import('@/components/sections/S01_Hero'), { ssr: false });
const S02_TheMouth = dynamic(() => import('@/components/sections/S02_TheMouth'), { ssr: false });
const S02b_InTheirWords = dynamic(() => import('@/components/sections/S02b_InTheirWords'), { ssr: false });
const S03_TheData = dynamic(() => import('@/components/sections/S03_TheData'), { ssr: false });
const S04_BigPicture = dynamic(() => import('@/components/sections/S04_BigPicture'), { ssr: false });
const S04b_DrawDeepDive = dynamic(() => import('@/components/sections/S04b_DrawDeepDive'), { ssr: false });
const S05_WhenDoesItMatter = dynamic(() => import('@/components/sections/S05_WhenDoesItMatter'), { ssr: false });
const S05b_CollapseTimeline = dynamic(() => import('@/components/sections/S05b_CollapseTimeline'), { ssr: false });
const S06_TheLockPoint = dynamic(() => import('@/components/sections/S06_TheLockPoint'), { ssr: false });
const S06b_SankeySlide = dynamic(() => import('@/components/sections/S06b_SankeySlide'), { ssr: false });
const S07_TeamPerformance = dynamic(() => import('@/components/sections/S07_TeamPerformance'), { ssr: false });
const S07b_PointsDropped = dynamic(() => import('@/components/sections/S07b_PointsDropped'), { ssr: false });
const S08_SeasonTrends = dynamic(() => import('@/components/sections/S08_SeasonTrends'), { ssr: false });
const S09_WhatReallyMatters = dynamic(() => import('@/components/sections/S09_WhatReallyMatters'), { ssr: false });
const S09b_KeyFindings = dynamic(() => import('@/components/sections/S09b_KeyFindings'), { ssr: false });
const S10_MatchExplorer = dynamic(() => import('@/components/sections/S10_MatchExplorer'), { ssr: false });
const S11_Verdict = dynamic(() => import('@/components/sections/S11_Verdict'), { ssr: false });

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Force scroll to top on page load (prevents snap container restoring mid-page)
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  return (
    <main ref={mainRef} className="h-screen snap-y snap-mandatory overflow-y-auto bg-surface-dark">
      <DeckChrome />
      <S01_Hero />
      <S02_TheMouth />
      <S02b_InTheirWords />
      <S03_TheData />
      <S04_BigPicture />
      <S04b_DrawDeepDive />
      <S05_WhenDoesItMatter />
      <S05b_CollapseTimeline />
      <S06_TheLockPoint />
      <S06b_SankeySlide />
      <S07_TeamPerformance />
      <S07b_PointsDropped />
      <S08_SeasonTrends />
      <S09_WhatReallyMatters />
      <S09b_KeyFindings />
      <S10_MatchExplorer />
      <S11_Verdict />
    </main>
  );
}
