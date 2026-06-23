# API 명세서

> **서버 구성**
> - `Next.js` (프론트 + BFF, 포트 3000)
> - `NestJS` (백엔드 API, 포트 4000)
> - `FastAPI` (AI 서버, 포트 8000)

---

## 기본 규칙

### Base URL

| 환경 | NestJS | FastAPI |
|---|---|---|
| 로컬 | `http://localhost:4000/api/v1` | `http://localhost:8000` |
| 프로덕션 | `https://api.fishrank.kr/v1` | 내부 통신 (외부 노출 X) |

### 인증 방식

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

- Access Token 유효기간: **1시간**
- Refresh Token 유효기간: **30일**
- 인증 필요 API: `🔒` 표시

### 공통 응답 형식

```json
{
  "success": true,
  "data": { ... },
  "message": "OK"
}
```

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다."
  }
}
```

---

## 1. 인증 API

### `POST /auth/register` - 이메일 회원가입

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123!",
  "nickname": "낚시왕철수"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "낚시왕철수"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### `POST /auth/login` - 이메일 로그인

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123!"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### `POST /auth/kakao` - 카카오 소셜 로그인

**Request Body**
```json
{
  "kakaoAccessToken": "카카오에서_받은_토큰"
}
```

**Response `200`** — 신규/기존 사용자 동일 응답
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "isNewUser": true
  }
}
```

---

### `POST /auth/refresh` - 토큰 갱신

**Request Body**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
```

---

## 2. 사용자 API

### `GET /users/me` 🔒 - 내 프로필 조회

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "낚시왕철수",
    "profileImage": "https://...",
    "activityRegion": "춘천",
    "fishingCategory": "freshwater",
    "stats": {
      "fishCount": 42,
      "totalPosts": 5
    },
    "posts": [
      {
        "id": 1,
        "title": "춘천 소양강 포인트 후기",
        "viewCount": 128,
        "createdAt": "2026-06-19T00:00:00.000Z",
        "_count": { "comments": 3 }
      }
    ]
  }
}
```

---

### `GET /users/profile/:nickname` - 공개 프로필 조회

닉네임으로 사용자의 공개 프로필, 낚시 기록, 작성 글을 조회한다.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nickname": "낚시왕철수",
      "profileImage": null,
      "activityRegion": "춘천",
      "fishingCategory": "both",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    "stats": {
      "fishCount": 42,
      "totalPosts": 5
    },
    "catches": [ "...최근 인증 기록 최대 6건..." ],
    "posts": [ "...최근 작성 글 최대 10건..." ]
  }
}
```

---

### `PATCH /users/me` 🔒 - 내 프로필 수정

**Request Body** (변경할 필드만)
```json
{
  "activityRegion": "춘천",
  "fishingCategory": "freshwater"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `activityRegion` | string | 주 활동 지역 — `시·도 시·군·구` 형식 (예: `경북 영덕`, `경기 수원`, `서울 강남`) |
| `fishingCategory` | string | `freshwater`(민물) \| `saltwater`(바다) \| `both`(둘 다) |

---

## 3. 낚시 기록 (Catches) API

### `POST /catches` 🔒 - 낚시 기록 업로드

> Next.js → NestJS로 `multipart/form-data` 전송  
> NestJS가 S3 업로드 후 FastAPI AI 처리 큐에 enqueue

**Request** `Content-Type: multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | File | ✅ | 사진 파일 (jpg/png, 최대 10MB) |
| `locationName` | string | ❌ | 낚시 장소 이름 |
| `locationLat` | number | ❌ | 위도 |
| `locationLng` | number | ❌ | 경도 |
| `memo` | string | ❌ | 메모 |

**Response `202`** — AI 처리는 비동기, 즉시 응답
```json
{
  "success": true,
  "data": {
    "catchId": "uuid",
    "status": "pending",
    "message": "AI 분석 중입니다. 잠시 후 결과를 확인하세요."
  }
}
```

---

### `GET /catches/:id` - 낚시 기록 단건 조회

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user": {
      "id": "uuid",
      "nickname": "낚시왕철수",
      "profileImage": "https://..."
    },
    "imageUrl": "https://s3.../image.jpg",
    "imageThumbUrl": "https://s3.../thumb.jpg",
    "fishSpecies": {
      "id": 1,
      "nameKo": "배스",
      "rarityWeight": 1.0
    },
    "lengthCm": 52.5,
    "rankScore": 52.5,
    "locationName": "춘천 소양강",
    "memo": "오늘 대박",
    "status": "approved",
    "certification": {
      "grade": "S",
      "rulerDetected": true,
      "rulerLengthCm": 52.5,
      "speciesDetected": "배스",
      "speciesConfidence": 0.987
    },
    "createdAt": "2026-06-18T12:34:56Z"
  }
}
```

---

### `GET /catches/me` 🔒 - 내 기록 목록

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 20 | 페이지당 개수 |
| `speciesId` | number | - | 어종 필터 |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

---

### `GET /catches/:id/status` 🔒 - AI 처리 상태 폴링

> 업로드 후 프론트에서 주기적으로 호출 (2초 간격, 최대 30초)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "grade": "S",
    "lengthCm": 52.5,
    "fishSpecies": "배스"
  }
}
```

`status` 값: `"pending"` | `"approved"` | `"rejected"`

---

## 4. 랭킹 API

### `GET /rankings` - 랭킹 목록 조회

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `periodType` | string | `weekly` | `weekly` \| `monthly` \| `alltime` |
| `speciesId` | number | - | 어종 필터 (없으면 전체) |
| `limit` | number | 10 | TOP N |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "periodType": "weekly",
    "periodKey": "2026-W25",
    "fishSpecies": { "id": 1, "nameKo": "배스" },
    "rankings": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "nickname": "낚시왕철수",
          "profileImage": "https://..."
        },
        "catch": {
          "id": "uuid",
          "imageThumbUrl": "https://...",
          "locationName": "춘천 소양강"
        },
        "lengthCm": 67.5,
        "rankScore": 67.5,
        "grade": "S"
      }
    ]
  }
}
```

---

## 5. 어종 API

### `GET /species` - 어종 목록

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "id": 1, "nameKo": "배스", "rarityWeight": 1.0, "imageUrl": "https://..." },
    { "id": 2, "nameKo": "쏘가리", "rarityWeight": 1.5, "imageUrl": "https://..." }
  ]
}
```

---

## 7. 커뮤니티 (Posts) API

### `GET /posts` - 게시글 목록

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 20 | 페이지당 개수 |

---

### `GET /posts/:id` - 게시글 상세

---

### `POST /posts` 🔒 - 게시글 작성

**Request Body**
```json
{
  "title": "제목",
  "content": "본문"
}
```

---

### `POST /posts/:id/comments` 🔒 - 댓글 작성

---

### `DELETE /posts/:id` 🔒 - 게시글 삭제 (작성자만)

---

## 8. AI 서버 내부 API (FastAPI)

> NestJS → FastAPI 내부 통신, 외부 노출 없음

### `POST /analyze` - 이미지 분석

**Request Body**
```json
{
  "catchId": "uuid",
  "imageUrl": "s3://bucket/image.jpg"
}
```

**Response `200`**
```json
{
  "catchId": "uuid",
  "rulerDetected": true,
  "rulerLengthCm": 52.3,
  "speciesDetected": "bass",
  "speciesConfidence": 0.987,
  "ruleFlat": true,
  "ruleVertical": true,
  "ruleRuler": true,
  "ruleFullBody": true,
  "grade": "S",
  "errorMessage": null
}
```

---

## 에러 코드 정의

| 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증 토큰 없음 또는 만료 |
| `FORBIDDEN` | 403 | 접근 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `DUPLICATE_EMAIL` | 409 | 이미 사용 중인 이메일 |
| `DUPLICATE_NICKNAME` | 409 | 이미 사용 중인 닉네임 |
| `IMAGE_TOO_LARGE` | 413 | 이미지 크기 초과 (10MB) |
| `INVALID_IMAGE_FORMAT` | 422 | 지원하지 않는 이미지 형식 |
| `AI_PROCESSING_FAILED` | 422 | AI 분석 실패 (재촬영 필요) |
| `INTERNAL_ERROR` | 500 | 서버 오류 |
