'use client';

import { useState } from 'react';
import { getImageUrl } from '@/lib/images';

type Props = {
  imageUrl?: string | null;
  size?: number;
};

function FishIcon() {
  return (
    <svg className="catch-thumb-icon" viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="32" rx="28" ry="14" fill="currentColor" opacity="0.15" />
      <path
        d="M8 32c0-8 10-16 24-16s24 8 24 16-10 16-24 16S8 40 8 32zm44 0c0-5-7-10-20-10S12 27 12 32s7 10 20 10 20-5 20-10zM52 32l8 6v-12l-8 6z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function CatchThumbnail({ imageUrl, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl ? getImageUrl(imageUrl) : null;

  if (!src || failed) {
    return (
      <div className="catch-thumb catch-thumb-fallback" style={{ width: size, height: size }}>
        <FishIcon />
      </div>
    );
  }

  return (
    <div className="catch-thumb" style={{ width: size, height: size }}>
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
