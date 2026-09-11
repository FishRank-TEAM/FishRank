export type Confidence = 'low' | 'medium' | 'high' | 'unknown';

export type Intrinsics = {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  imageWidth: number;
  imageHeight: number;
};

export type PixelPoint = { x: number; y: number };

export type Point3D = { x: number; y: number; z: number };

export type LengthResult = {
  lengthCm: number;
  lengthMeters: number;
  head: Point3D;
  tail: Point3D;
  headConfidence: Confidence;
  tailConfidence: Confidence;
  ok: boolean;
  reason?: string;
};

function pixelToCamera(point: PixelPoint, depthMeters: number, k: Intrinsics): Point3D {
  return {
    x: ((point.x - k.cx) * depthMeters) / k.fx,
    y: ((point.y - k.cy) * depthMeters) / k.fy,
    z: depthMeters,
  };
}

function distance3D(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const CONFIDENCE_RANK: Record<Confidence, number> = {
  low: 0,
  unknown: 0,
  medium: 1,
  high: 2,
};

export function isConfidenceAcceptable(
  confidence: Confidence,
  min: Confidence = 'medium',
): boolean {
  return CONFIDENCE_RANK[confidence] >= CONFIDENCE_RANK[min];
}

/**
 * Map image-space pixel to depth-map index and sample meters + confidence.
 */
export function sampleDepthAtPixel(
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  depthWidth: number,
  depthHeight: number,
  depthMeters: number[],
  confidence: Confidence[],
): { depthMeters: number; confidence: Confidence } | null {
  if (imageWidth <= 0 || imageHeight <= 0) return null;
  const u = Math.min(
    depthWidth - 1,
    Math.max(0, Math.round((imageX / imageWidth) * depthWidth)),
  );
  const v = Math.min(
    depthHeight - 1,
    Math.max(0, Math.round((imageY / imageHeight) * depthHeight)),
  );
  const idx = v * depthWidth + u;
  const depth = depthMeters[idx];
  if (!Number.isFinite(depth) || depth <= 0) return null;
  return {
    depthMeters: depth,
    confidence: confidence[idx] ?? 'unknown',
  };
}

/**
 * Compute fish length (cm) from head/tail image pixels + a captured depth frame.
 * Applies optional scale bias from calibration (default 1).
 */
export function computeLengthCm(params: {
  head: PixelPoint;
  tail: PixelPoint;
  intrinsics: Intrinsics;
  depthWidth: number;
  depthHeight: number;
  depthMeters: number[];
  confidence: Confidence[];
  minConfidence?: Confidence;
  scaleBias?: number;
}): LengthResult {
  const {
    head,
    tail,
    intrinsics,
    depthWidth,
    depthHeight,
    depthMeters,
    confidence,
    minConfidence = 'medium',
    scaleBias = 1,
  } = params;

  const headSample = sampleDepthAtPixel(
    head.x,
    head.y,
    intrinsics.imageWidth,
    intrinsics.imageHeight,
    depthWidth,
    depthHeight,
    depthMeters,
    confidence,
  );
  const tailSample = sampleDepthAtPixel(
    tail.x,
    tail.y,
    intrinsics.imageWidth,
    intrinsics.imageHeight,
    depthWidth,
    depthHeight,
    depthMeters,
    confidence,
  );

  if (!headSample || !tailSample) {
    return {
      lengthCm: 0,
      lengthMeters: 0,
      head: { x: 0, y: 0, z: 0 },
      tail: { x: 0, y: 0, z: 0 },
      headConfidence: headSample?.confidence ?? 'unknown',
      tailConfidence: tailSample?.confidence ?? 'unknown',
      ok: false,
      reason: 'depth_unavailable',
    };
  }

  if (
    !isConfidenceAcceptable(headSample.confidence, minConfidence) ||
    !isConfidenceAcceptable(tailSample.confidence, minConfidence)
  ) {
    return {
      lengthCm: 0,
      lengthMeters: 0,
      head: pixelToCamera(head, headSample.depthMeters, intrinsics),
      tail: pixelToCamera(tail, tailSample.depthMeters, intrinsics),
      headConfidence: headSample.confidence,
      tailConfidence: tailSample.confidence,
      ok: false,
      reason: 'low_confidence',
    };
  }

  const head3 = pixelToCamera(head, headSample.depthMeters, intrinsics);
  const tail3 = pixelToCamera(tail, tailSample.depthMeters, intrinsics);
  const meters = distance3D(head3, tail3) * scaleBias;
  const cm = meters * 100;

  if (!Number.isFinite(cm) || cm <= 0 || cm > 500) {
    return {
      lengthCm: 0,
      lengthMeters: 0,
      head: head3,
      tail: tail3,
      headConfidence: headSample.confidence,
      tailConfidence: tailSample.confidence,
      ok: false,
      reason: 'out_of_range',
    };
  }

  return {
    lengthCm: Math.round(cm * 10) / 10,
    lengthMeters: meters,
    head: head3,
    tail: tail3,
    headConfidence: headSample.confidence,
    tailConfidence: tailSample.confidence,
    ok: true,
  };
}

/** Average multiple length samples and drop outliers beyond 1.5 * IQR or median±15%. */
export function averageLengthsCm(samples: number[]): number | null {
  const valid = samples.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  if (valid.length < 3) {
    const mean = valid.reduce((s, n) => s + n, 0) / valid.length;
    return Math.round(mean * 10) / 10;
  }

  const median = valid[Math.floor(valid.length / 2)];
  const filtered = valid.filter((n) => Math.abs(n - median) / median <= 0.15);
  const use = filtered.length >= 2 ? filtered : valid;
  const mean = use.reduce((s, n) => s + n, 0) / use.length;
  return Math.round(mean * 10) / 10;
}
