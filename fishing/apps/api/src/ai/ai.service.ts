import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { AiAnalyzeResult, AiServerHealth } from './ai.types';

export type AiKeypointsResult = {
  head: { x: number; y: number };
  tail: { x: number; y: number };
  confidence: number;
  method: string;
  imageWidth: number;
  imageHeight: number;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('AI_SERVER_URL', 'http://localhost:8000');
  }

  private get secret(): string {
    return this.config.get<string>('AI_SERVER_SECRET', '');
  }

  async analyze(catchId: string, imageUrl: string): Promise<AiAnalyzeResult> {
    try {
      const { data } = await axios.post<AiAnalyzeResult>(
        `${this.baseUrl}/analyze`,
        { catchId, imageUrl },
        {
          headers: { 'X-Internal-Secret': this.secret },
          timeout: 90_000,
        },
      );
      return data;
    } catch (error) {
      this.logger.error(`AI 서버 호출 실패: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException(
        'AI 분석 서버에 연결할 수 없습니다. AI 서버가 실행 중인지 확인해 주세요.',
      );
    }
  }

  async keypoints(imageUrl: string): Promise<AiKeypointsResult> {
    try {
      const { data } = await axios.post<AiKeypointsResult>(
        `${this.baseUrl}/keypoints`,
        { imageUrl },
        {
          headers: { 'X-Internal-Secret': this.secret },
          timeout: 60_000,
        },
      );
      return data;
    } catch (error) {
      this.logger.error(`키포인트 호출 실패: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException(
        '키포인트 서버에 연결할 수 없습니다. AI 서버가 실행 중인지 확인해 주세요.',
      );
    }
  }

  async getServerHealth(): Promise<AiServerHealth | null> {
    try {
      const { data } = await axios.get<AiServerHealth>(`${this.baseUrl}/health`, { timeout: 10_000 });
      return data;
    } catch {
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    const health = await this.getServerHealth();
    return health?.status === 'ok';
  }
}
