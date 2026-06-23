import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = res.data.data;
      const me = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await login(accessToken, refreshToken, {
        id: me.data.data.id,
        email: me.data.data.email,
        nickname: me.data.data.nickname,
        role: me.data.data.role,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '로그인에 실패했습니다.';
      setError(typeof msg === 'string' ? msg : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>FishRank</Text>
      <Text style={styles.subtitle}>공식 인증은 앱에서만 가능합니다</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#003d6b" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002847',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#48cae4',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0f3d5c',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e5a7a',
  },
  error: {
    color: '#f87171',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#48cae4',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#003d6b',
    fontWeight: '700',
    fontSize: 16,
  },
});
