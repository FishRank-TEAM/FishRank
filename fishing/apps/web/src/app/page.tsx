import Link from 'next/link';
import HeroBanner from '@/components/HeroBanner';
import HomeHeroText from '@/components/home/HomeHeroText';
import HomeStatsBar from '@/components/home/HomeStatsBar';
import HomeWeeklyRanking from '@/components/home/HomeWeeklyRanking';
import HomeSidebar from '@/components/home/HomeSidebar';
import HomeFeedbackSection from '@/components/home/HomeFeedbackSection';
import { fetchHomeData } from '@/lib/server-api';

export default async function HomePage() {
  const { rankings, speciesSpotlight, tournaments, posts, announcements } = await fetchHomeData();

  return (
    <main className="home">
      <HeroBanner>
        <div className="home-hero-content">
          <HomeHeroText />
          <div className="home-hero-actions">
            <Link href="/ranking" className="home-btn home-btn-primary">
              주간 랭킹 보기
            </Link>
            <Link href="/ranking/regional" className="home-btn home-btn-ghost">
              지역별 랭킹
            </Link>
          </div>
        </div>
      </HeroBanner>

      <HomeStatsBar
        rankings={rankings}
        tournaments={tournaments}
        speciesSpotlight={speciesSpotlight}
      />

      <div className="home-container home-main-grid">
        <HomeWeeklyRanking rankings={rankings} />
        <HomeSidebar tournaments={tournaments} posts={posts} announcements={announcements} />
      </div>

      <HomeFeedbackSection />
    </main>
  );
}
