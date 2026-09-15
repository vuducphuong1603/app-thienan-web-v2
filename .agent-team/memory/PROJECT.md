# Project Memory

> The current-state map of this project — what a new agent must know to act correctly.
> The LEAD updates it at mission end. Keep it SHORT: a map, not an encyclopedia.
> History lives in sessions/; live decision one-liners in ../DECISIONS.md; this file is NOW.

## What this project is
Thiên Ân catechism (thiếu nhi) management web app: students (thieu_nhi), classes, GLV (teachers), attendance (Thứ 5 / Chủ nhật,
QR card scanning + manual), scores and reports. Vietnamese UI. Production diemdanhthieunhi.com (push main = Vercel deploy).

## Stack & commands
Next.js 15 app router, React, TypeScript, Tailwind, Supabase JS (prod DB, RLS), Vitest.
- `npm test` (= `vitest run`, fast, no DB) · `npx tsc --noEmit -p .` · `npx eslint <files>`
- `npm run test:live` touches the prod Supabase — run at most once before a PR, never concurrently.
- `vitest.config.ts` provides the `@`→`./src` alias + automatic JSX (tests may import `.tsx` components).

## Architecture & key modules
- `src/lib/*.ts` — pure logic with tests in `src/lib/__tests__/*.test.ts` (qr-attendance, search, sunday-attendance, branch-scope…).
- `src/lib/queries.ts` — React Query hooks; exported `fetchAllRows` pages Supabase (max 1000 rows/request).
- `src/lib/search.ts` `normalizeSearchText` — accent-insensitive search (many callers, don't change casually).
- `src/components/QRScanAttendanceModal.tsx` — QR + manual attendance; manual search = client-side `filterManualStudents` on an
  ACTIVE-students cache loaded once per open.
- `src/app/admin/management/students/page.tsx` — Danh bạ (defaults to status ACTIVE).

## Conventions
- Pure logic goes to `src/lib`, tested TDD; components stay thin.
- Paging with `range()` must order by a unique tie-breaker (`.order('full_name').order('id')`).
- Supabase many-to-one joins (`classes(name)`) come back as objects; handle object|array defensively.
- Vietnamese comments/UI strings; no new deps or DB migrations without the user.

## Current state & evolution
- 2026-09-15: manual QR search is consistent with Danh bạ (client filter, accent-insensitive, no 50-row cut).
- Known debt: RLS on thieu_nhi still open to authenticated users (GLV/PĐT limits are UI-only); mobile app search not aligned.
