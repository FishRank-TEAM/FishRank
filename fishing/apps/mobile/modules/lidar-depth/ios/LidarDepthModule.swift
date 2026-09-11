import ExpoModulesCore
import ARKit
import UIKit
import CoreVideo
import simd

public class LidarDepthModule: Module {
  private let session = ARSession()
  private let sessionQueue = DispatchQueue(label: "com.fishrank.lidar-depth")
  private var delegateProxy: SessionDelegate?
  private var latestSceneDepth: ARDepthData?
  private var latestIntrinsics: simd_float3x3?
  private var latestImageResolution: CGSize = .zero
  private var isRunning = false

  public func definition() -> ModuleDefinition {
    Name("LidarDepth")

    OnCreate {
      let proxy = SessionDelegate { [weak self] frame in
        self?.update(frame: frame)
      }
      self.delegateProxy = proxy
      self.session.delegate = proxy
      self.session.delegateQueue = self.sessionQueue
    }

    OnDestroy {
      self.session.pause()
      self.isRunning = false
      self.latestSceneDepth = nil
      self.delegateProxy = nil
    }

    AsyncFunction("isSupported") { () -> Bool in
      return ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    }

    AsyncFunction("startSession") { () -> Bool in
      guard ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else {
        return false
      }

      let config = ARWorldTrackingConfiguration()
      config.frameSemantics = .sceneDepth
      if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
        config.frameSemantics.insert(.smoothedSceneDepth)
      }
      config.environmentTexturing = .none

      self.session.run(config, options: [.resetTracking, .removeExistingAnchors])
      self.isRunning = true
      return true
    }

    AsyncFunction("stopSession") { () in
      self.session.pause()
      self.isRunning = false
      self.latestSceneDepth = nil
    }

    AsyncFunction("getDepthAt") { (x: Double, y: Double) -> [String: Any]? in
      guard let depthData = self.preferredDepthData() else { return nil }
      let depthMap = depthData.depthMap
      let width = CVPixelBufferGetWidth(depthMap)
      let height = CVPixelBufferGetHeight(depthMap)
      guard width > 0, height > 0 else { return nil }

      let imageW = max(self.latestImageResolution.width, 1)
      let imageH = max(self.latestImageResolution.height, 1)
      let u = Int((CGFloat(x) / imageW) * CGFloat(width)).clamped(to: 0...(width - 1))
      let v = Int((CGFloat(y) / imageH) * CGFloat(height)).clamped(to: 0...(height - 1))

      let depth = Self.readFloat(depthMap, x: u, y: v)
      let confidence = Self.readConfidence(depthData.confidenceMap, x: u, y: v)

      guard depth.isFinite, depth > 0 else { return nil }

      return [
        "depthMeters": Double(depth),
        "confidence": confidence,
        "x": x,
        "y": y,
      ]
    }

    AsyncFunction("getCameraIntrinsics") { () -> [String: Any]? in
      guard let intrinsics = self.latestIntrinsics else { return nil }
      let w = self.latestImageResolution.width
      let h = self.latestImageResolution.height
      guard w > 0, h > 0 else { return nil }

      // ARKit camera.intrinsics is column-major: fx, fy on diagonal; cx, cy in third column.
      return [
        "fx": Double(intrinsics.columns.0.x),
        "fy": Double(intrinsics.columns.1.y),
        "cx": Double(intrinsics.columns.2.x),
        "cy": Double(intrinsics.columns.2.y),
        "imageWidth": Double(w),
        "imageHeight": Double(h),
      ]
    }

    AsyncFunction("captureDepthFrame") { () -> [String: Any]? in
      guard let depthData = self.preferredDepthData(),
            let intrinsics = self.latestIntrinsics else { return nil }

      let depthMap = depthData.depthMap
      let width = CVPixelBufferGetWidth(depthMap)
      let height = CVPixelBufferGetHeight(depthMap)
      guard width > 0, height > 0 else { return nil }

      var depths: [Double] = []
      var confidences: [String] = []
      depths.reserveCapacity(width * height)
      confidences.reserveCapacity(width * height)

      CVPixelBufferLockBaseAddress(depthMap, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }

      var confidenceLocked = false
      if let confidenceMap = depthData.confidenceMap {
        CVPixelBufferLockBaseAddress(confidenceMap, .readOnly)
        confidenceLocked = true
      }
      defer {
        if confidenceLocked, let confidenceMap = depthData.confidenceMap {
          CVPixelBufferUnlockBaseAddress(confidenceMap, .readOnly)
        }
      }

      for y in 0..<height {
        for x in 0..<width {
          depths.append(Double(Self.readFloatUnlocked(depthMap, x: x, y: y)))
          confidences.append(Self.readConfidenceUnlocked(depthData.confidenceMap, x: x, y: y))
        }
      }

      let w = self.latestImageResolution.width
      let h = self.latestImageResolution.height

      return [
        "depthWidth": width,
        "depthHeight": height,
        "depthMeters": depths,
        "confidence": confidences,
        "intrinsics": [
          "fx": Double(intrinsics.columns.0.x),
          "fy": Double(intrinsics.columns.1.y),
          "cx": Double(intrinsics.columns.2.x),
          "cy": Double(intrinsics.columns.2.y),
          "imageWidth": Double(w),
          "imageHeight": Double(h),
        ],
        "capturedAtMs": Date().timeIntervalSince1970 * 1000,
      ]
    }
  }

  fileprivate func update(frame: ARFrame) {
    if let smoothed = frame.smoothedSceneDepth {
      latestSceneDepth = smoothed
    } else if let scene = frame.sceneDepth {
      latestSceneDepth = scene
    }
    latestIntrinsics = frame.camera.intrinsics
    latestImageResolution = frame.camera.imageResolution
  }

  private func preferredDepthData() -> ARDepthData? {
    return latestSceneDepth
  }

  private static func readFloat(_ buffer: CVPixelBuffer, x: Int, y: Int) -> Float {
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    return readFloatUnlocked(buffer, x: x, y: y)
  }

  private static func readFloatUnlocked(_ buffer: CVPixelBuffer, x: Int, y: Int) -> Float {
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return .nan }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
    let ptr = base.advanced(by: y * bytesPerRow).assumingMemoryBound(to: Float32.self)
    return ptr[x]
  }

  private static func readConfidence(_ buffer: CVPixelBuffer?, x: Int, y: Int) -> String {
    guard let buffer else { return "unknown" }
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    return readConfidenceUnlocked(buffer, x: x, y: y)
  }

  private static func readConfidenceUnlocked(_ buffer: CVPixelBuffer?, x: Int, y: Int) -> String {
    guard let buffer, let base = CVPixelBufferGetBaseAddress(buffer) else { return "unknown" }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
    let ptr = base.advanced(by: y * bytesPerRow).assumingMemoryBound(to: UInt8.self)
    switch ptr[x] {
    case 2: return "high"
    case 1: return "medium"
    case 0: return "low"
    default: return "unknown"
    }
  }
}

private final class SessionDelegate: NSObject, ARSessionDelegate {
  private let onFrame: (ARFrame) -> Void

  init(onFrame: @escaping (ARFrame) -> Void) {
    self.onFrame = onFrame
  }

  func session(_ session: ARSession, didUpdate frame: ARFrame) {
    onFrame(frame)
  }
}

private extension Int {
  func clamped(to range: ClosedRange<Int>) -> Int {
    return Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
  }
}
