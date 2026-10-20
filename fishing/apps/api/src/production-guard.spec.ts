import { assertProductionAiSecret, shouldExposeSwagger } from './production-guard';

describe('production guard', () => {
  it('개발 환경에서는 Swagger를 열고 기본 AI 시크릿을 허용한다', () => {
    expect(shouldExposeSwagger(undefined)).toBe(true);
    expect(shouldExposeSwagger('development')).toBe(true);
    expect(() => assertProductionAiSecret('development', 'fishrank_ai_internal_secret')).not.toThrow();
    expect(() => assertProductionAiSecret(undefined, '')).not.toThrow();
  });

  it('운영에서는 Swagger를 닫고 기본 AI 시크릿을 거절한다', () => {
    expect(shouldExposeSwagger('production')).toBe(false);
    expect(() => assertProductionAiSecret('production', 'fishrank_ai_internal_secret')).toThrow(/AI_SERVER_SECRET/);
    expect(() => assertProductionAiSecret('production', '   ')).toThrow(/AI_SERVER_SECRET/);
    expect(() => assertProductionAiSecret('production', 'a-real-production-secret')).not.toThrow();
  });
});
