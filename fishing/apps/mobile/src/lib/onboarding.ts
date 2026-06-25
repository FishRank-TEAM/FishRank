import * as SecureStore from 'expo-secure-store';

const KEY = 'fishrank_onboarding_v1';

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    /* ignore */
  }
}
