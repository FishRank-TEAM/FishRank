import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import BrandLogo from '@/components/BrandLogo';
import AuthScreenLayout from '@/components/auth/AuthScreenLayout';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing, radius } from '@/theme/layout';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    let ok = true;
    if (!email.trim()) {
      setEmailError('이메일을 입력해 주세요');
      ok = false;
    } else setEmailError('');
    if (!password) {
      setPasswordError('비밀번호를 입력해 주세요');
      ok = false;
    } else setPasswordError('');
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      const { accessToken, refreshToken } = res.data.data;
      const me = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await login(accessToken, refreshToken, {
        id: me.data.data.id,
        email: me.data.data.email,
        nickname: me.data.data.nickname,
        role: me.data.data.role,
        profileImage: me.data.data.profileImage,
      });
      toast('로그인되었습니다', 'success');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '로그인에 실패했습니다.';
      const text = typeof msg === 'string' ? msg : '로그인에 실패했습니다.';
      if (status === 401) {
        setPasswordError('이메일 또는 비밀번호가 올바르지 않습니다');
      }
      toast(text, 'error', { persistent: true });
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
          <Text style={styles.tagline}>공정한 기록, 투명한 낚시 랭킹</Text>
        </>
      }
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>로그인</Text>
        <Text style={styles.cardSub}>FishRank 계정으로 시작하세요</Text>

        <TextField
          label="이메일"
          required
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="비밀번호"
          required
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <Button label="로그인" onPress={handleLogin} loading={loading} />

        <Text style={styles.footer}>
          계정이 없으신가요?{' '}
          <Link href="/(auth)/register" style={styles.link}>
            회원가입
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
    lineHeight: 33,
    letterSpacing: -0.5,
    fontFamily: fonts.bold,
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
  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 14,
    color: colors.textSub,
    fontFamily: fonts.regular,
  },
  link: { color: colors.oceanBright, fontWeight: '700' },
});
