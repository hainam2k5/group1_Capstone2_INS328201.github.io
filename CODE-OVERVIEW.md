# Tổng hợp mã nguồn — Hệ thống Cảnh báo Rủi ro Học tập

> Bản đồ code dành cho người chấm: cấu trúc, vai trò từng file, các đoạn code trọng tâm và lộ trình đọc.
> Capstone Project II (INS3282) — Trường Quốc tế, ĐHQG Hà Nội.

## 1. Thông tin nhanh

| Mục | Giá trị |
|---|---|
| Bản chạy thật | Deploy tự động lên **Vercel** từ nhánh `main` |
| Quy mô code tự viết | **25 file TypeScript/TSX = 3.054 dòng** · CSS thuần 323 dòng · **12 file SQL = 860 dòng** |
| Trong đó phục vụ dev | `lib/demo.ts` (209) + `components/demo-bar.tsx` (46) — chế độ demo chạy máy cá nhân, **không có trong bản production** |
| Song ngữ | [`lib/i18n.tsx`](lib/i18n.tsx) — 380 khóa tiếng Việt = 380 khóa tiếng Anh |
| Cơ sở dữ liệu | 11 bảng PostgreSQL (3NF) — dựng hoàn toàn từ 12 file SQL trong [`supabase/`](supabase/) |
| **Không** dùng | Framework UI (Tailwind/Bootstrap/MUI), thư viện icon, thư viện state — giao diện, icon SVG và i18n đều tự viết |

## 2. Cây thư mục có chú thích

```
webapp-next/
├─ app/                      # các TRANG (Next.js App Router)
│  ├─ page.tsx               #   đăng nhập + quên mật khẩu (OTP 6 số)
│  ├─ student/page.tsx       #   cổng sinh viên
│  ├─ teacher/page.tsx       #   cổng giáo viên (điểm danh · nhập điểm)
│  ├─ advisor/page.tsx       #   cổng cố vấn/quản lý (file lớn nhất)
│  ├─ api/                   #   4 API đặc quyền chạy phía máy chủ
│  │  ├─ admin/import-students/route.ts   # tạo tài khoản SV hàng loạt
│  │  ├─ admin/sync-lms/route.ts          # đồng bộ chuyên cần/LMS từ CSV
│  │  ├─ notify-alert/route.ts            # email cảnh báo rủi ro
│  │  └─ notify-grade/route.ts            # email báo điểm
│  ├─ layout.tsx             #   khung chung + provider i18n
│  └─ globals.css            #   toàn bộ giao diện (CSS biến, tự viết)
├─ components/               # khối giao diện dùng chung
│  ├─ classes-view.tsx       #   màn Lớp học: điểm danh + nhập điểm cả lớp
│  ├─ advisor-parts.tsx      #   các khối nhỏ của trang cố vấn
│  ├─ whatif.tsx             #   mô phỏng cải thiện điểm (what-if)
│  └─ common.tsx             #   logo, đổi ngôn ngữ, huy hiệu rủi ro
├─ lib/                      # LÕI NGHIỆP VỤ (hàm thuần, dễ kiểm thử)
│  ├─ risk.ts                #   thuật toán điểm rủi ro giải thích được
│  ├─ gpa.ts                 #   điểm tổng → điểm chữ → GPA/CPA hệ 4
│  ├─ predict.ts             #   dự đoán "sắp vào vùng báo động"
│  ├─ i18n.tsx               #   từ điển song ngữ VI/EN
│  ├─ supabaseClient.ts      #   kết nối Supabase + điều hướng theo vai trò
│  └─ types.ts               #   định nghĩa kiểu cho 11 bảng
└─ supabase/                 # 12 file SQL dựng CSDL + phân quyền RLS
```

## 3. Vai trò từng file (kèm số dòng thật)

### 3.1. Các trang & API (`app/`)

| File | Dòng | Vai trò |
|---|---:|---|
| [`app/page.tsx`](app/page.tsx) | 213 | Đăng nhập; quên mật khẩu 2 bước bằng mã OTP 6 số; điều hướng về đúng cổng theo `profiles.role` |
| [`app/student/page.tsx`](app/student/page.tsx) | 359 | Cổng SV: bảng điểm theo kỳ + chú giải thang chữ, KPI, băng cảnh báo, thông báo realtime, chat cố vấn, đặt lịch hẹn, in bảng điểm |
| [`app/teacher/page.tsx`](app/teacher/page.tsx) | 68 | Cổng GV: chỉ ghép 2 màn Điểm danh / Nhập điểm từ `classes-view` (giữ trang mỏng) |
| [`app/advisor/page.tsx`](app/advisor/page.tsx) | 1.411 | Cổng cố vấn/quản lý: tổng quan rủi ro, danh sách SV + nhập Excel, chi tiết SV, cảnh báo & can thiệp, tin nhắn, đánh giá KPI, cấu hình rủi ro |
| `app/api/…` (4 route) | 464 | Việc cần quyền cao — xác minh JWT + vai trò người gọi rồi mới dùng `service_role`; giữ mật khẩu SMTP phía máy chủ |

### 3.2. Components & lõi nghiệp vụ

| File | Dòng | Vai trò |
|---|---:|---|
| [`components/classes-view.tsx`](components/classes-view.tsx) | 199 | Một component cho cả 2 chế độ: điểm danh theo buổi (upsert chống trùng) và lưới nhập TX/GK/CK cả lớp |
| [`components/advisor-parts.tsx`](components/advisor-parts.tsx) | 173 | Form thêm SV/môn, hộp gửi thông báo, form can thiệp, danh sách yếu tố rủi ro |
| [`components/whatif.tsx`](components/whatif.tsx) | 144 | Mô phỏng cải thiện điểm: thử điểm chữ tốt hơn → CPA + điểm rủi ro tính lại ngay, mục tiêu xếp loại bằng; thuần client, không ghi DB |
| `common.tsx` · `icons.tsx` · `toast.ts` · `format.ts` | 158 | Logo/huy hiệu, bộ icon SVG tự vẽ, thông báo nổi, định dạng ngày & nhãn rủi ro |
| [`lib/risk.ts`](lib/risk.ts) | 69 | `compute()`: 4 yếu tố → điểm 0–100 → mức; trọng số/ngưỡng đọc từ bảng `risk_config` |
| [`lib/gpa.ts`](lib/gpa.ts) | 107 | `computeCourse()`, `gpaOf()`, `bySemester()`, `avg10Of()`, `GRADE_TABLE` — toàn hàm thuần |
| [`lib/predict.ts`](lib/predict.ts) | 68 | Xu hướng điểm rủi ro (độ dốc lịch sử) → khả năng vào vùng báo động + ETA |
| [`lib/i18n.tsx`](lib/i18n.tsx) | 305 | Context song ngữ; `t(key, params)`; 380 khóa mỗi ngôn ngữ |
| [`lib/supabaseClient.ts`](lib/supabaseClient.ts) · [`lib/types.ts`](lib/types.ts) | 175 | Khởi tạo client, `homeFor(role)`; kiểu TypeScript cho 11 bảng |

### 3.3. SQL (`supabase/` — 860 dòng, 12 file)

| Nhóm | File | Vai trò |
|---|---|---|
| Nền tảng | [`schema.sql`](supabase/schema.sql) · `seed.sql` | 11 bảng + RLS gốc + trigger đăng ký + Realtime; dữ liệu mẫu |
| Tính năng | [`teacher-classes.sql`](supabase/teacher-classes.sql) · `appointments.sql` · `risk-config.sql` · `grade-lock.sql` | Vai trò giáo viên + lớp + điểm danh; lịch hẹn; cấu hình rủi ro; khóa điểm |
| Bảo mật | [`rls-major-scope.sql`](supabase/rls-major-scope.sql) · `hardening.sql` · `remove-advisor-code.sql` · [`guards.sql`](supabase/guards.sql) | Giới hạn cố vấn theo ngành; ép role khi đăng ký; gỡ đường leo quyền; rào chắn duy nhất |
| Tiện ích/demo | `auto-assign-advisor.sql` · `demo-2-majors.sql` | Tự gán cố vấn theo ngành; kịch bản demo (⚠️ không chạy lại) |

## 4. Năm đoạn code đáng xem nhất

### 4.1. Thuật toán rủi ro giải thích được — [`lib/risk.ts`](lib/risk.ts)

Trái tim của đề tài. Mỗi yếu tố quy về thang 0–100 rồi nhân trọng số; kết quả lưu kèm **cả bốn yếu tố thành phần** nên mọi cảnh báo đều trả lời được câu "vì sao":

```ts
export function compute(input: RiskInput, cfg: RiskConfig = DEFAULT_CONFIG): RiskResult {
  const gr = gpaRisk(input.cpa);                    // (2.5 − CPA)/2.5 × 100
  const ar = attendanceRisk(input.attendance_rate); // (85 − %)/85 × 100
  const lr = lmsRisk(input.lms_activity_score);     // (60 − đ)/60 × 100
  const fr = failedRisk(input.failed_count);        // 34 điểm / môn trượt
  const fg = gr*cfg.w_gpa, fa = ar*cfg.w_att, fl = lr*cfg.w_lms, ff = fr*cfg.w_fail;
  let score = clamp(fg + fa + fl + ff, 0, 100);
  // ngưỡng 40/65/85 → Low | Medium | High | Critical (đổi được trong risk_config)
  return { score, level, factor_gpa: r1(fg), factor_attendance: r1(fa), /* … */ };
}
```

### 4.2. Điểm tổng → điểm chữ → hệ 4 — [`lib/gpa.ts`](lib/gpa.ts)

Đúng quy chế VNU: tổng = TX×0.2 + GK×0.3 + CK×0.5 (trọng số lưu theo **từng môn**), tra bảng chữ, GPA/CPA có trọng số tín chỉ:

```ts
export const GRADE_TABLE = [
  { min: 8.5, letter: "A",  point: 4.0 }, { min: 8.0, letter: "B+", point: 3.5 },
  { min: 7.0, letter: "B",  point: 3.0 }, { min: 6.5, letter: "C+", point: 2.5 },
  { min: 5.5, letter: "C",  point: 2.0 }, { min: 5.0, letter: "D+", point: 1.5 },
  { min: 4.0, letter: "D",  point: 1.0 }, { min: 0.0, letter: "F",  point: 0.0 },
];
const total = round2(r*wr + m*wm + f*wf);   // computeCourse()
pts += Number(c.grade_point) * credits;      // gpaOf(): CPA theo tín chỉ
```

### 4.3. Phân quyền ngay trong CSDL — [`supabase/rls-major-scope.sql`](supabase/rls-major-scope.sql)

Điểm khác biệt kiến trúc: client gọi thẳng CSDL nhưng **không lách được**, vì mỗi dòng dữ liệu đều bị chính sách RLS kiểm tra. Cố vấn chỉ chạm được sinh viên ngành mình:

```sql
create or replace function public.is_my_student(sid uuid) … security definer …
  select exists (
    select 1 from public.profiles st
      join public.profiles me on me.user_id = auth.uid()
     where st.id = sid
       and ( me.role = 'manager'
             or (me.role = 'advisor'
                 and (st.advisor_id = me.id or st.advisor_id is null)) ));

create policy msg_insert on public.messages for insert with check (
  sender_id = my_profile_id()
  and (student_id = my_profile_id() or is_my_student(student_id)) );
```

### 4.4. Mô hình tài khoản an toàn — [`supabase/schema.sql`](supabase/schema.sql) (trigger đăng ký)

Không ai tự đăng ký thành cố vấn được: trigger nối hồ sơ trường cấp sẵn theo email, còn đăng ký lạ thì bị **ép cứng** vai trò sinh viên:

```sql
-- SECURITY: every new auth user gets a STUDENT profile, unconditionally.
select id into existing from public.profiles
 where lower(email) = lower(new.email) and user_id is null;
if existing is not null then
  update public.profiles set user_id = new.id where id = existing;  -- nối hồ sơ có sẵn
else
  insert into public.profiles (user_id, role, …) values (new.id, 'student', …);
end if;
```

### 4.5. Mô phỏng what-if — [`components/whatif.tsx`](components/whatif.tsx)

Tính năng hỗ trợ quyết định cho sinh viên: thay điểm giả định vào **đúng các hàm thật** (`gpaOf` + `computeRisk`) nên kết quả mô phỏng nhất quán tuyệt đối với hệ thống:

```ts
const effective = useMemo(
  () => courses.map((c) => (sim[c.id] !== undefined ? { ...c, grade_point: sim[c.id] } : c)),
  [courses, sim]);
const cur  = gpaOf(courses);    // CPA hiện tại
const simg = gpaOf(effective);  // CPA sau cải thiện
const r1 = computeRisk({ cpa: simg.gpa, /* … */ failed_count: failedOf(effective) }, cfg);
const escaped = active && r0.score >= cfg.th_medium && r1.score < cfg.th_medium;
```

## 5. Gợi ý lộ trình đọc code (15–20 phút)

1. [`supabase/schema.sql`](supabase/schema.sql) — nhìn 11 bảng + RLS gốc là nắm được toàn bộ mô hình dữ liệu và bảo mật.
2. [`lib/types.ts`](lib/types.ts) rồi [`lib/gpa.ts`](lib/gpa.ts) + [`lib/risk.ts`](lib/risk.ts) — lõi nghiệp vụ thuần, không dính giao diện.
3. [`app/student/page.tsx`](app/student/page.tsx) — trang gọn nhất có đủ mẫu hình chung (tải dữ liệu, realtime, i18n).
4. [`components/whatif.tsx`](components/whatif.tsx) — ví dụ tái dùng lõi nghiệp vụ cho tính năng mới.
5. [`app/advisor/page.tsx`](app/advisor/page.tsx) — đọc theo comment mục lục trong file: `computeOutcome`/`persistOutcomes` (chấm rủi ro theo lô), nhập Excel có xem trước, đánh giá KPI.
6. [`app/api/admin/import-students/route.ts`](app/api/admin/import-students/route.ts) — mẫu API đặc quyền: xác minh JWT + vai trò trước khi dùng `service_role`.
7. [`supabase/guards.sql`](supabase/guards.sql) + [`supabase/hardening.sql`](supabase/hardening.sql) — các rào chắn sinh ra từ kiểm thử bảo mật thực tế trên bản production.

## 6. Quy ước & bằng chứng chất lượng

| Tiêu chí | Hiện trạng |
|---|---|
| TypeScript strict | Bật toàn dự án; `npx tsc --noEmit` sạch lỗi (exit 0) |
| Build production | `next build` 11/11 trang; trang nặng nhất (advisor) 185 kB first-load JS |
| Vệ sinh mã | Không `console.log`, không TODO, không `@ts-ignore` trong mã sản phẩm |
| Song ngữ cân bằng | Script kiểm tự động: 380 khóa VI = 380 khóa EN |
| Comment | Tiếng Anh, chỉ ở chỗ giải thích ràng buộc/quyết định (không diễn giải từng dòng) |
| Bảo mật đã kiểm thật | RLS thử bằng tài khoản thật trên production — 1 lỗi gán cố vấn được phát hiện & sửa, kèm rào chắn `guards.sql` chống tái diễn |
| Tái lập được | CSDL dựng lại 100% từ 12 file SQL; app dựng lại từ `npm install` + biến môi trường |
