## One-time setup
```bash
git clone https://github.com/okonenomfon/blockchain-assignment.git
cd blockchain-assignment
```

```bash
git apply --index ../commits/commit-1.patch
git commit -F ../commits/commit-1.msg
git push
```

```bash
git apply --index ../commits/commit-2.patch && git commit -F ../commits/commit-2.msg && git push
```

```bash
git apply --index ../commits/commit-3.patch && git commit -F ../commits/commit-3.msg && git push
```

```bash
git apply --index ../commits/commit-4.patch && git commit -F ../commits/commit-4.msg && git push
```

## Run locally
```bash
npm install
cp .env.example .env      # put your DATABASE_URL in it
npm run dev:all           # http://localhost:5173
npm test
```

## Deploy on Vercel
1. Vercel → Add New Project → import `okonenomfon/blockchain-assignment` (preset: Vite).
2. In the project: **Storage → Create Database → Neon (Postgres)** → connect to the project (this sets `DATABASE_URL`).
3. Redeploy, then open `https://<your-app>.vercel.app/api/health` – it must say `"database": "connected"`.
4. Play one full game on the live URL.

- README: replace the team table placeholders with every member's name + matric number, and add the live URL.
- Read `WALKTHROUGH.md`
