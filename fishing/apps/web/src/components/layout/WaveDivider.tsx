type Props = {
  flip?: boolean;
  /** 두 겹 파도 — 뒤 레이어는 위상을 엇갈려 깊이감 표현 */
  layered?: boolean;
};

const WAVE_FRONT =
  'M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 L1440,48 L0,48 Z';

/** 앞 파도와 crest/trough가 반대로 맞물리는 경로 */
const WAVE_BACK =
  'M0,28 C240,4 480,36 720,12 C960,36 1200,4 1440,28 L1440,48 L0,48 Z';

function WaveSvg({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export default function WaveDivider({ flip = false, layered = false }: Props) {
  if (layered) {
    return (
      <div className={`wave-stack${flip ? ' wave-stack-flip' : ''}`} aria-hidden>
        <div className="wave-divider wave-divider-back">
          <WaveSvg path={WAVE_BACK} />
        </div>
        <div className="wave-divider wave-divider-front">
          <WaveSvg path={WAVE_FRONT} />
        </div>
      </div>
    );
  }

  return (
    <div className={`wave-divider${flip ? ' wave-divider-flip' : ''}`} aria-hidden>
      <WaveSvg path={WAVE_FRONT} />
    </div>
  );
}
