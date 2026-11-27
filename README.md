# 한걸음 · Hangeolum

**목표를 세우는 순간부터 이루는 날까지, 대화와 기록으로 함께 나아가는 AI 목표 동반자입니다.**

[실행 중인 앱](https://hangeolum.bsmhgdbcsh.chatgpt.site)

취업 준비, 운동, 공부처럼 서로 다른 목표를 한곳에 모으고, 각 목표의 AI 대화·메모·파일을 이어갈 수 있도록 만들었습니다. 목표별 맥락을 쌓으며 조언과 공감을 받고, 달력으로 하루를 돌아보고, 목표를 이뤘을 때 성취를 남기는 웹앱입니다.

## 주요 기능

- **목표 카드**: 목표 이름, 미래의 나에게 남기는 말, 선택 가능한 목표 날짜와 진행률 표시
- **목표별 AI 채팅**: 한국어 조언·공감, 대화 및 요약을 활용한 맥락 유지, 근거와 함께 제시하는 진행률 추정
- **첨부 자료**: 사진·문서 업로드, 지원되는 자료 분석, 요청 시 텍스트/마크다운 수정본 생성
- **선택 저장**: 채팅 중 원하는 내용만 목표 메모로, 원하는 첨부파일만 파일 보관함으로 저장
- **하루 돌아보기**: 한국 날짜 기준 오늘·어제의 기록 작성/수정, 달력에서 과거 기록 조회, 목표 날짜 표시
- **목표 달성**: 축하 효과와 함께 달성한 목표를 별도로 관리
- **계정별 데이터**: 아이디·비밀번호·닉네임 가입, 아이디 중복 확인, 계정별 목표·대화·파일 분리
- **계정 복구**: 롤모델/좌우명 질문과 답변, 선택 가능한 보조 복구 코드
- **ZIP 백업**: 목표·대화·메모·하루 기록·첨부파일 다운로드
- **관리자 기능**: 가입자 목록, 최근 로그인, 한국 날짜 기준 방문 통계, 보조 복구 코드 재발급/폐기

## 사용 기술

| 영역 | 구성 |
| --- | --- |
| 사용자 화면 | HTML, CSS, JavaScript |
| 서버 | TypeScript, Vinext, Vite, Cloudflare Workers |
| 데이터 | Cloudflare D1, Drizzle 스키마/마이그레이션 |
| 파일 | Cloudflare R2 |
| AI | OpenAI Responses API, 구조화된 JSON 출력 |
| 배포 | ChatGPT Sites |

화면 원본은 `web/`에 있습니다. `scripts/embed-web.mjs`가 HTML·JS·CSS를 `web/embedded.ts`로 묶고, 서버의 라우트가 이를 제공합니다. React/Vinext 및 UI 컴포넌트 일부는 생성 시 제공된 기반 구성입니다.

## 만든 과정

1. 목표별로 대화와 자료를 모으는 목표관리 앱을 기획했습니다.
2. ChatGPT에 원하는 화면과 동작을 자연어로 설명하며 초기 앱을 만들었습니다.
3. 직접 사용하면서 채팅 전송 방식, 선택 메모 저장, 달력, 목표 달성 효과 등을 반복 수정했습니다.
4. OpenAI API를 연결하고 계정별 저장, 파일 보관, 백업 및 운영 통계를 추가했습니다.
5. 인증·권한 분리와 복구 처리, AI 오류 시 기록 보존, 방문 집계 등을 테스트했습니다.

자연어 요구사항으로 구현하고 실제 동작을 확인하며 수정한 바이브 코딩 프로젝트입니다. AI가 만든 코드도 검토와 테스트가 필요하며, 완성된 보안 제품으로 간주하지 않습니다.

## 로컬 실행

Node.js **22.13 이상**과 pnpm **11.25.0**을 사용합니다. 테스트는 `node:sqlite`를 사용합니다.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm prepare:web
pnpm build
```

`.dev.vars`의 `OPENAI_API_KEY`에 직접 발급한 키를 입력합니다. AI API 사용료는 ChatGPT 구독과 별개입니다. 키가 없어도 모의 응답 기반 테스트는 실행할 수 있습니다. `ADMIN_USER_ID`는 선택 항목이며, 로컬 가입 후 확인한 내부 사용자 ID를 지정해야 관리자 메뉴가 열립니다.

최초 실행 시 **로컬 데이터베이스에만** 아래 마이그레이션을 순서대로 적용합니다. 이미 적용한 파일을 다시 실행하지 않습니다.

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_handy_grey_gargoyle.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_brave_stone_men.sql
pnpm dev
```

터미널에 표시된 주소로 접속합니다. `web/`를 수정했다면 `pnpm prepare:web`를 실행해 반영합니다. 배포 플랫폼 전용 설정과 기반 구성에 관한 추가 내용은 [DEVELOPMENT.md](DEVELOPMENT.md)를 참고하세요.

## 테스트

```bash
pnpm test
node --check web/app.js
pnpm prepare:web
pnpm build
```

- 계정 인증, 로그아웃, 사용자별 데이터·파일 분리
- 복구 질문·코드 검증, 관리자 접근 제한, 재설정 후 세션 해제
- AI 진행률, 중복 요청 방지, 생성 파일 선택 저장, 오류 시 메시지 보존
- 방문 중복 제거, 계정/브라우저 구분, 한국 시간 자정 기준 집계

기본 AI 테스트는 외부 API를 호출하지 않습니다. `tests/ai.mjs --live`는 실제 API 키와 사용료가 필요한 별도 검증입니다.

## 현재 동작과 한계

- 진행률은 대화와 기준에 따른 **AI 추정**이며, 미래 성공 확률이 아닙니다.
- AI에 실시간 웹 검색은 연결돼 있지 않습니다. 분석 지원 형식과 크기 제한이 있습니다.
- 수정본은 텍스트/마크다운 파일이며 원본 Word/PDF의 서식 편집을 보장하지 않습니다.
- ZIP은 다운로드용이며 앱으로 다시 가져오는 기능은 없습니다.
- 복구 질문의 답이 알려지거나 추측되면 계정이 위험해질 수 있습니다. 운영 규모를 키우기 전에는 인증된 이메일이나 패스키 등 더 강한 복구 방법을 검토해야 합니다.
- 관리자 보조 코드 발급 전 계정 주인 확인과 안전한 코드 전달은 운영자가 수행합니다.
- 방문 통계는 로그인 계정 또는 비로그인 브라우저 기준 추정치이며 쿠키 삭제·기기 변경·자동화 방문에 따른 오차가 있습니다. 방문 1회는 30분 비활동으로 구분합니다.
- 사용자당 하루 AI 요청 100회 제한이 있지만 서비스 전체 비용의 엄격한 상한은 아닙니다.

## 저장소와 운영 데이터

이 저장소는 **소스코드의 별도 스냅샷**입니다. 실행 중인 Sites 앱의 배포 저장소와 자동 동기화되지 않습니다. 기존 Git 이력은 가져오지 않았으며, 원래 사이트의 `project_id`도 제거했습니다. `.openai/hosting.json`에는 로컬 실행에 필요한 D1/R2 바인딩만 남겼습니다.

실제 API 키, 관리자 계정 ID, 회원 목록, 비밀번호 해시, 복구 답변, 사용자 대화·파일·방문 기록과 데이터베이스 덤프는 포함하지 않습니다. `.dev.vars.example`은 비어 있는 설정 예시입니다. 키·운영 데이터·백업 ZIP은 커밋하지 마세요.
