export type Region = {
  regionKey: string;
  regionName: string;
  topNickname?: string;
  topLengthCm?: number;
  speciesName?: string;
  catchCount?: number;
};

export type RegionalNavParams = {
  regionKey: string;
  regionName: string;
  period: string;
  rankingType: string;
  speciesId: string;
};
