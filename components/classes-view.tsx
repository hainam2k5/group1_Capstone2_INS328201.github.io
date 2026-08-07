"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { Icon } from "@/lib/icons";
import { computeCourse } from "@/lib/gpa";
import { examBan } from "@/lib/attendance";
import type { Profile, Section, Course, Attendance } from "@/lib/types";

type Row = { c: Course; s: Profile };

// Unified "Classes" screen: a teacher (or an advisor who also teaches, or a
// manager) picks a class they teach, then switches between two TABS for that
// class — Attendance (per weekly session) and Grades (TX/GK/CK). A class roster
// is the set of `courses` rows whose (code, semester, academic_year) match the
// section. Classes meet once a week, so attendance is taken per session date.
export function ClassesView({ me }: { me: Profile }) {
  const { t, lang } = useI18n();
  const sb = supabase;
  const [tab, setTab] = useState<"attend" | "grades">("attend");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selId, setSelId] = useState("");
  const [roster, setRoster] = useState<Row[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [rates, setRates] = useState<Record<string, { pre: number; tot: number }>>({});
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [gEdits, setGEdits] = useState<Record<string, { sr?: string; sm?: string; sf?: string }>>({});
  const [saving, setSaving] = useState(false);

  const sel = sections.find((s) => s.id === selId) || null;

  async function loadSections() {
    if (!sb) return;
    setLoading(true);
    setLoadFailed(false);
    // Make sure the auth session (JWT) is attached BEFORE querying. On a fresh
    // load — or right after Supabase silently refreshes an expired token — a
    // query fired too early goes out without the token, so RLS returns an EMPTY
    // list. That looked like "no classes to pick" until a manual page reload.
    // Awaiting getSession() closes that race; a transient error is then retried
    // a few times so a network blip self-heals instead of forcing an F5.
    try { await sb.auth.getSession(); } catch {}
    // Each user manages only the classes they own. An advisor may also teach a
    // few classes (owns those sections); they are not meant to run every class.
    let ok = false;
    let list: Section[] = [];
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const { data, error } = await sb.from("sections").select("*").eq("teacher_id", me.id).order("created_at", { ascending: false });
      if (!error) { list = (data as Section[]) || []; ok = true; break; }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    setSections(list);
    // Land on the class picker instead of auto-opening a class — the user chooses
    // which class to work on. Keep an existing selection only if it still exists.
    setSelId((cur) => (cur && list.some((s) => s.id === cur) ? cur : ""));
    setLoadFailed(!ok);
    setLoading(false);
  }
  useEffect(() => { loadSections(); }, [me.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRoster(sec: Section, d: string) {
    if (!sb) return;
    // Fetch only the columns this screen renders (courses has 19, profiles 12).
    const { data: crs } = await sb.from("courses")
      .select("id, student_id, code, semester, academic_year, score_regular, score_midterm, score_final")
      .eq("code", sec.code).eq("semester", sec.semester);
    const courses = ((crs as Course[]) || []).filter((c) => (c.academic_year || "") === (sec.academic_year || ""));
    const ids = [...new Set(courses.map((c) => c.student_id))];
    let profs: Profile[] = [];
    if (ids.length) profs = ((await sb.from("profiles").select("id, full_name, student_code, email").in("id", ids)).data as Profile[]) || [];
    const pmap = new Map(profs.map((p) => [p.id, p]));
    const list: Row[] = courses.map((c) => ({ c, s: pmap.get(c.student_id) as Profile })).filter((r) => r.s);
    list.sort((a, b) => (a.s.full_name || "").localeCompare(b.s.full_name || ""));
    setRoster(list);
    setGEdits({});
    const rows = ((await sb.from("attendance").select("student_id, session_date, present").eq("section_id", sec.id)).data as Attendance[]) || [];
    const r: Record<string, { pre: number; tot: number }> = {};
    for (const a of rows) { const x = r[a.student_id] || { pre: 0, tot: 0 }; x.tot++; if (a.present) x.pre++; r[a.student_id] = x; }
    setRates(r);
    setSessionDates([...new Set(rows.map((a) => a.session_date))].sort().reverse());
    const pres: Record<string, boolean> = {};
    for (const { s } of list) pres[s.id] = true;
    for (const a of rows) if (a.session_date === d) pres[a.student_id] = a.present;
    setPresent(pres);
  }
  useEffect(() => { if (sel) loadRoster(sel, date); }, [selId, date, sections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAttendance() {
    if (!sb || !sel || !roster.length) return;
    setSaving(true);
    const rows = roster.map(({ s }) => ({ section_id: sel.id, student_id: s.id, session_date: date, present: present[s.id] !== false }));
    const { error } = await sb.from("attendance").upsert(rows, { onConflict: "section_id,student_id,session_date" });
    setSaving(false);
    if (error) return toast(t("cls.attErr"), "error");
    toast(t("cls.attSaved"), "success");
    await notifyExamBans(sel);
    loadRoster(sel, date);
  }

  // After saving attendance, notify students who JUST crossed the exam-ban limit
  // (absent > credits). Compares the pre-save rates in state with a fresh fetch,
  // so each student is warned only once — the moment they become barred.
  async function notifyExamBans(sec: Section) {
    if (!sb) return;
    const rows = ((await sb.from("attendance").select("student_id, present").eq("section_id", sec.id)).data as { student_id: string; present: boolean }[]) || [];
    const now: Record<string, { pre: number; tot: number }> = {};
    for (const a of rows) { const x = now[a.student_id] || { pre: 0, tot: 0 }; x.tot++; if (a.present) x.pre++; now[a.student_id] = x; }
    const secName = (sec.name || "").split("·")[0].trim() || sec.name;
    const token = (await sb.auth.getSession()).data.session?.access_token;
    for (const { s } of roster) {
      const o = rates[s.id], n = now[s.id];
      const wasBanned = o ? examBan(o.pre, o.tot).banned : false;
      const nb = n ? examBan(n.pre, n.tot) : null;
      if (nb && nb.banned && !wasBanned) {
        const body = t("cls.banBody", { course: secName, absent: nb.absent });
        await sb.from("notifications").insert({ student_id: s.id, sender_id: me.id, type: "alert", title: t("cls.banTitle"), body }); // RLS skips non-recipients
        if (token && s.email && !/@sv\.demo\.edu\.vn$/i.test(s.email)) {
          void fetch("/api/notify-alert", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ studentId: s.id, level: "Critical", lang }) }).catch(() => {});
        }
      }
    }
  }

  const gVal = (c: Course, f: "sr" | "sm" | "sf") => {
    const e = gEdits[c.id];
    if (e && e[f] !== undefined) return e[f] as string;
    const src = f === "sr" ? c.score_regular : f === "sm" ? c.score_midterm : c.score_final;
    return src === null || src === undefined ? "" : String(src);
  };
  const setG = (id: string, f: "sr" | "sm" | "sf", v: string) => setGEdits((p) => ({ ...p, [id]: { ...p[id], [f]: v } }));
  const ok = (v: string) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10);

  async function saveGrades() {
    if (!sb || !sel || !roster.length) return;
    for (const { c } of roster) if (![gVal(c, "sr"), gVal(c, "sm"), gVal(c, "sf")].every(ok)) return toast(t("cls.gErr"), "error");
    setSaving(true);
    const num = (v: string) => (v === "" ? null : Number(v));
    const now = new Date().toISOString();
    const ups = roster.map(({ c }) => {
      const sr = gVal(c, "sr"), sm = gVal(c, "sm"), sf = gVal(c, "sf");
      const g = computeCourse({ score_regular: sr, score_midterm: sm, score_final: sf, weight_regular: sel.weight_regular, weight_midterm: sel.weight_midterm, weight_final: sel.weight_final });
      return sb!.from("courses").update({
        score_regular: num(sr), score_midterm: num(sm), score_final: num(sf),
        weight_regular: sel.weight_regular, weight_midterm: sel.weight_midterm, weight_final: sel.weight_final,
        total_score: g.total, letter_grade: g.letter, grade_point: g.point, updated_at: now,
      }).eq("id", c.id);
    });
    const res = await Promise.all(ups);
    if (res.filter((r) => r.error).length) { setSaving(false); return toast(t("cls.gErr"), "error"); }
    // Best-effort: notify + email each student their updated grade. Allowed for a
    // teacher (own class), advisor, or manager — the notify-grade route and the
    // notifications RLS both permit these roles. Demo addresses (@sv.demo.edu.vn)
    // are skipped so we don't send to fake inboxes.
    if (me.role === "advisor" || me.role === "manager" || me.role === "teacher") {
      const token = (await sb.auth.getSession()).data.session?.access_token;
      const fmt = (v: string) => (v === "" ? "—" : v);
      // The section name carries the timetable ("Course · Weekday · HH:MM–HH:MM");
      // the notification and the email should name the course only.
      const secName = (sel.name || "").split("·")[0].trim() || sel.name;
      let mailFails = 0;
      await Promise.all(roster.map(async ({ c, s }) => {
        const sr = gVal(c, "sr"), sm = gVal(c, "sm"), sf = gVal(c, "sf");
        const g = computeCourse({ score_regular: sr, score_midterm: sm, score_final: sf, weight_regular: sel.weight_regular, weight_midterm: sel.weight_midterm, weight_final: sel.weight_final });
        const body = t("notif.gradeBodyDetailed", { course: secName, r: fmt(sr), m: fmt(sm), f: fmt(sf), total: g.total === null ? "—" : String(g.total), letter: g.letter || "—" });
        await sb.from("notifications").insert({ student_id: s.id, sender_id: me.id, type: "grade", title: t("notif.gradeTitle"), body }); // RLS skips non-advisees
        if (token && s.email && !/@sv\.demo\.edu\.vn$/i.test(s.email)) {
          // Awaited so a rejected SMTP login (502) is reported instead of failing
          // silently; the requests still run in parallel across the roster.
          const ok = await fetch("/api/notify-grade", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ studentId: s.id, courseName: secName, r: fmt(sr), m: fmt(sm), f: fmt(sf), total: g.total, letter: g.letter, lang }),
          }).then((r) => r.ok).catch(() => false);
          if (!ok) mailFails++;
        }
      }));
      if (mailFails) { setSaving(false); toast(t("cls.gSavedNoMail", { n: mailFails }), "error"); loadRoster(sel, date); return; }
    }
    setSaving(false);
    toast(t("cls.gSaved"), "success");
    loadRoster(sel, date);
  }

  const tabBtn = (tb: "attend" | "grades", ic: string, key: string) => (
    <button type="button" onClick={() => setTab(tb)}
      style={{
        border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        padding: "9px 16px", fontSize: 14, fontWeight: tab === tb ? 700 : 500,
        color: tab === tb ? "var(--primary, #2563eb)" : "var(--muted, #5C6678)",
        borderBottom: "2px solid " + (tab === tb ? "var(--primary, #2563eb)" : "transparent"),
      }}>
      <Icon name={ic} size={15} /> {t(key)}
    </button>
  );

  // present count for the selected session + short day label for the session chips
  const dayPresent = roster.reduce((n, { s }) => n + (present[s.id] !== false ? 1 : 0), 0);
  const fmtDay = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
  // section names carry the timetable as "Course name · Weekday · HH:MM–HH:MM";
  // split it so the schedule can be shown on its own line (empty if not set yet).
  const selParts = (sel?.name || "").split("·").map((x) => x.trim()).filter(Boolean);
  const selCourse = selParts[0] || "";
  const selSchedule = selParts.slice(1).join(" · ");
  // Exam-ban ("cấm thi") status per student, from their attendance in this class.
  const banOf = (sid: string) => { const r = rates[sid]; return examBan(r?.pre ?? 0, r?.tot ?? 0); };
  const examBadge = (kind: "ban" | "near") => (
    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
      color: kind === "ban" ? "#fff" : "#8a6d1a", background: kind === "ban" ? "#c02626" : "#fbf0dc" }}>
      {t(kind === "ban" ? "cls.examBan" : "cls.examBanNear")}
    </span>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{t("cls.title")}</div>
          <div className="page-sub">{t("cls.sub")}</div>
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ maxWidth: 520, marginBottom: 0 }}>
          <label>{t("cls.pickClass")}</label>
          <select value={selId} onChange={(e) => setSelId(e.target.value)} disabled={loading}>
            <option value="">{loading ? t("cls.loadingClasses") : t("cls.selectClass")}</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name} · {s.semester}</option>)}
          </select>
        </div>
        {loadFailed && (
          <button type="button" onClick={() => loadSections()} className="muted-note"
            style={{ marginTop: 10, background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--primary)", textDecoration: "underline", textAlign: "left" }}>
            {t("cls.loadErr")}
          </button>
        )}
        {!loading && !loadFailed && sections.length === 0 && <div className="muted-note" style={{ marginTop: 10 }}>{t("cls.noClasses")}</div>}
      </div>

      {sel && (
        <div className="card">
          {/* Class header: code + course name, with the weekly schedule on its own line */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{sel.code} — {selCourse}</div>
            <div className="card-sub" style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="grad" size={13} />
              {selSchedule && <b style={{ color: "var(--primary)" }}>{selSchedule}</b>}
              {selSchedule && <span style={{ opacity: 0.5 }}>·</span>}
              {t("cls.semester")} {sel.semester} · {roster.length} {t("cls.studentsUnit")}
            </div>
          </div>

          {/* Two tabs for the selected class */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border, #e5e7eb)", marginBottom: 16 }}>
            {tabBtn("attend", "grad", "cls.tabAttend")}
            {tabBtn("grades", "edit", "cls.tabGrades")}
          </div>

          {tab === "attend" && (
            <div style={{ marginBottom: 14 }}>
              <div className="toolbar">
                <label style={{ margin: 0, alignSelf: "center" }}>{t("cls.session")}</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
                <span className="muted-note" style={{ alignSelf: "center" }}>{t("cls.weeklyNote")}</span>
                {roster.length > 0 && <span style={{ alignSelf: "center", marginLeft: "auto", fontSize: 13, fontWeight: 600 }}>{t("cls.dayPresent", { p: dayPresent, n: roster.length })}</span>}
              </div>
              {sessionDates.length > 0 && (
                <div className="chips" style={{ marginTop: 10, alignItems: "center" }}>
                  <span className="muted-note" style={{ marginRight: 2 }}>{t("cls.sessions")}:</span>
                  {sessionDates.map((d) => (
                    <button key={d} type="button" onClick={() => setDate(d)}
                      className={"chip" + (d === date ? " active" : "")}>
                      {fmtDay(d)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {roster.length === 0 ? (
            <div className="empty"><Icon name="students" size={30} />{t("cls.noStudents")}</div>
          ) : tab === "attend" ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>{t("th.student")}</th><th>{t("th.studentId")}</th><th style={{ textAlign: "center" }}>{t("cls.present")}</th><th className="text-right">{t("cls.attRate")}</th></tr></thead>
                  <tbody>
                    {roster.map(({ s }) => {
                      const r = rates[s.id]; const rate = r && r.tot ? Math.round((r.pre / r.tot) * 100) : null;
                      const b = banOf(s.id);
                      return (
                        <tr key={s.id}>
                          <td><b>{s.full_name}</b>{b.banned ? examBadge("ban") : b.near ? examBadge("near") : null}</td><td className="mono">{s.student_code || "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            <input type="checkbox" checked={present[s.id] !== false} onChange={(e) => setPresent((p) => ({ ...p, [s.id]: e.target.checked }))} style={{ width: 18, height: 18 }} />
                          </td>
                          <td className="text-right mono">{rate === null ? "—" : rate + "%"}{r ? <span className="muted-note"> ({r.pre}/{r.tot})</span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-primary" disabled={saving} onClick={saveAttendance}>{saving ? t("loading") : t("cls.saveAttend")}</button>
                <span className="muted-note">{t("cls.attHint")}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>{t("th.student")}</th><th>{t("th.studentId")}</th><th>{t("th.reg")}</th><th>{t("th.mid")}</th><th>{t("th.final")}</th><th>{t("th.total")}</th><th>{t("th.grade")}</th></tr></thead>
                  <tbody>
                    {roster.map(({ c, s }) => {
                      const sr = gVal(c, "sr"), sm = gVal(c, "sm"), sf = gVal(c, "sf");
                      const g = computeCourse({ score_regular: sr, score_midterm: sm, score_final: sf, weight_regular: sel.weight_regular, weight_midterm: sel.weight_midterm, weight_final: sel.weight_final });
                      const b = banOf(s.id);
                      return (
                        <tr key={c.id}>
                          <td><b>{s.full_name}</b>{b.banned ? examBadge("ban") : b.near ? examBadge("near") : null}</td><td className="mono">{s.student_code || "—"}</td>
                          <td><input className="cell-in" inputMode="decimal" value={sr} onChange={(e) => setG(c.id, "sr", e.target.value)} /></td>
                          <td><input className="cell-in" inputMode="decimal" value={sm} onChange={(e) => setG(c.id, "sm", e.target.value)} /></td>
                          <td>{b.banned ? <span className="muted-note" style={{ color: "#c02626", fontWeight: 700 }} title={t("cls.examBanFinal")}>{t("cls.examBan")}</span> : <input className="cell-in" inputMode="decimal" value={sf} onChange={(e) => setG(c.id, "sf", e.target.value)} />}</td>
                          <td className="mono">{b.banned ? "—" : g.total === null ? "—" : g.total}</td>
                          <td>{b.banned ? <span className="grade-chip grade-F">{t("cls.examBan")}</span> : <span className={"grade-chip grade-" + (g.letter || "").replace("+", "p")}>{g.letter || "—"}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-primary" disabled={saving} onClick={saveGrades}>{saving ? t("loading") : t("cls.saveGrades")}</button>
                <span className="muted-note">{t("cls.weightsNote", { r: sel.weight_regular, m: sel.weight_midterm, f: sel.weight_final })}</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
