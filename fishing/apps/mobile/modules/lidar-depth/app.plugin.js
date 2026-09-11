const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Camera usage copy for LiDAR depth measurement.
 * Does NOT set UIRequiredDeviceCapabilities=arkit so non-Pro devices can still install the app.
 * @param {import('@expo/config-plugins').ExpoConfig} config
 */
function withLidarDepth(config) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults;
    if (!plist.NSCameraUsageDescription) {
      plist.NSCameraUsageDescription =
        '정밀 측정을 위해 카메라와 LiDAR 깊이가 필요합니다.';
    }
    return config;
  });
}

module.exports = withLidarDepth;
