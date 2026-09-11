/** Calibration bias applied to LiDAR length (Phase 4). Start at 1.0 and tune from field trials. */
export const LIDAR_LENGTH_SCALE_BIAS = 1.0;

/** Reject measurements below this confidence. */
export const LIDAR_MIN_CONFIDENCE = 'medium' as const;

/** Soft max fish length for sanity check (cm). */
export const LIDAR_MAX_LENGTH_CM = 500;
