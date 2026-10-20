export const DEFAULT_AI_INTERNAL_SECRET = 'fishrank_ai_internal_secret';

export function shouldExposeSwagger(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}

/** 운영에서 비어 있거나 저장소 기본 시크릿이면 AI 호출을 막기 위해 기동을 실패시킨다. */
export function assertProductionAiSecret(
  nodeEnv: string | undefined,
  secret: string | undefined | null,
): void {
  if (nodeEnv !== 'production') return;
  const value = secret?.trim() ?? '';
  if (!value || value === DEFAULT_AI_INTERNAL_SECRET) {
    throw new Error(
      '운영 환경에서는 AI_SERVER_SECRET을 기본값이 아닌 16자 이상의 값으로 설정해야 합니다.',
    );
  }
}
