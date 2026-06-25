import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import BrandLogo from '@/components/BrandLogo';
import AuthScreenLayout from '@/components/auth/AuthScreenLayout';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing, radius } from '@/theme/layout';

export default function RegisterScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });
      const { user, accessToken, refreshToken } = res.data.data;
      await login(accessToken, refreshToken, {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        profileImage: user.profileImage,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '회원가입에 실패했습니다.';
      setError(typeof msg === 'string' ? msg : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      slideshow
      hero={
        <>
          <BrandLogo size={34} light />
          <Text style={styles.tagline}>FishRank 무료 가입</Text>
          <Text style={styles.heroSub}>가입 후 바로 랭킹·커뮤니티·인증 촬영을 이용할 수 있습니다</Text>
        </>
      }
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>회원가입</Text>
        <Text style={styles.cardSub}>이메일과 닉네임으로 시작하세요</Text>

        <TextField
          label="이메일"
          required
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="닉네임"
          required
          value={nickname}
          onChangeText={setNickname}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="비밀번호"
          required
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="무료 가입하기" onPress={handleRegister} loading={loading} />

        <Text style={styles.footer}>
          이미 계정이 있으신가요?{' '}
          <Link href="/(auth)/login" style={styles.link}>
            로그인
          </Link>
        </Text>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  tagline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.oceanDeep,
    marginBottom: 4,
    fontFamily: fonts.bold,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSub,
    marginBottom: spacing.lg,
    fontFamily: fonts.regular,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 14,
    color: colors.textSub,
    fontFamily: fonts.regular,
  },
  link: { color: colors.oceanBright, fontWeight: '700' },
});
