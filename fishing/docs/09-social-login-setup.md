# 소셜 로그인 설정 가이드

## 카카오 로그인

### 1. 카카오 개발자 앱 등록
1. [developers.kakao.com](https://developers.kakao.com) → 내 애플리케이션 → 앱 추가
2. 앱 이름: `FishRank`, 사업자명 입력
3. 플랫폼 → Web → 사이트 도메인: `http://localhost:3000`
4. 카카오 로그인 활성화
5. Redirect URI: `http://localhost:4000/api/v1/auth/kakao/callback`
6. 동의항목: 닉네임, 프로필 사진, 이메일(선택) 설정

### 2. 앱 키 확인
- REST API 키 → `KAKAO_CLIENT_ID`에 입력

### 3. 환경변수 설정 (apps/api/.env)
```
KAKAO_CLIENT_ID=발급받은_REST_API_키
KAKAO_CALLBACK_URL=http://localhost:4000/api/v1/auth/kakao/callback
```

---

## 구글 로그인

### 1. Google Cloud Console 설정
1. [console.cloud.google.com](https://console.cloud.google.com) → 새 프로젝트
2. API 및 서비스 → OAuth 동의 화면 설정
3. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 만들기
4. 승인된 리디렉션 URI: `http://localhost:4000/api/v1/auth/google/callback`

### 2. 환경변수 설정 (apps/api/.env)
```
GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
GOOGLE_CLIENT_SECRET=발급받은_클라이언트_시크릿
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
```

### 3. 패키지 설치
```bash
cd apps/api
pnpm add passport-kakao passport-google-oauth20
pnpm add -D @types/passport-google-oauth20
```

---

## 에스크로 결제 (Toss Payments)

### 1. Toss Payments 가맹점 등록
- [developers.tosspayments.com](https://developers.tosspayments.com) → 회원가입
- 테스트 키 발급 (개발 단계에서 실제 결제 없이 테스트 가능)

### 2. 환경변수 설정
```
TOSS_CLIENT_KEY=test_ck_발급받은키
TOSS_SECRET_KEY=test_sk_발급받은키
```

### 3. 에스크로 결제 흐름
```
사용자 → 결제 요청 → Toss 결제창 → 결제 완료 콜백
→ NestJS: 결제 검증 → tournament_entries.payment_status = 'paid'
→ 대회 종료 후 → 관리자 정산 승인 → 상금 지급
```
