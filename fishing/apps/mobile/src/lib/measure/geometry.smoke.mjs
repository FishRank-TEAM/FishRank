// 기하 계산 스모크 테스트: node apps/mobile/src/lib/measure/geometry.smoke.mjs

function pixelToCamera(point, depthMeters, k) {
  return {
    x: ((point.x - k.cx) * depthMeters) / k.fx,
    y: ((point.y - k.cy) * depthMeters) / k.fy,
    z: depthMeters,
  };
}

function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const k = { fx: 1000, fy: 1000, cx: 500, cy: 500, imageWidth: 1000, imageHeight: 1000 };
const head = pixelToCamera({ x: 400, y: 500 }, 1.0, k);
const tail = pixelToCamera({ x: 600, y: 500 }, 1.0, k);
const cm = distance3D(head, tail) * 100;

if (Math.abs(cm - 20) > 0.01) {
  console.error('FAIL expected 20cm got', cm);
  process.exit(1);
}
console.log('OK geometry smoke', cm.toFixed(1), 'cm');
