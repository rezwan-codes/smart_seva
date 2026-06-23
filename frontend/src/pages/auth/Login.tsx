import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Database,
  LogIn,
  LayoutDashboard,
  MapPinned,
  ShieldAlert,
  Smartphone,
  UserCog,
  UserPlus,
  WifiOff,
  Wrench,
} from "lucide-react";
import { healthService } from "../../services/healthService";

export default function Login() {
  const navigate = useNavigate();
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    healthService
      .check()
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(34,197,94,0.22),transparent_30%)]" />
        <div className="relative mx-auto flex min-h-[82vh] max-w-7xl flex-col px-5 py-5 sm:px-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950">
                <ClipboardList size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold">Digital Queue System</p>
                <p className="text-xs text-slate-300">Smart Utility Services</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/user/login")}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              User Login
            </button>
          </nav>

          {apiConnected === true && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100">
              <Database size={16} />
              Backend connected to PostgreSQL
            </div>
          )}
          {apiConnected === false && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-300/40 bg-red-500/15 px-4 py-2 text-sm text-red-100">
              <WifiOff size={16} />
              Backend offline — run `npm run dev` in the backend folder
            </div>
          )}

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-200">
                <ShieldAlert size={16} />
                Emergency alerts, live queue, nearest technician
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
                Faster complaint service for water, gas, and electricity.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Citizens submit complaints from mobile, receive an automatic
                digital token, track their queue position, and see technician
                arrival updates in real time.
              </p>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {[
                  {
                    role: "user",
                    title: "User",
                    copy: "Submit complaints and track queue position.",
                    Icon: Smartphone,
                    loginClass: "bg-sky-500 hover:bg-sky-400",
                  },
                  {
                    role: "technician",
                    title: "Technician",
                    copy: "View assigned jobs and service requests.",
                    Icon: Wrench,
                    loginClass: "bg-emerald-500 hover:bg-emerald-400",
                  },
                  {
                    role: "admin",
                    title: "Admin",
                    copy: "Manage complaints, staff, and alerts.",
                    Icon: UserCog,
                    loginClass: "bg-slate-700 hover:bg-slate-600",
                  },
                ].map(({ role, title, copy, Icon, loginClass }) => (
                  <div key={role} className="rounded-md border border-white/15 bg-white/10 p-4">
                    <Icon className="text-sky-200" size={24} />
                    <p className="mt-3 text-lg font-bold">{title}</p>
                    <p className="mt-1 min-h-10 text-sm text-slate-300">{copy}</p>
                    <div className="mt-4 grid gap-2">
                      <button
                        onClick={() => navigate(`/${role}/login`)}
                        className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition ${loginClass}`}
                      >
                        <LogIn size={16} />
                        Login
                      </button>
                      <button
                        onClick={() => navigate(`/${role}/register`)}
                        className="flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <UserPlus size={16} />
                        Register
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-md bg-slate-900 p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  UI preview only — login to load PostgreSQL data
                </p>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Current Token</p>
                    <p className="text-3xl font-bold">DQ-1026</p>
                  </div>
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-200">
                    Emergency
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Queue", "#1"],
                    ["Status", "Processing"],
                    ["ETA", "24 min"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-white/10 p-4">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 text-xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-md bg-white p-4 text-slate-950">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold">Live Area Map</p>
                    <MapPinned className="text-sky-600" size={20} />
                  </div>
                  <div className="relative h-56 overflow-hidden rounded-md bg-slate-200">
                    <div className="absolute left-[12%] top-[18%] h-20 w-28 rounded-md bg-sky-200" />
                    <div className="absolute left-[46%] top-[12%] h-24 w-36 rounded-md bg-emerald-200" />
                    <div className="absolute left-[30%] top-[54%] h-20 w-40 rounded-md bg-amber-200" />
                    <div className="absolute left-[62%] top-[50%] h-24 w-28 rounded-md bg-red-200" />
                    <span className="absolute left-[65%] top-[24%] h-4 w-4 rounded-full bg-red-600 ring-4 ring-red-200" />
                    <span className="absolute left-[32%] top-[41%] h-4 w-4 rounded-full bg-sky-600 ring-4 ring-sky-200" />
                    <span className="absolute left-[50%] top-[62%] h-4 w-4 rounded-full bg-emerald-600 ring-4 ring-emerald-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-8 sm:grid-cols-3">
            {[
              ["Automatic token", "Serial number generated after complaint submission."],
              ["Transparent tracking", "Queue position and complaint status stay visible."],
              ["Authority control", "Admins monitor complaints, technicians, and alerts."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-md border border-white/15 bg-white/10 p-4">
                <LayoutDashboard className="mb-3 text-sky-300" size={20} />
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
