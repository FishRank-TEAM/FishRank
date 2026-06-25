import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/lib/images';
import { getAvatarInitials, getNicknameColor } from '@/lib/avatar';
import { DEFAULT_AVATAR_SOURCE } from '@/lib/default-avatar';
import { colors } from '@/theme/colors';
import { text } from '@/theme/text';

type Props = {
  nickname: string;
  profileImage?: string | null;
  size?: number;
  onPress?: () => void;
  showEditBadge?: boolean;
  loading?: boolean;
  variant?: 'light' | 'dark';
  /** false면 이니셜 대신 기본 이미지 */
  useDefaultImage?: boolean;
};

export default function UserAvatar({
  nickname,
  profileImage,
  size = 48,
  onPress,
  showEditBadge,
  loading,
  variant = 'light',
  useDefaultImage = true,
}: Props) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [profileImage]);

  const src = profileImage ? getImageUrl(profileImage) : null;
  const showPhoto = Boolean(src && !imgError);
  const initials = getAvatarInitials(nickname);
  const bgColor = getNicknameColor(nickname);
  const borderRadius = size / 2;
  const fontSize = Math.max(10, Math.round(size * 0.3));
  const badgeSize = Math.max(18, Math.round(size * 0.42));
  const badgeIcon = Math.max(9, Math.round(size * 0.22));

  const inner = (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius },
        variant === 'dark' ? styles.wrapDark : styles.wrapLight,
      ]}
    >
      {loading ? (
        <View style={[styles.fill, { borderRadius }]}>
          <ActivityIndicator color={colors.brandGreen} size="small" />
        </View>
      ) : showPhoto ? (
        <Image
          source={{ uri: src! }}
          style={[styles.fill, { borderRadius }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : useDefaultImage ? (
        <Image
          source={DEFAULT_AVATAR_SOURCE}
          style={[styles.fill, { borderRadius }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fill, { borderRadius, backgroundColor: bgColor }]}>
          <Text style={[styles.initial, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {showEditBadge ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}
        >
          <Ionicons name="camera" size={badgeIcon} color="#fff" />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { width: size, height: size },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapLight: { borderWidth: 1, borderColor: colors.border },
  wrapDark: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  initial: { ...text.bold(14), color: '#fff', ...text.center },
  badge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pressed: { opacity: 0.85 },
});
