type GeoFeatureCollection = {
  features: GeoFeature[];
};

type GeoFeature = {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, string>;
};

let sidoPromise: Promise<GeoFeatureCollection> | null = null;
let sigPromise: Promise<GeoFeatureCollection> | null = null;

export function loadSidoGeoJson(): Promise<GeoFeatureCollection> {
  if (!sidoPromise) {
    sidoPromise = fetch('/geo/sido.json').then((res) => {
      if (!res.ok) throw new Error('sido.json 로드 실패');
      return res.json();
    });
  }
  return sidoPromise;
}

export function loadSigGeoJson(): Promise<GeoFeatureCollection> {
  if (!sigPromise) {
    sigPromise = fetch('/geo/sig.json').then((res) => {
      if (!res.ok) throw new Error('sig.json 로드 실패');
      return res.json();
    });
  }
  return sigPromise;
}

export async function loadGeoJsonForZoom(level: number): Promise<GeoFeatureCollection> {
  return level <= 10 ? loadSigGeoJson() : loadSidoGeoJson();
}

export type { GeoFeature, GeoFeatureCollection };
