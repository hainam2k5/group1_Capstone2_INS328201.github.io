"use client";
import { useEffect, useState } from "react";
import { DEMO, getDemoRole, setDemoRole, type DemoRole } from "@/lib/demo";
import { homeFor } from "@/lib/supabaseClient";

// DEV-ONLY floating switcher: preview the three role UIs with sample data and no
// login. Renders nothing unless NEXT_PUBLIC_DEMO=1 (dev). See lib/demo.ts.
const ROLES: { role: DemoRole; label: string; home: string }[] = [
  { role: "student", label: "Sinh viên", home: "/student" },
  { role: "advisor", label: "Cố vấn", home: "/advisor" },
  { role: "teacher", label: "Giáo viên", home: "/teacher" },
];

export function DemoBar() {
  const [role, setRole] = useState<DemoRole>("advisor");
  useEffect(() => { setRole(getDemoRole()); }, []);
  if (!DEMO) return null;

  const go = (r: DemoRole) => { setDemoRole(r); window.location.href = homeFor(r); };

  return (
    <div style={{
      position: "fixed", left: "50%", bottom: 16, transform: "translateX(-50%)", zIndex: 9999,
      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
      background: "#13294f", color: "#fff", borderRadius: 999,
      boxShadow: "0 8px 28px rgba(0,0,0,.28)", font: "600 12.5px/1 Inter, system-ui, sans-serif",
    }}>
      <span style={{ color: "#c9a227", fontWeight: 800, letterSpacing: ".04em", padding: "0 4px" }}>DEMO</span>
      {ROLES.map((r) => {
        const on = r.role === role;
        return (
          <button key={r.role} onClick={() => go(r.role)} title={"Xem giao diện " + r.label}
            style={{
              cursor: "pointer", border: 0, borderRadius: 999, padding: "6px 12px",
              fontWeight: 700, fontSize: 12.5,
              background: on ? "#c9a227" : "rgba(255,255,255,.12)",
              color: on ? "#13294f" : "#fff",
            }}>
            {r.label}
          </button>
        );
      })}
      <span style={{ opacity: .7, fontWeight: 500, padding: "0 4px" }}>dữ liệu mẫu · không cần đăng nhập</span>
    </div>
  );
}
