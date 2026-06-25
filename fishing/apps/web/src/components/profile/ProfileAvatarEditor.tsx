'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/images';
import { useAuthStore } from '@/store/auth.store';
import ProfileImageCropModal from '@/components/profile/ProfileImageCropModal';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_SIZE_MB = 10;

type Props = {
  nickname: string;
  profileImage?: string | null;
  size?: number;
  editable?: boolean;
  showDelete?: boolean;
};

export default function ProfileAvatarEditor({
  nickname,
  profileImage,
  size = 68,
  editable = false,
  showDelete = false,
}: Props) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const src = profileImage ? getImageUrl(profileImage) : null;
  const initial = nickname[0]?.toUpperCase() ?? '?';

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.patch('/users/me/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data?.profileImage !== undefined) {
        updateUser({ profileImage: data.profileImage });
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      closeCrop();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete('/users/me/profile-image'),
    onSuccess: () => {
      updateUser({ profileImage: undefined });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const busy = uploadMutation.isPending || deleteMutation.isPending;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPT.split(',').some((type) => file.type === type.trim())) {
      window.alert('JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      window.alert(`이미지는 ${MAX_SIZE_MB}MB 이하만 업로드할 수 있습니다.`);
      return;
    }

    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleDelete = () => {
    if (!profileImage || busy) return;
    if (!window.confirm('프로필 사진을 삭제할까요?')) return;
    deleteMutation.mutate();
  };

  if (!editable) {
    return src ? (
      <img src={src} alt="" className="profile-avatar-img" width={size} height={size} />
    ) : (
      <span aria-hidden>{initial}</span>
    );
  }

  return (
    <>
      <div className="profile-avatar-editor" style={{ width: size, height: size }}>
        <button
          type="button"
          className="profile-avatar-editor-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="프로필 사진 변경"
          title="프로필 사진 변경"
        >
          {src ? (
            <img src={src} alt="" className="profile-avatar-editor-img" />
          ) : (
            <span className="profile-avatar-editor-fallback" aria-hidden>
              {initial}
            </span>
          )}
          <span className="profile-avatar-editor-overlay" aria-hidden>
            {busy ? '…' : '📷'}
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="profile-avatar-editor-input"
          onChange={handleFileChange}
        />

        {showDelete && profileImage && (
          <button
            type="button"
            className="profile-avatar-editor-remove"
            onClick={handleDelete}
            disabled={busy}
          >
            사진 삭제
          </button>
        )}
      </div>

      {cropSrc && (
        <ProfileImageCropModal
          imageSrc={cropSrc}
          loading={uploadMutation.isPending}
          onCancel={closeCrop}
          onConfirm={(file) => uploadMutation.mutate(file)}
        />
      )}
    </>
  );
}
