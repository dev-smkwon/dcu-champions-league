# DCU Champions League

대구가톨릭대 친구들의 FC Online 경기 기록을 하나의 월간 리그로 보여주는 웹 서비스입니다. 리그 멤버끼리 치른 공식경기만 집계하며 월간·누적 순위, 경기 상세, 유저 분석, BEST 11과 재미있는 기록실을 제공합니다.

- Production: <https://dcu-champions-league.vercel.app/>
- Data: NEXON Open API
- Framework: Next.js, React, TypeScript

## Start developing

Requirements: Node.js 22.13 or later.

```bash
npm install
```

Create `.env.local`:

```env
NEXON_API_KEY=your_nexon_service_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

Open <http://localhost:3000/>.

## Commands

```bash
npm run dev
npm run build
npm test
npm run lint
```

## Working with Codex

Codex reads [`AGENTS.md`](./AGENTS.md) automatically. That file routes each new session to the durable project context:

- [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md): current features, data scope and architecture
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): product rules and reasons behind non-obvious metrics
- [`docs/BACKLOG.md`](./docs/BACKLOG.md): next work and known limitations

On another computer, clone or pull the repository, open its root in Codex, and ask:

> AGENTS.md의 절차에 따라 프로젝트 맥락과 최근 커밋을 확인하고 이어서 작업해줘.

Do not commit `.env.local` or expose `NEXON_API_KEY` in client-side code.

## Deployment

The GitHub `main` branch is connected to Vercel. Pushing an intentional commit to `main` triggers a production deployment. Verify the deployed behavior after rollout.
