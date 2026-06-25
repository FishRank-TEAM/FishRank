import { useEffect, useRef, useState } from 'react';
import { Accelerometer, DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

const ROLL_OK = 3;
const PITCH_OK = 6;

export type DeviceLevel = {
  /** 좌우 기울기 (도) */
  roll: number;
  /** 앞뒤 기울기 (도) */
  pitch: number;
  isLevel: boolean;
  sensorAvailable: boolean;
};

/**
 * 가속도·자이로로 수평 상태 추정.
 * Expo Go 실기기에서 동작 (시뮬레이터는 센서 없음).
 */
export function useDeviceLevel(enabled: boolean): DeviceLevel {
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const wasLevel = useRef(false);

  const isLevel = Math.abs(roll) <= ROLL_OK && Math.abs(pitch) <= PITCH_OK;

  useEffect(() => {
    if (!enabled) return;
    let motionSub: { remove: () => void } | null = null;
    let accelSub: { remove: () => void } | null = null;

    const applyAccel = (x: number, y: number, z: number) => {
      setRoll(clampDeg(Math.atan2(x, -z) * (180 / Math.PI)));
      setPitch(clampDeg(Math.atan2(y, -z) * (180 / Math.PI)));
    };

    (async () => {
      const motionOk = await DeviceMotion.isAvailableAsync();
      if (motionOk) {
        setSensorAvailable(true);
        DeviceMotion.setUpdateInterval(80);
        motionSub = DeviceMotion.addListener((data) => {
          if (data.rotation) {
            const g = data.rotation.gamma * (180 / Math.PI);
            const b = data.rotation.beta * (180 / Math.PI);
            setRoll(clampDeg(g));
            setPitch(clampDeg(b));
            return;
          }
          if (data.accelerationIncludingGravity) {
            applyAccel(data.accelerationIncludingGravity.x, data.accelerationIncludingGravity.y, data.accelerationIncludingGravity.z);
          }
        });
        return;
      }

      const accelOk = await Accelerometer.isAvailableAsync();
      setSensorAvailable(accelOk);
      if (!accelOk) return;

      Accelerometer.setUpdateInterval(80);
      accelSub = Accelerometer.addListener(({ x, y, z }) => applyAccel(x, y, z));
    })();

    return () => {
      motionSub?.remove();
      accelSub?.remove();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !sensorAvailable) return;
    if (isLevel && !wasLevel.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    wasLevel.current = isLevel;
  }, [enabled, isLevel, sensorAvailable]);

  return { roll, pitch, isLevel, sensorAvailable };
}

function clampDeg(v: number) {
  if (v > 90) return 90;
  if (v < -90) return -90;
  return Math.round(v * 10) / 10;
}
