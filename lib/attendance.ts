// Exam-ban ("cấm thi") rule. A student is barred from the final exam when they
// miss more than ~20% of a course's sessions. A standard VNU course runs about
// 5 sessions per credit (3 credits ≈ 15 sessions), so 20% of that equals the
// credit count — i.e. "barred when absences > credits" (3-credit → more than 3).
//
// Counting ABSOLUTE absences (not a % of sessions held so far) avoids false bans
// early in the term, when only a couple of sessions have been recorded.
export function examBan(present: number, total: number, credits: number) {
  const absent = Math.max(0, (total || 0) - (present || 0));
  const allowed = Math.max(1, Math.round(credits || 3)); // max absences before a ban
  const banned = absent > allowed;                        // e.g. 3-credit: > 3 absences
  const near = !banned && absent >= allowed - 1;          // one or two away from the limit
  return { banned, near, absent, allowed };
}
