# DB 스키마 및 ERD

> **DB**: PostgreSQL  
> **ORM**: Prisma (NestJS)

---

## 테이블 목록

| 테이블 | 설명 |
|---|---|
| `users` | 사용자 계정 |
| `catches` | 낚시 기록 (업로드 단위) |
| `fish_species` | 어종 마스터 데이터 |
| `rankings` | 주간/어종별 랭킹 캐시 |
| `certifications` | 인증 상세 결과 |

---

## ERD (텍스트)

```
users
  └── catches (1:N)
        └── certifications (1:1)
        └── fish_species (N:1)

fish_species
  └── catches (1:N)
  └── rankings (1:N)

rankings
  └── users (N:1)
  └── fish_species (N:1)
```

---

## 테이블 상세 스키마

### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  nickname      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),                    -- 소셜 로그인은 NULL
  provider      VARCHAR(20) DEFAULT 'email',     -- 'email' | 'kakao'
  provider_id   VARCHAR(255),                    -- 소셜 로그인 ID
  profile_image VARCHAR(500),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  deleted_at    TIMESTAMP                        -- soft delete
);
```

### `fish_species`

```sql
CREATE TABLE fish_species (
  id              SERIAL PRIMARY KEY,
  name_ko         VARCHAR(50) NOT NULL,          -- 한국어 이름 (배스, 참돔 등)
  name_en         VARCHAR(50),
  rarity_weight   DECIMAL(3,1) DEFAULT 1.0,      -- 랭킹 가중치
  min_length_cm   INTEGER,                       -- 합법 포획 최소 사이즈 (선택)
  image_url       VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

**초기 데이터**:

| id | name_ko | rarity_weight |
|---|---|---|
| 1 | 배스 | 1.0 |
| 2 | 쏘가리 | 1.5 |
| 3 | 가물치 | 1.3 |
| 4 | 참돔 | 1.8 |
| 5 | 광어 | 1.6 |
| 6 | 우럭 | 1.2 |
| 99 | 기타 | 1.0 |

### `catches`

```sql
CREATE TABLE catches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  fish_species_id INTEGER REFERENCES fish_species(id),
  
  -- 업로드 정보
  image_url       VARCHAR(500) NOT NULL,          -- S3 원본 이미지
  image_thumb_url VARCHAR(500),                   -- 썸네일
  
  -- AI 측정 결과
  length_cm       DECIMAL(5,1),                   -- 최종 인정 길이
  ai_length_cm    DECIMAL(5,1),                   -- AI 측정 원본값
  ai_confidence   DECIMAL(4,3),                   -- AI 신뢰도 (0~1)
  
  -- 랭킹 점수
  rank_score      DECIMAL(8,2),                   -- length_cm × rarity_weight
  
  -- 위치 (선택)
  location_lat    DECIMAL(9,6),
  location_lng    DECIMAL(9,6),
  location_name   VARCHAR(100),                   -- 직접 입력 (예: "춘천 소양강")
  
  -- 상태
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  
  -- 메모
  memo            TEXT,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  deleted_at      TIMESTAMP
);
```

### `certifications`

```sql
CREATE TABLE certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id        UUID UNIQUE NOT NULL REFERENCES catches(id),
  
  -- 인증 등급
  grade           CHAR(1) NOT NULL,               -- 'S' | 'A' | 'B'
  
  -- 줄자 인식 결과
  ruler_detected  BOOLEAN DEFAULT FALSE,
  ruler_start_px  INTEGER,                        -- 픽셀 좌표
  ruler_end_px    INTEGER,
  ruler_length_cm DECIMAL(5,1),                   -- 줄자로 읽은 길이
  
  -- 어종 분류 결과
  species_detected VARCHAR(50),                   -- 모델이 판별한 어종명
  species_confidence DECIMAL(4,3),
  
  -- 규칙 검증 (촬영 규칙 4가지)
  rule_flat       BOOLEAN DEFAULT FALSE,          -- 바닥에 놓기
  rule_vertical   BOOLEAN DEFAULT FALSE,          -- 수직 촬영
  rule_ruler      BOOLEAN DEFAULT FALSE,          -- 줄자 포함
  rule_full_body  BOOLEAN DEFAULT FALSE,          -- 머리·꼬리 전체 포함
  
  -- 처리 시간
  processed_at    TIMESTAMP,
  error_message   TEXT,                           -- 처리 실패 시 사유
  
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### `rankings`

```sql
CREATE TABLE rankings (
  id              SERIAL PRIMARY KEY,
  
  -- 랭킹 분류 기준
  period_type     VARCHAR(20) NOT NULL,           -- 'weekly' | 'monthly' | 'alltime'
  period_key      VARCHAR(20) NOT NULL,           -- '2026-W25' | '2026-06' | 'all'
  fish_species_id INTEGER REFERENCES fish_species(id),  -- NULL이면 전체 어종
  
  -- 랭킹 내용
  user_id         UUID NOT NULL REFERENCES users(id),
  catch_id        UUID NOT NULL REFERENCES catches(id),
  rank            INTEGER NOT NULL,
  rank_score      DECIMAL(8,2) NOT NULL,
  length_cm       DECIMAL(5,1) NOT NULL,
  
  -- 캐시 갱신 시간
  calculated_at   TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(period_type, period_key, fish_species_id, rank)
);
```

---

## Prisma Schema 예시

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  nickname     String    @unique
  passwordHash String?   @map("password_hash")
  provider     String    @default("email")
  providerId   String?   @map("provider_id")
  profileImage String?   @map("profile_image")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  catches  Catch[]
  rankings Ranking[]

  @@map("users")
}

model FishSpecies {
  id             Int      @id @default(autoincrement())
  nameKo         String   @map("name_ko")
  nameEn         String?  @map("name_en")
  rarityWeight   Decimal  @default(1.0) @map("rarity_weight")
  minLengthCm    Int?     @map("min_length_cm")
  imageUrl       String?  @map("image_url")
  createdAt      DateTime @default(now()) @map("created_at")

  catches  Catch[]
  rankings Ranking[]

  @@map("fish_species")
}

model Catch {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  fishSpeciesId Int?      @map("fish_species_id")
  imageUrl      String    @map("image_url")
  imageThumbUrl String?   @map("image_thumb_url")
  lengthCm      Decimal?  @map("length_cm")
  aiLengthCm    Decimal?  @map("ai_length_cm")
  aiConfidence  Decimal?  @map("ai_confidence")
  rankScore     Decimal?  @map("rank_score")
  locationLat   Decimal?  @map("location_lat")
  locationLng   Decimal?  @map("location_lng")
  locationName  String?   @map("location_name")
  status        String    @default("pending")
  memo          String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  user          User           @relation(fields: [userId], references: [id])
  fishSpecies   FishSpecies?   @relation(fields: [fishSpeciesId], references: [id])
  certification Certification?
  rankings      Ranking[]

  @@map("catches")
}

model Certification {
  id                 String   @id @default(uuid())
  catchId            String   @unique @map("catch_id")
  grade              String
  rulerDetected      Boolean  @default(false) @map("ruler_detected")
  rulerStartPx       Int?     @map("ruler_start_px")
  rulerEndPx         Int?     @map("ruler_end_px")
  rulerLengthCm      Decimal? @map("ruler_length_cm")
  speciesDetected    String?  @map("species_detected")
  speciesConfidence  Decimal? @map("species_confidence")
  ruleFlat           Boolean  @default(false) @map("rule_flat")
  ruleVertical       Boolean  @default(false) @map("rule_vertical")
  ruleRuler          Boolean  @default(false) @map("rule_ruler")
  ruleFullBody       Boolean  @default(false) @map("rule_full_body")
  processedAt        DateTime? @map("processed_at")
  errorMessage       String?  @map("error_message")
  createdAt          DateTime @default(now()) @map("created_at")

  catch Catch @relation(fields: [catchId], references: [id])

  @@map("certifications")
}

model Ranking {
  id            Int      @id @default(autoincrement())
  periodType    String   @map("period_type")
  periodKey     String   @map("period_key")
  fishSpeciesId Int?     @map("fish_species_id")
  userId        String   @map("user_id")
  catchId       String   @map("catch_id")
  rank          Int
  rankScore     Decimal  @map("rank_score")
  lengthCm      Decimal  @map("length_cm")
  calculatedAt  DateTime @default(now()) @map("calculated_at")

  user        User        @relation(fields: [userId], references: [id])
  catch       Catch       @relation(fields: [catchId], references: [id])
  fishSpecies FishSpecies? @relation(fields: [fishSpeciesId], references: [id])

  @@unique([periodType, periodKey, fishSpeciesId, rank])
  @@map("rankings")
}
```

---

## 인덱스 전략

```sql
-- 랭킹 조회 최적화
CREATE INDEX idx_catches_rank_score ON catches(rank_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_catches_user_id ON catches(user_id);
CREATE INDEX idx_catches_species ON catches(fish_species_id);
CREATE INDEX idx_catches_status ON catches(status);

-- 랭킹 캐시 조회
CREATE INDEX idx_rankings_period ON rankings(period_type, period_key, fish_species_id);
```
