// ---------------------------------------------------------------------------
// DEV-ONLY demo mode. Lets you preview all three role UIs (student / advisor /
// teacher) with sample data and NO login — the real components render against a
// tiny in-memory Supabase stand-in. Enabled only when NEXT_PUBLIC_DEMO=1 AND the
// build is not production, so it can never affect the deployed app.
// Toggle role with the floating bar (components/demo-bar.tsx).
// ---------------------------------------------------------------------------
import { computeCourse } from "./gpa";
import type { Profile, Course, Section, Attendance } from "./types";

export const DEMO =
  process.env.NEXT_PUBLIC_DEMO === "1" && process.env.NODE_ENV !== "production";

export type DemoRole = "student" | "advisor" | "teacher";

export function getDemoRole(): DemoRole {
  if (typeof window === "undefined") return "advisor";
  // Dev nicety: ?demoRole=student|advisor|teacher pre-picks the role — makes
  // role views linkable (and screenshot-able headlessly) without the demo bar.
  const q = new URLSearchParams(window.location.search).get("demoRole");
  if (q === "student" || q === "advisor" || q === "teacher") { window.localStorage.setItem("demoRole", q); return q; }
  const r = window.localStorage.getItem("demoRole");
  return r === "student" || r === "advisor" || r === "teacher" ? r : "advisor";
}
export function setDemoRole(r: DemoRole) {
  if (typeof window !== "undefined") window.localStorage.setItem("demoRole", r);
}

// ------------------------------------------------------------------ sample data
const advisorMe: Profile = { id: "adv-1", user_id: "u-adv", role: "advisor", full_name: "TS. Trần Thị B", email: "advisor@demo.edu.vn", student_code: null, program: "Hệ thống thông tin quản lý", cohort: "", advisor_id: null, attendance_rate: 0, lms_activity_score: 0 };
const teacherMe: Profile = { id: "tea-1", user_id: "u-tea", role: "teacher", full_name: "Nguyễn Ngọc Hải Nam", email: "teacher@demo.edu.vn", student_code: null, program: "Khoa Công nghệ Thông tin", cohort: "", advisor_id: null, attendance_rate: 0, lms_activity_score: 0 };

const S = (id: string, name: string, code: string, att: number, lms: number): Profile => ({
  id, user_id: "u-" + id, role: "student", full_name: name, email: code.toLowerCase() + "@demo.edu.vn",
  student_code: code, program: "Hệ thống thông tin quản lý", cohort: "QH-2024", advisor_id: "adv-1",
  attendance_rate: att, lms_activity_score: lms,
});
const students: Profile[] = [
  S("stu-1", "Nguyễn Minh Anh", "SV24010001", 92, 78),
  S("stu-2", "Trần Thùy Linh", "SV24010002", 85, 65),
  S("stu-3", "Lê Quang Huy", "SV24010003", 70, 55),
  S("stu-4", "Phạm Thu Hà", "SV24010004", 54, 30),
  S("stu-5", "Đỗ Văn Khoa", "SV24010005", 62, 42),
  S("stu-6", "Vũ Hoàng Nam", "SV24010006", 96, 88),
  S("stu-7", "Bùi Khánh Chi", "SV24010007", 88, 72),
  S("stu-8", "Hoàng Anh Tuấn", "SV24010008", 45, 25),
];
const studentMe = students[0];

let cid = 0;
const C = (sid: string, code: string, name: string, credits: number, sem: string, year: string, r: number | null, m: number | null, f: number | null): Course => {
  const g = computeCourse({ score_regular: r, score_midterm: m, score_final: f });
  return { id: "c-" + ++cid, student_id: sid, code, name, credits, semester: sem, academic_year: year, weight_regular: 0.2, weight_midterm: 0.3, weight_final: 0.5, score_regular: r, score_midterm: m, score_final: f, total_score: g.total, letter_grade: g.letter, grade_point: g.point, locked: false };
};
const H1 = "HK1 2024-2025", Y1 = "2024-2025", H2 = "HK1 2025-2026", Y2 = "2025-2026";
const courses: Course[] = [
  // stu-1 — full transcript across two semesters (incl. INT1008 for the class roster)
  C("stu-1", "MAT1093", "Giải tích 1", 4, H1, Y1, 8, 7.5, 8),
  C("stu-1", "INT1003", "Tin học cơ sở", 3, H1, Y1, 9, 8.5, 9),
  C("stu-1", "ENG1016", "Tiếng Anh B1", 4, H1, Y1, 7, 7, 6.5),
  C("stu-1", "INT1008", "Nhập môn lập trình", 3, H2, Y2, 8.5, 8, 8.5),
  C("stu-1", "PHI1004", "Triết học Mác - Lênin", 3, H2, Y2, 7.5, 7, 7),
  // stu-2 / stu-3 — include INT1008 (HK1 2025-2026) so they appear in the roster
  C("stu-2", "INT1008", "Nhập môn lập trình", 3, H2, Y2, 6.5, 7, 6),
  C("stu-2", "MAT1093", "Giải tích 1", 4, H1, Y1, 6, 6.5, 7),
  C("stu-3", "INT1008", "Nhập môn lập trình", 3, H2, Y2, 5, 5.5, 5),
  C("stu-3", "ENG1016", "Tiếng Anh B1", 4, H1, Y1, 4, 5, 4.5),
  // stu-4 / stu-8 — failing → high/critical risk + auto alerts
  C("stu-4", "MAT1093", "Giải tích 1", 4, H1, Y1, 3, 4, 3),
  C("stu-4", "INT1003", "Tin học cơ sở", 3, H1, Y1, 4, 3.5, 4),
  C("stu-8", "MAT1093", "Giải tích 1", 4, H1, Y1, 2.5, 3, 2),
  C("stu-8", "ENG1016", "Tiếng Anh B1", 4, H1, Y1, 3, 3, 3.5),
  C("stu-8", "INT1003", "Tin học cơ sở", 3, H1, Y1, 4, 4, 3),
  // stu-5 / stu-6 / stu-7 — light
  C("stu-5", "MAT1093", "Giải tích 1", 4, H1, Y1, 5, 6, 5.5),
  C("stu-6", "INT1003", "Tin học cơ sở", 3, H1, Y1, 9, 9, 9.5),
  C("stu-7", "ENG1016", "Tiếng Anh B1", 4, H1, Y1, 8, 7.5, 8),
];

const secBase = { code: "INT1008", name: "Nhập môn lập trình", semester: H2, academic_year: Y2, credits: 3, weight_regular: 0.2, weight_midterm: 0.3, weight_final: 0.5, created_at: "2025-09-01T00:00:00Z" };
const sections: Section[] = [
  { id: "sec-a", teacher_id: "adv-1", ...secBase },
  { id: "sec-t", teacher_id: "tea-1", ...secBase },
];

let aid = 0;
const attendance: Attendance[] = [];
const sessions = ["2026-06-24", "2026-07-01", "2026-07-08", "2026-07-15"];
for (const sec of ["sec-a", "sec-t"])
  for (const sid of ["stu-1", "stu-2", "stu-3"])
    sessions.forEach((d, i) => attendance.push({ id: "at-" + ++aid, section_id: sec, student_id: sid, session_date: d, present: !(sid === "stu-3" && i % 2 === 0) }));

const notifications = [
  { id: "n-1", student_id: "stu-1", sender_id: "adv-1", title: "Điểm môn Nhập môn lập trình đã cập nhật", body: "TX 8.5 · GK 8.0 · CK 8.5 → Tổng 8.35 (B+)", type: "grade", is_read: false, created_at: "2026-07-12T04:00:00Z" },
  { id: "n-2", student_id: "stu-1", sender_id: null, title: "Chào mừng đến hệ thống", body: "Theo dõi điểm và cảnh báo học tập của bạn tại đây.", type: "system", is_read: true, created_at: "2026-07-01T01:00:00Z" },
];
const messages = [
  { id: "m-1", student_id: "stu-1", advisor_id: "adv-1", sender_id: "stu-1", sender_role: "student", body: "Em chào cô, cho em hỏi về lịch tư vấn học kỳ này ạ.", is_read: true, created_at: "2026-07-10T02:00:00Z" },
  { id: "m-2", student_id: "stu-1", advisor_id: "adv-1", sender_id: "adv-1", sender_role: "advisor", body: "Chào em, em có thể đặt lịch trong mục “Lịch hẹn cố vấn” nhé.", is_read: true, created_at: "2026-07-10T03:00:00Z" },
  { id: "m-3", student_id: "stu-4", advisor_id: "adv-1", sender_id: "stu-4", sender_role: "student", body: "Em cảm ơn cô đã nhắc ạ, em sẽ cố gắng cải thiện.", is_read: false, created_at: "2026-07-14T05:00:00Z" },
];
const appointments = [
  { id: "ap-1", student_id: "stu-1", advisor_id: "adv-1", starts_at: "2026-07-20T03:00:00Z", note: "Tư vấn kế hoạch học kỳ", status: "confirmed" },
  { id: "ap-2", student_id: "stu-1", advisor_id: "adv-1", starts_at: "2026-07-18T07:00:00Z", note: "Hỏi về môn Giải tích 1", status: "requested" },
];
const risk_config = [{ id: 1, w_gpa: 0.4, w_att: 0.3, w_lms: 0.15, w_fail: 0.15, th_medium: 40, th_high: 65, th_critical: 85 }];

// Mutable in-memory store (writes during a session persist until reload).
const db: Record<string, any[]> = {
  profiles: [advisorMe, teacherMe, ...students],
  courses, sections, attendance, notifications, messages, appointments, risk_config,
  risk_scores: [], alerts: [], interventions: [],
};

export function demoProfileFor(role: DemoRole): Profile {
  return role === "student" ? studentMe : role === "teacher" ? teacherMe : advisorMe;
}

// ------------------------------------------------------------------ mock client
const genId = () => "demo-" + Math.random().toString(36).slice(2, 10);

class Builder {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: any = null;
  private conflict: string[] | null = null;
  private tests: Array<(r: any) => boolean> = [];
  private ord: { col: string; asc: boolean } | null = null;
  private head = false;
  constructor(private table: string) {}

  select(_cols?: string, opts?: any) { if (opts && opts.head) this.head = true; return this; }
  eq(c: string, v: any) { this.tests.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.tests.push((r) => r[c] !== v); return this; }
  in(c: string, arr: any[]) { this.tests.push((r) => arr.includes(r[c])); return this; }
  is(c: string, v: any) { this.tests.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  gte(c: string, v: any) { this.tests.push((r) => r[c] >= v); return this; }
  lte(c: string, v: any) { this.tests.push((r) => r[c] <= v); return this; }
  gt(c: string, v: any) { this.tests.push((r) => r[c] > v); return this; }
  lt(c: string, v: any) { this.tests.push((r) => r[c] < v); return this; }
  like() { return this; }
  ilike() { return this; }
  or() { return this; } // demo dataset is already scoped → OR filters are a no-op
  order(col: string, o?: { ascending?: boolean }) { this.ord = { col, asc: !o || o.ascending !== false }; return this; }
  limit() { return this; }

  insert(v: any) { this.op = "insert"; this.payload = v; return this; }
  update(v: any) { this.op = "update"; this.payload = v; return this; }
  upsert(v: any, o?: any) { this.op = "upsert"; this.payload = v; this.conflict = o && o.onConflict ? String(o.onConflict).split(",") : null; return this; }
  delete() { this.op = "delete"; return this; }

  private rows(): any[] {
    let rows = (db[this.table] || []).slice();
    for (const t of this.tests) rows = rows.filter(t);
    if (this.ord) {
      const { col, asc } = this.ord;
      rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0));
      if (!asc) rows.reverse();
    }
    return rows;
  }
  private run(): Promise<{ data: any; error: null; count: number }> {
    if (!db[this.table]) db[this.table] = [];
    if (this.op === "insert" || this.op === "upsert") {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload];
      const out: any[] = [];
      for (const v of arr) {
        if (this.op === "upsert" && this.conflict) {
          const hit = db[this.table].find((r) => this.conflict!.every((k) => r[k] === v[k]));
          if (hit) { Object.assign(hit, v); out.push(hit); continue; }
        }
        const row = { id: v.id ?? genId(), created_at: new Date().toISOString(), ...v };
        db[this.table].push(row); out.push(row);
      }
      return Promise.resolve({ data: out, error: null, count: out.length });
    }
    if (this.op === "update") {
      const rows = this.rows();
      for (const r of rows) Object.assign(r, this.payload);
      return Promise.resolve({ data: rows, error: null, count: rows.length });
    }
    if (this.op === "delete") {
      const rows = this.rows();
      db[this.table] = db[this.table].filter((r) => !rows.includes(r));
      return Promise.resolve({ data: rows, error: null, count: rows.length });
    }
    const rows = this.rows();
    return Promise.resolve({ data: this.head ? null : rows, error: null, count: rows.length });
  }
  maybeSingle() { return this.run().then((r) => ({ data: (r.data && r.data[0]) || null, error: null })); }
  single() { return this.maybeSingle(); }
  then(res?: any, rej?: any) { return this.run().then(res, rej); }
}

const noopChannel: any = { on: () => noopChannel, subscribe: () => noopChannel };
export const demoClient: any = {
  from: (table: string) => new Builder(table),
  channel: () => noopChannel,
  removeChannel: () => {},
  auth: {
    getUser: async () => ({ data: { user: { id: "demo-user" } }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }), // no token → skips /api email calls
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: {}, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: {}, error: null }),
    verifyOtp: async () => ({ data: {}, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};
