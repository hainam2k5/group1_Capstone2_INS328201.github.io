// Exam-ban ("cấm thi") rule. A student is barred from the final exam when they
// miss MORE THAN 20% of a course's sessions.
//
// The percentage is taken over the sessions actually recorded so far. A minimum
// number of sessions is required before a ban can trigger, so a student is not
// barred on a single early absence (20% of very few sessions is a tiny number).
export const EXAM_BAN_RATE = 0.20;      // barred when absences exceed this share
const MIN_SESSIONS = 5;                 // need at least this many sessions first

export function examBan(present: number, total: number) {
  const t = total || 0;
  const absent = Math.max(0, t - (present || 0));
  const rate = t > 0 ? absent / t : 0;
  const banned = t >= MIN_SESSIONS && rate > EXAM_BAN_RATE;           // > 20% absent
  const near = !banned && t >= 3 && rate > EXAM_BAN_RATE * 0.66;      // ~13%+, approaching 20%
  return { banned, near, absent, allowed: Math.floor(t * EXAM_BAN_RATE) };
}
