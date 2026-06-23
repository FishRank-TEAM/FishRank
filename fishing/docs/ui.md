## 디자인 시스템 — FishRank

### 색상 팔레트
Primary Navy   : #0b1f3a  (헤더, 주요 배경)
Primary Navy 2 : #122848  (카드 배경, 서브 섹션)
Primary Blue   : #1565c0  (주요 버튼, 링크, 강조)
Primary Blue 2 : #1976d2  (버튼 호버)
Sky Blue Light : #e3f2fd  (배경 강조, 뱃지 배경)
Sky Blue Mid   : #bbdefb  (테두리 강조)
Accent Sky     : #64b5f6  (히어로 강조 텍스트, 로고 포인트)
Live Green     : #4caf50  (실시간 인디케이터)
Contest Amber  : #f57c00  (대회/이벤트 강조)
Warning Amber  : #ffb74d  (대회 상금 텍스트)

Background     : #f5f7fa  (페이지 전체 배경)
Surface White  : #ffffff  (카드 배경)
Border Default : #dde3ea  (카드/구분선 테두리)

Text Primary   : #1a2332  (본문 주요 텍스트)
Text Sub       : #546e7a  (보조 텍스트)
Text Muted     : #90a4ae  (시간, 힌트 등 약한 텍스트)

Success Green  : #2e7d32  (인증 완료 텍스트)
Success BG     : #e8f5e9  (인증 완료 뱃지 배경)

---

### 타이포그래피
Font           : 'Noto Sans KR' (Google Fonts)
Fallback       : 'Apple SD Gothic Neo', sans-serif

H1  : 30px / weight 900 / letter-spacing -1px
H2  : 18px / weight 700 / letter-spacing -0.5px
H3  : 16px / weight 700
Body: 14px / weight 400 / line-height 1.7
Sub : 13px / weight 400
Tiny: 11–12px / weight 400 or 500

---

### 공통 컴포넌트 규격

[네비게이션]
- 배경: #0b1f3a / 높이: 52px / 좌우 패딩: 28px
- 로고: 17px / weight 900, 포인트 컬러: #64b5f6
- 메뉴: 13px / rgba(255,255,255,0.75)
- 가입 버튼: #1976d2, 4px radius, 7px 16px 패딩

[버튼]
Primary  : bg #1976d2, color #fff, radius 5px, 12px 22px, 14px/700
Ghost    : bg rgba(255,255,255,0.1), border rgba(255,255,255,0.25), radius 5px
CTA 소형 : bg #1976d2, color #fff, radius 5px, 10px 18px, 13px/700
대회 버튼 : bg #f57c00, color #fff, radius 5px, 동일 패딩

[카드]
기본 카드 : bg #ffffff, border 1px solid #dde3ea, radius 8px, padding 12px 16px
상위 1등  : border-color #ffd54f, background #fffef5
섹션 배경 : #f5f7fa

[뱃지 / 태그]
어종 태그   : bg #e3f2fd, color #0d47a1, 10px/500, radius 3px, 2px 7px
인증 뱃지   : bg #e8f5e9, color #2e7d32, 10px/500, radius 3px, 2px 7px
진행중 태그 : bg rgba(255,152,0,0.2), color #ffb74d, 11px/600, radius 3px, 3px 8px
라이브 점   : 7px circle, bg #4caf50

[랭킹 아이템]
아바타 원   : 38px, border-radius 50%, bg #e3f2fd, color #1565c0, 12px/700
순위 메달   : 이모지 (🥇🥈🥉), font-size 18px
4위 이하    : 14px/700, color #546e7a
크기 수치   : 18px / weight 900 / color #0b1f3a / letter-spacing -0.5px

[통계 스트립]
bg #f0f4f8, border-top/bottom 1px solid #dde3ea
숫자: 19px / weight 900 / color #0b1f3a
라벨: 11px / color #546e7a

[대회 배너]
bg #122848, radius 10px, padding 22px 24px
상금: 20px / weight 900 / color #ffb74d

---

### 디자인 원칙

1. 정보 밀도 우선
   텍스트를 아끼지 않는다. 지역명, 어종, 시간, 크기 등
   구체적인 데이터를 최대한 노출해 실제 서비스처럼 보이게.

2. 실시간 활성화 연출
   "방금 전", "3분 전", "실시간 업데이트 중" 같은
   타임스탬프와 라이브 인디케이터를 적극 활용.

3. 계층 명확화
   Navy 배경(헤더/히어로) → 밝은 회색 배경(섹션) →
   흰색 카드 순서로 명확하게 구분.

4. 한국 사용자 친화
   지역명(거제, 여수, 제주 등) + 닉네임 조합으로
   커뮤니티 소속감 연출. 영어보다 한국어 우선.

5. 신뢰감 있는 인증
   AI 인증 뱃지는 항상 그린 계열로 표시.
   랭킹 상위권에는 별도 카드 강조(골드 테두리).

6. CTA는 흐름 중간에 삽입
   별도 섹션으로 분리하지 않고 랭킹 리스트 내부,
   피드 하단 등 콘텐츠 흐름 안에 자연스럽게 배치.