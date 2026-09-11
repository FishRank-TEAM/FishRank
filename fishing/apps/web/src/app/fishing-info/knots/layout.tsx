import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '낚시 매듭 가이드 | FishRank',
  description:
    '터미널·결속·고리·릴 매듭을 난이도·용도별로 정리한 FishRank 매듭 가이드입니다.',
};

export default function KnotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
