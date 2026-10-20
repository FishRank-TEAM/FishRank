# 화면 자료

이 폴더의 이미지와 영상은 2026-10-20에 이 저장소의 웹 앱을 로컬에서 실행해 캡처한 것입니다. 스톡 사진이나 생성 이미지가 아닙니다.

## 촬영 조건

- 웹 `http://localhost:3000`, API `http://localhost:4000`
- `fishing/`에서 `npm run db:seed`로 넣은 시드 데이터
- 로그인 화면은 시드 계정 `han@fishrank.demo` (비밀번호는 [로컬 개발 가이드](../../fishing/docs/11-local-development.md))
- 카카오맵 키와 날씨 API 키는 넣지 않았습니다. 출조 지도와 날씨 화면은 그 상태 그대로입니다.
- 공식 줄자 인증 업로드는 웹에서 꺼져 있습니다 (`IS_CERTIFIED_UPLOAD_ENABLED = false`). 웹에서 실제로 열리는 기록 화면은 자랑 기록 폼입니다.

## 파일

| 파일 | 화면 |
| --- | --- |
| `home.jpg` | 홈. 주간 랭킹 요약과 대회·커뮤니티 |
| `ranking.jpg` | 주간 랭킹 표 |
| `ranking-regional.jpg` | 지역별 랭킹. 지도 키 없을 때의 안내 |
| `tournament.jpg` | 대회 목록 |
| `tournament-detail.jpg` | 대회 상세 (6월 전국 배스 대회) |
| `community.jpg` | 커뮤니티 목록 |
| `community-detail.jpg` | 게시글 상세 |
| `encyclopedia.jpg` | 어종 사전 목록 |
| `encyclopedia-detail.jpg` | 배스 상세 |
| `conditions.jpg` | 출조 지도 |
| `weather.jpg` | 날씨. API 키 없을 때의 빈 상태 |
| `fishing-info.jpg` | 낚시 정보 |
| `upload.jpg` | 로그인한 뒤의 자랑 기록 작성 폼. 제출하지 않음 |
| `upload-certified-notice.jpg` | `/upload`. 공식 인증은 앱 전용이라는 안내 |
| `my.jpg` | 마이페이지 인증 기록 |
| `profile.jpg` | 공개 프로필 |
| `login.jpg` | 로그인 |
| `demo-browse.mp4` | 홈 → 랭킹 → 대회 상세 → 커뮤니티 글 → 로그인 → 자랑 기록 폼. 약 59초. 주소창을 직접 치던 구간은 빼고 같은 촬영을 이어 붙였습니다. 폼은 제출하지 않습니다. |

모바일 Expo 웹은 이 자료에 없습니다. 앱은 카메라·보안 저장소 같은 네이티브 모듈을 쓰고, 이번 캡처는 브라우저에서 연 웹 화면만 사용했습니다.
