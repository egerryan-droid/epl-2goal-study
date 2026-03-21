import dynamic from 'next/dynamic';

const S01_Hero = dynamic(() => import('@/components/sections/S01_Hero'), { ssr: false });
const S02_TheMouth = dynamic(() => import('@/components/sections/S02_TheMouth'), { ssr: false });
const S03_TheData = dynamic(() => import('@/components/sections/S03_TheData'), { ssr: false });
const S04_BigPicture = dynamic(() => import('@/components/sections/S04_BigPicture'), { ssr: false });
const S05_WhenDoesItMatter = dynamic(() => import('@/components/sections/S05_WhenDoesItMatter'), { ssr: false });
const S06_TheLockPoint = dynamic(() => import('@/components/sections/S06_TheLockPoint'), { ssr: false });
const S07_TeamPerformance = dynamic(() => import('@/components/sections/S07_TeamPerformance'), { ssr: false });
const S08_SeasonTrends = dynamic(() => import('@/components/sections/S08_SeasonTrends'), { ssr: false });
const S09_WhatReallyMatters = dynamic(() => import('@/components/sections/S09_WhatReallyMatters'), { ssr: false });
const S10_MatchExplorer = dynamic(() => import('@/components/sections/S10_MatchExplorer'), { ssr: false });
const S11_Verdict = dynamic(() => import('@/components/sections/S11_Verdict'), { ssr: false });

export default function Home() {
  return (
    <main className="bg-surface-dark">
      <S01_Hero />
      <S02_TheMouth />
      <S03_TheData />
      <S04_BigPicture />
      <S05_WhenDoesItMatter />
      <S06_TheLockPoint />
      <S07_TeamPerformance />
      <S08_SeasonTrends />
      <S09_WhatReallyMatters />
      <S10_MatchExplorer />
      <S11_Verdict />
    </main>
  );
}
