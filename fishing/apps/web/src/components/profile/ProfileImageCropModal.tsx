'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { getCroppedImageBlob } from '@/lib/crop-image';

type Props = {
  imageSrc: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ProfileImageCropModal({
  imageSrc,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || loading || processing) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onConfirm(file);
    } catch {
      window.alert('이미지 편집에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setProcessing(false);
    }
  };

  const busy = loading || processing;

  return (
    <div className="profile-crop-backdrop" onClick={onCancel}>
      <div
        className="profile-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-crop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="profile-crop-title" className="profile-crop-title">
          프로필 사진 편집
        </h3>
        <p className="profile-crop-desc">드래그로 위치를 맞추고 슬라이더로 크기를 조절하세요.</p>

        <div className="profile-crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="profile-crop-zoom">
          <span>확대/축소</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={busy}
          />
        </label>

        <div className="profile-crop-actions">
          <button type="button" className="site-btn site-btn-ghost" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className="site-btn site-btn-primary"
            onClick={handleConfirm}
            disabled={busy || !croppedAreaPixels}
          >
            {busy ? '적용 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
}
