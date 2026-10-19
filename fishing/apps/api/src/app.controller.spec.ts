import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from './app.controller';
import { API_GLOBAL_PREFIX, GLOBAL_PREFIX_EXCLUDES } from './app-prefix';

describe('AppController health', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: GLOBAL_PREFIX_EXCLUDES });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(['/health', '/api/v1/health'])('GET %s 는 ok 를 반환한다', async (path) => {
    const res = await request(app.getHttpServer()).get(path).expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('글로벌 prefix가 한 번 더 붙지 않는다', async () => {
    await request(app.getHttpServer()).get('/api/v1/api/v1/health').expect(404);
  });
});
