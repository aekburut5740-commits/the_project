import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 shadow-lg shadow-black/20">
                <Image
                  src="/logo.jpg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              </div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Welcome to Your Project Hub</p>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                CRM PROJECTS
              </h1>
            </div>

            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              ระบบสำหรับจัดการโปรเจกต์ ดูแลทีม และติดตามงานได้สะดวกขึ้น ไม่ว่าจะเป็นผู้ใช้งานทั่วไปหรือ admin ก็เริ่มงานได้ทันทีจากหน้าหลักนี้
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-4 text-base font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                เริ่มใช้งาน / เข้าสู่ระบบ
              </a>
              <a
                href="/createaccoute"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 px-8 py-4 text-base font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800"
              >
                สร้างบัญชีใหม่
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-700 bg-slate-950/60 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">คุณสมบัติเด่น</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li>• ติดตามความคืบหน้าโปรเจกต์แบบเรียลไทม์</li>
                  <li>• กำหนดผู้ดูแลและจัดการทีมได้ง่าย</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/60 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">ออกแบบมาให้</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li>• หน้าแรกโล่งให้ใส่รูปโลโก้หรือภาพใหญ่ได้</li>
                  <li>• มี CTA ชัดเจนทั้งสำหรับผู้ใช้และ admin</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-950/50 p-8 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.2),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/90 p-6 shadow-inner shadow-slate-950/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-sky-300">ตัวอย่างภาพ</p>
                    <p className="mt-2 text-xl font-semibold text-white">ตัวอย่างผลงานล่าสุด</p>
                  </div>
                  <div className="h-12 w-12 rounded-3xl bg-slate-800/80" />
                </div>
                <div className="mt-6 h-52 overflow-hidden rounded-3xl bg-slate-800/70">
                  <Image
                    src="/show.png"
                    alt="ภาพหน้าหลัก"
                    width={900}
                    height={520}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/90 p-6 shadow-inner shadow-slate-950/20">
                <p className="text-sm font-semibold text-slate-300">บางอย่างที่น่าสนใจ</p>
                <div className="mt-4 grid gap-4 text-slate-300 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-950/60 p-4">แดชบอร์ดโปรเจกต์</div>
                  <div className="rounded-3xl bg-slate-950/60 p-4">จัดการทีมได้ง่าย</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

