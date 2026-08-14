import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  extractReservoirRows,
  fetchPublicDataXml,
  pickRecordField,
  PublicDataAuthError,
} from '../common/public-data-request.util';
import { formatKmaDate, getKstNow } from './kma-grid';

export type ReservoirCode = {
  facCode: string;
  facName: string;
  county: string | null;
};

export type ReservoirWaterLevel = {
  facCode: string;
  facName: string;
  county: string | null;
  checkDate: string;
  waterLevelM: number | null;
  ratePercent: number | null;
};

@Injectable()
export class ReservoirPublicClient {
  private readonly logger = new Logger(ReservoirPublicClient.name);

  constructor(private config: ConfigService) {}

  private get serviceKey(): string | null {
    return this.config.get<string>('DATA_GO_KR_SERVICE_KEY') ?? null;
  }

  async searchReservoirs(query: string): Promise<ReservoirCode[]> {
    const baseUrl = this.config.get<string>('RESERVOIR_CODE_URL');
    const serviceKey = this.serviceKey;
    if (!baseUrl || !serviceKey || !query.trim()) return [];

    const q = query.trim();
    try {
      let rows = await this.fetchCodeRows(baseUrl, serviceKey, { county: q });
      if (!rows.length) {
        rows = await this.fetchCodeRows(baseUrl, serviceKey, { fac_name: q });
      }
      return rows;
    } catch (err) {
      if (err instanceof PublicDataAuthError) throw err;
      this.logger.warn(`저수지 코드 조회 실패: ${err}`);
      return [];
    }
  }

  async getWaterLevels(options: {
    facCode: string;
    dateStart?: string;
    dateEnd?: string;
    latestOnly?: boolean;
  }): Promise<ReservoirWaterLevel[]> {
    const baseUrl = this.config.get<string>('RESERVOIR_WATER_LEVEL_URL');
    const serviceKey = this.serviceKey;
    if (!baseUrl || !serviceKey) return [];

    const today = formatKmaDate(getKstNow());
    const dateEnd = options.dateEnd ?? today;
    const dateStart = options.latestOnly ? dateEnd : (options.dateStart ?? shiftDateString(dateEnd, -2));

    try {
      const xml = await fetchPublicDataXml(baseUrl, serviceKey, {
        pageNo: 1,
        numOfRows: options.latestOnly ? 3 : 15,
        fac_code: options.facCode,
        date_s: dateStart,
        date_e: dateEnd,
      });
      return extractReservoirRows(xml)
        .map((row) => this.mapLevelRow(row))
        .filter((row): row is ReservoirWaterLevel => row !== null)
        .sort((a, b) => a.checkDate.localeCompare(b.checkDate));
    } catch (err) {
      if (err instanceof PublicDataAuthError) throw err;
      this.logger.warn(`저수지 수위 조회 실패: ${err}`);
      return [];
    }
  }

  private async fetchCodeRows(
    baseUrl: string,
    serviceKey: string,
    params: Record<string, string>,
  ): Promise<ReservoirCode[]> {
    try {
      const xml = await fetchPublicDataXml(baseUrl, serviceKey, {
        pageNo: 1,
        numOfRows: 50,
        ...params,
      });
      return extractReservoirRows(xml)
        .map((row) => this.mapCodeRow(row))
        .filter((row): row is ReservoirCode => row !== null);
    } catch (err) {
      this.logger.debug(`저수지 코드 조회 (${JSON.stringify(params)}): ${err}`);
      return [];
    }
  }

  private mapCodeRow(row: Record<string, unknown>): ReservoirCode | null {
    const facCode = pickRecordField(row, ['fac_code', 'facCode']);
    const facName = pickRecordField(row, ['fac_name', 'facName']);
    if (!facCode || !facName) return null;
    return {
      facCode,
      facName,
      county: pickRecordField(row, ['county', 'location']),
    };
  }

  private mapLevelRow(row: Record<string, unknown>): ReservoirWaterLevel | null {
    const facCode = pickRecordField(row, ['fac_code', 'facCode']);
    const checkDate = pickRecordField(row, ['check_date', 'checkDate']);
    if (!facCode || !checkDate) return null;

    const levelRaw = pickRecordField(row, ['water_level', 'waterLevel']);
    const rateRaw = pickRecordField(row, ['rate']);

    return {
      facCode,
      facName: pickRecordField(row, ['fac_name', 'facName']) ?? '',
      county: pickRecordField(row, ['county']),
      checkDate,
      waterLevelM: levelRaw != null ? Number(levelRaw) : null,
      ratePercent: rateRaw != null ? Number(rateRaw) : null,
    };
  }
}

function shiftDateString(yyyymmdd: string, days: number): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatKmaDate(date);
}
