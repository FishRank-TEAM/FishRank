import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  captureDepthFrame,
  getCameraIntrinsics,
  getDepthAt,
  isLidarSupported,
  startLidarSession,
  stopLidarSession,
  type CameraIntrinsics,
  type DepthFrameSnapshot,
  type DepthSample,
} from 'lidar-depth';

type LidarState = {
  supported: boolean | null;
  running: boolean;
  error: string | null;
};

export function useLidarDepth(autoStart = false) {
  const [state, setState] = useState<LidarState>({
    supported: null,
    running: false,
    error: null,
  });
  const startedRef = useRef(false);

  const refreshSupport = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setState((s) => ({ ...s, supported: false }));
      return false;
    }
    const supported = await isLidarSupported();
    setState((s) => ({ ...s, supported }));
    return supported;
  }, []);

  const start = useCallback(async () => {
    try {
      const supported = await isLidarSupported();
      if (!supported) {
        setState({ supported: false, running: false, error: '이 기기는 LiDAR scene depth를 지원하지 않습니다.' });
        return false;
      }
      const ok = await startLidarSession();
      startedRef.current = ok;
      setState({ supported: true, running: ok, error: ok ? null : 'ARSession 시작 실패' });
      return ok;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'LiDAR 세션 오류';
      setState({ supported: false, running: false, error: message });
      return false;
    }
  }, []);

  const stop = useCallback(async () => {
    await stopLidarSession();
    startedRef.current = false;
    setState((s) => ({ ...s, running: false }));
  }, []);

  const sampleAt = useCallback(async (x: number, y: number): Promise<DepthSample | null> => {
    return getDepthAt(x, y);
  }, []);

  const intrinsics = useCallback(async (): Promise<CameraIntrinsics | null> => {
    return getCameraIntrinsics();
  }, []);

  const captureFrame = useCallback(async (): Promise<DepthFrameSnapshot | null> => {
    return captureDepthFrame();
  }, []);

  useEffect(() => {
    void refreshSupport();
  }, [refreshSupport]);

  useEffect(() => {
    if (!autoStart) return;
    void start();
    return () => {
      if (startedRef.current) {
        void stopLidarSession();
        startedRef.current = false;
      }
    };
  }, [autoStart, start]);

  return {
    ...state,
    start,
    stop,
    sampleAt,
    intrinsics,
    captureFrame,
    refreshSupport,
  };
}
