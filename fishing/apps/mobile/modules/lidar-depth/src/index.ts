import { requireNativeModule, Platform } from 'expo-modules-core';

export type DepthConfidence = 'low' | 'medium' | 'high' | 'unknown';

export type DepthSample = {
  depthMeters: number;
  confidence: DepthConfidence;
  x: number;
  y: number;
};

export type CameraIntrinsics = {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  imageWidth: number;
  imageHeight: number;
};

export type DepthFrameSnapshot = {
  depthWidth: number;
  depthHeight: number;
  depthMeters: number[];
  confidence: Array<DepthConfidence>;
  intrinsics: CameraIntrinsics;
  capturedAtMs: number;
};

type LidarDepthAPI = {
  isSupported(): Promise<boolean>;
  startSession(): Promise<boolean>;
  stopSession(): Promise<void>;
  getDepthAt(x: number, y: number): Promise<DepthSample | null>;
  getCameraIntrinsics(): Promise<CameraIntrinsics | null>;
  captureDepthFrame(): Promise<DepthFrameSnapshot | null>;
};

const fallback: LidarDepthAPI = {
  async isSupported() {
    return false;
  },
  async startSession() {
    return false;
  },
  async stopSession() {},
  async getDepthAt() {
    return null;
  },
  async getCameraIntrinsics() {
    return null;
  },
  async captureDepthFrame() {
    return null;
  },
};

function loadNative(): LidarDepthAPI {
  if (Platform.OS !== 'ios') {
    return fallback;
  }
  try {
    return requireNativeModule('LidarDepth') as LidarDepthAPI;
  } catch {
    return fallback;
  }
}

const LidarDepth = loadNative();

export async function isLidarSupported(): Promise<boolean> {
  return LidarDepth.isSupported();
}

export async function startLidarSession(): Promise<boolean> {
  return LidarDepth.startSession();
}

export async function stopLidarSession(): Promise<void> {
  return LidarDepth.stopSession();
}

export async function getDepthAt(x: number, y: number): Promise<DepthSample | null> {
  return LidarDepth.getDepthAt(x, y);
}

export async function getCameraIntrinsics(): Promise<CameraIntrinsics | null> {
  return LidarDepth.getCameraIntrinsics();
}

export async function captureDepthFrame(): Promise<DepthFrameSnapshot | null> {
  return LidarDepth.captureDepthFrame();
}

export default LidarDepth;
