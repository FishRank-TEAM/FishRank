package expo.modules.lidardepth

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LidarDepthModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LidarDepth")

    AsyncFunction("isSupported") {
      false
    }

    AsyncFunction("startSession") {
      false
    }

    AsyncFunction("stopSession") { }

    AsyncFunction("getDepthAt") { _: Double, _: Double ->
      null
    }

    AsyncFunction("getCameraIntrinsics") {
      null
    }

    AsyncFunction("captureDepthFrame") {
      null
    }
  }
}
