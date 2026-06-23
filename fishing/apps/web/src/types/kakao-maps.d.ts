declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Map {
    constructor(container: HTMLElement, options: Record<string, unknown>);
    getLevel(): number;
    setCenter(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    addControl(control: unknown, position: unknown): void;
    relayout(): void;
  }

  class Polygon {
    constructor(options: Record<string, unknown>);
    setMap(map: Map | null): void;
    setOptions(options: Record<string, unknown>): void;
  }

  class CustomOverlay {
    constructor(options: Record<string, unknown>);
    setMap(map: Map | null): void;
    setContent(content: string | HTMLElement): void;
    setPosition(position: LatLng): void;
  }

  class InfoWindow {
    constructor(options: { content: string | HTMLElement; removable?: boolean });
    open(map: Map, marker?: unknown): void;
    close(): void;
    setContent(content: string | HTMLElement): void;
  }

  class Marker {
    constructor(options: Record<string, unknown>);
    setMap(map: Map | null): void;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class ZoomControl {}
  class MapTypeControl {}

  enum ControlPosition {
    TOPRIGHT,
    RIGHT,
  }

  namespace event {
    function addListener(target: unknown, type: string, handler: () => void): unknown;
    function removeListener(target: unknown, type: string, handler: unknown): void;
  }
}

interface Window {
  kakao: {
    maps: typeof kakao.maps & {
      load(callback: () => void): void;
    };
  };
}
