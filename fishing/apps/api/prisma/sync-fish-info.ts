import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FishInfoService } from '../src/fish-info/fish-info.service';

async function main() {
  console.log('🐟 iNaturalist + 공공데이터포털 어종 정보 동기화...\n');

  if (!process.env.DATA_GO_KR_SERVICE_KEY) {
    console.log('⚠️  DATA_GO_KR_SERVICE_KEY 미설정 — iNaturalist 데이터만 반영됩니다.');
    console.log('   공공데이터포털(data.go.kr)에서 키 발급 후 .env에 추가하세요.\n');
  }

  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  } catch (err) {
    if (isDbConnectionError(err)) {
      printDbHelp();
      process.exit(1);
    }
    throw err;
  }

  const service = app.get(FishInfoService);

  try {
    const results = await service.syncAll();

    for (const r of results) {
      const detail = [r.iNaturalist, r.publicData].filter(Boolean).join(' · ');
      console.log(r.ok ? '✅' : '❌', `${r.nameKo} (#${r.speciesId})`, detail, r.error ?? '');
    }

    const ok = results.filter((r) => r.ok).length;
    const stats = await service.getDbStats();
    console.log(`\n낚시 핵심 동기화: ${ok}/${results.length}종`);
    console.log(`어종 사전 DB: 총 ${stats.encyclopediaCount}종 (핵심 카탈로그 ${stats.featuredCatalog}종)`);
  } catch (err) {
    if (isDbConnectionError(err)) {
      printDbHelp();
      process.exit(1);
    }
    throw err;
  }

  await app.close();
}

function isDbConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Can't reach database server") || msg.includes('P1001');
}

function printDbHelp() {
  console.error('\n❌ PostgreSQL에 연결할 수 없습니다 (localhost:5433).');
  console.error('   1. Docker Desktop 실행');
  console.error('   2. npm run db:up');
  console.error('   3. npm run sync:fish-info\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
