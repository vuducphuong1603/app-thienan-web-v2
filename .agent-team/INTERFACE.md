# INTERFACE — search-fix

## core → ui : `src/lib/qr-attendance.ts`

```ts
// existing, unchanged — reuse as the element type of the cache
export interface SearchableStudent {
  full_name: string
  saint_name?: string | null
  student_code?: string | null
  class_id?: string | null
  className?: string | null
  parent_phone?: string | null
}

/**
 * Pure client-side filter for manual search (SPEC A1).
 * Generic: returns the SAME objects passed in (so extra fields like `id` survive).
 * - words via splitSearchWords + normalizeSearchText (accent-insensitive, NFD-safe)
 * - each word must match one of: prefix of any name word except the first (surname);
 *   whole query is suffix of full name; saint_name / student_code / className contains;
 *   parent_phone contains digits (only when the word is ≥3 digits)
 * - classId → only that class; empty text + classId → whole class; empty text + no classId → []
 * - sorted by full_name localeCompare 'vi', sliced to manualSearchLimit(classId)
 */
export function filterManualStudents<T extends SearchableStudent>(
  students: readonly T[],
  text: string,
  classId?: string | null,
): T[]
```

`shouldRunManualSearch`, `manualSearchLimit`, `splitSearchWords` stay. `matchesStudentSearch` / `studentSearchOrFilter`
may stay (tests use them) — ui will stop importing them.

## `src/lib/queries.ts`
`fetchAllRows` gets the `export` keyword only (no other change) so the modal can page the ACTIVE list (> 1000 rows).
