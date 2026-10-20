import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX, GLOBAL_PREFIX_EXCLUDES } from './app-prefix';
import { assertProductionAiSecret, shouldExposeSwagger } from './production-guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: GLOBAL_PREFIX_EXCLUDES });

  const isDev = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: isDev ? true : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  assertProductionAiSecret(process.env.NODE_ENV, process.env.AI_SERVER_SECRET);

  const exposeSwagger = shouldExposeSwagger(process.env.NODE_ENV);
  if (exposeSwagger) {
    const config = new DocumentBuilder()
      .setTitle('FishRank API')
      .setDescription('낚시 랭킹 서비스 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`🎣 FishRank API 서버 실행 중: http://localhost:${port}`);
  if (host === '0.0.0.0') {
    console.log(`📱 LAN(모바일) 접속: http://<PC_IP>:${port}/api/v1`);
  }
  if (exposeSwagger) {
    console.log(`📋 Swagger 문서: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
