import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Flame,
  Gauge,
  LogIn,
  MapPinned,
  MessageCircle,
  Navigation,
  ShieldAlert,
  Smartphone,
  Timer,
  UserCog,
  UserPlus,
  WifiOff,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { healthService } from "../../services/healthService";

type RoleCard = {
  role: "user" | "technician" | "admin";
  title: string;
  copy: string;
  metric: string;
  Icon: LucideIcon;
  tone: string;
  button: string;
  highlight?: string;
};

const roleCards: RoleCard[] = [
  {
    role: "user",
    title: "Citizen",
    copy: "Submit utility complaints, receive a token, chat with the assigned technician, and follow live progress on the map.",
    metric: "Token + live tracking",
    Icon: Smartphone,
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    button: "bg-sky-600 hover:bg-sky-700",
    highlight: "Most used",
  },
  {
    role: "technician",
    title: "Technician",
    copy: "Accept assigned jobs, share live location, update status in real-time, and coordinate directly with citizens via chat.",
    metric: "Field job control",
    Icon: Wrench,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    role: "admin",
    title: "Authority",
    copy: "Monitor emergency zones, assign technicians, manage users, track analytics, and keep the service queue moving efficiently.",
    metric: "City service command",
    Icon: UserCog,
    tone: "bg-slate-100 text-slate-800 border-slate-200",
    button: "bg-slate-950 hover:bg-slate-800",
  },
];

const liveIssues = [
  { type: "Electricity", area: "Dhanmondi", status: "Emergency", Icon: Zap, color: "bg-red-600", top: "24%", left: "67%", count: 3 },
  { type: "Gas", area: "Mirpur", status: "High", Icon: Flame, color: "bg-yellow-400", top: "58%", left: "38%", count: 5 },
  { type: "Water", area: "Uttara", status: "Normal", Icon: Droplets, color: "bg-emerald-600", top: "38%", left: "18%", count: 2 },
  { type: "Electricity", area: "Mohammadpur", status: "High", Icon: Zap, color: "bg-orange-500", top: "72%", left: "55%", count: 4 },
];

const headlineWords = [
  "Report",
  "utility",
  "problems",
  "instantly,",
  "track",
  "the",
  "queue",
  "live,",
  "and",
  "chat",
  "with",
  "your",
  "assigned",
  "technician.",
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1800;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <span>{count}{suffix}</span>;
}

export default function Login() {
  const navigate = useNavigate();
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [activeIssue, setActiveIssue] = useState(0);
  const [displayedWords, setDisplayedWords] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    healthService
      .check()
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIssue((current) => (current + 1) % liveIssues.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (displayedWords < headlineWords.length) {
      const timeout = setTimeout(() => setDisplayedWords((w) => w + 1), 70);
      return () => clearTimeout(timeout);
    }
  }, [displayedWords]);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(blink);
  }, []);

  const active = liveIssues[activeIssue];
  const ActiveIcon = active.Icon;

  const serviceStats = useMemo(
    () => [
      { label: "Emergency priority", value: 247, Icon: ShieldAlert, color: "text-red-700", bg: "bg-red-50", suffix: "+", gradient: "from-red-500 to-rose-600" },
      { label: "High priority", value: 1842, Icon: AlertTriangle, color: "text-yellow-700", bg: "bg-yellow-50", suffix: "", gradient: "from-amber-500 to-orange-600" },
      { label: "Normal priority", value: 5310, Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", suffix: "", gradient: "from-emerald-500 to-green-600" },
      { label: "Active field jobs", value: 86, Icon: MessageCircle, color: "text-sky-700", bg: "bg-sky-50", suffix: "", gradient: "from-sky-500 to-blue-600" },
    ],
    [],
  );

  const tickerItems = useMemo(
    () => [
      "Emergency: Electricity outage in Dhanmondi - 3 pending",
      "High: Gas leak reported in Mirpur - 5 units dispatched",
      "Normal: Water supply issue in Uttara - 2 technicians assigned",
      "High: Electricity fluctuation in Mohammadpur - monitoring active",
      "System: All field technicians online and operational",
      "Update: Average response time reduced to 18 minutes",
    ],
    [],
  );

  const duplicatedTicker = [...tickerItems, ...tickerItems];

  const visibleIssues = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      result.push(liveIssues[(activeIssue + i) % liveIssues.length]);
    }
    return result;
  }, [activeIssue]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 overflow-x-hidden">
      {/* Sticky Black Header */}
      <header className="sticky-header hero-gradient border-b border-white/10 shadow-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left transition hover:opacity-90"
            aria-label="Smart Utility home"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-950 shadow-lg">
              <ClipboardList size={24} />
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Smart Utility</p>
              <p className="text-xs text-slate-300">Digital Queue & Emergency Response</p>
            </div>
          </button>

          <div className="hidden items-center gap-3 sm:flex">
            {apiConnected === true && (
              <div className="animate-fade-in flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 backdrop-blur-sm">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
                </div>
                Backend online
              </div>
            )}
            {apiConnected === false && (
              <div className="animate-fade-in flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 backdrop-blur-sm">
                <WifiOff size={16} className="text-red-300" />
                Backend offline
              </div>
            )}
            {apiConnected === null && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur-sm">
                <Activity size={16} className="animate-spin text-sky-300" />
                Checking service
              </div>
            )}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-sm">
              <Timer size={16} className="text-sky-300" />
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl overflow-hidden">
            <div className="animate-ticker flex whitespace-nowrap py-2">
              {duplicatedTicker.map((item, index) => (
                <span key={index} className="mx-6 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:py-16">
          <div className="lg:w-1/2">
            <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 backdrop-blur-sm">
              <ShieldAlert size={16} />
              <span>Emergency-first service routing</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            </div>

            <h1 className="animate-fade-in-up delay-100 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              <span className="block text-white">{getTimeGreeting()},</span>
              <span className="mt-3 block bg-gradient-to-r from-sky-300 via-white to-emerald-300 bg-clip-text text-transparent animate-gradient">
                {headlineWords.slice(0, displayedWords).join(" ")}
                {displayedWords < headlineWords.length && (
                  <span className={`text-sky-300 ${showCursor ? "typing-cursor" : "opacity-0"}`} />
                )}
              </span>
            </h1>

            <p className="animate-fade-in-up delay-200 mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              A smart service portal for water, gas, and electricity complaints with AI-priority maps,
              digital tokens, live technician GPS tracking, and job-based chat.
            </p>

            <div className="animate-fade-in-up delay-300 mt-8 grid gap-3 sm:grid-cols-2">
              {serviceStats.map(({ label, value, Icon, color, bg, suffix, gradient }) => (
                <div
                  key={label}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
                  <div className="relative flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={color} size={20} />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bg} ${color}`}>
                      <AnimatedCounter target={value} suffix={suffix} />
                    </span>
                  </div>
                  <p className="relative mt-2 text-sm text-slate-400">{label}</p>
                  <div className={`mt-2 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-20 transition-opacity duration-300 group-hover:opacity-40`} />
                </div>
              ))}
            </div>

            <div className="animate-fade-in-up delay-400 mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/user/login")}
                className="group relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <LogIn size={18} className="relative transition group-hover:scale-110" />
                <span className="relative">Citizen Login</span>
              </button>
              <button
                onClick={() => navigate("/user/register")}
                className="group relative flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-slate-950 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 opacity-0 transition-opacity group-hover:opacity-100" />
                <UserPlus size={18} className="relative transition group-hover:scale-110" />
                <span className="relative">Submit First Complaint</span>
              </button>
            </div>
          </div>

          {/* Map Preview */}
          <div className="animate-slide-in-right delay-500 mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl lg:ml-10 lg:mt-0 lg:w-1/2">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Live Operations Preview</p>
                <p className="text-xl font-bold text-slate-950">Service Area Map</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {active.status}
              </span>
            </div>

            <div className="grid lg:grid-cols-[1fr_240px]">
              <div className="relative h-[360px] overflow-hidden bg-slate-200 sm:h-[420px]">
                <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:34px_34px]" />
                <div className="absolute left-[8%] top-[12%] h-24 w-36 rounded-md bg-sky-100 ring-1 ring-sky-200" />
                <div className="absolute left-[38%] top-[10%] h-32 w-44 rounded-md bg-emerald-100 ring-1 ring-emerald-200" />
                <div className="absolute left-[19%] top-[55%] h-28 w-48 rounded-md bg-yellow-100 ring-1 ring-yellow-200" />
                <div className="absolute left-[61%] top-[48%] h-32 w-36 rounded-md bg-red-100 ring-1 ring-red-200" />

                <div className="absolute left-[12%] top-[42%] h-2 w-[70%] rotate-[-8deg] rounded-full bg-white shadow" />
                <div className="absolute left-[30%] top-[20%] h-[62%] w-2 rotate-[18deg] rounded-full bg-white shadow" />

                {visibleIssues.map((issue, index) => {
                  const IssueIcon = issue.Icon;
                  const isActive = activeIssue % liveIssues.length === liveIssues.indexOf(issue);
                  return (
                    <div
                      key={`${issue.type}-${issue.area}-${index}`}
                      className={`absolute flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-white shadow-lg ring-4 transition-all duration-500 ${
                        issue.color
                      } ${isActive ? "scale-110 ring-slate-900/30 animate-glow" : "ring-white/60 scale-100"}`}
                      style={{ top: issue.top, left: issue.left }}
                    >
                      {isActive && <div className="absolute inset-0 rounded-full animate-pulse-ring" />}
                      <IssueIcon size={20} />
                    </div>
                  );
                })}

                <div className="absolute bottom-4 left-4 rounded-lg bg-white p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-md text-white ${active.color}`}>
                      <ActiveIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{active.type} issue</p>
                      <p className="text-sm text-slate-500">{active.area} service zone</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 right-4 rounded-lg bg-white/90 p-2 shadow-lg backdrop-blur-sm">
                  <p className="text-xs font-bold text-slate-500">Live issues</p>
                  <p className="text-2xl font-black text-slate-950">{liveIssues.length}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
                <p className="text-sm font-semibold text-slate-500">Current Token</p>
                <p className="mt-1 text-3xl font-bold text-slate-950">SU-1026</p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Queue", value: "#1", Icon: ClipboardList },
                    { label: "Status", value: "Processing", Icon: Gauge },
                    { label: "ETA", value: "24 min", Icon: Timer },
                    { label: "Technician", value: "Live", Icon: Navigation },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="flex items-center justify-between rounded-md bg-slate-100 p-3">
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon size={16} />
                        {label}
                      </span>
                      <span className="font-bold text-slate-950">{value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/map")}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 hover:shadow-lg"
                >
                  <MapPinned size={17} />
                  Open Live Map
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Animation Strip */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="animate-fade-in-up text-center">
          <h2 className="text-3xl font-bold text-slate-950">Service Coverage</h2>
          <p className="mt-2 text-slate-600">Real-time monitoring for all utility services</p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              name: "Water Supply",
              Icon: Droplets,
              color: "text-sky-600",
              bg: "bg-sky-50",
              border: "border-sky-200",
              animation: "animate-floatWater",
              description: "Monitor water pressure, pipe leaks, and supply disruptions across all zones.",
            },
            {
              name: "Gas Network",
              Icon: Flame,
              color: "text-orange-600",
              bg: "bg-orange-50",
              border: "border-orange-200",
              animation: "animate-flickerGas",
              description: "Track gas flow, detect leaks, and dispatch emergency response teams instantly.",
            },
            {
              name: "Electricity Grid",
              Icon: Zap,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
              border: "border-yellow-200",
              animation: "animate-sparkElectricity",
              description: "Monitor power outages, line faults, and restore service with precision ETA.",
            },
          ].map((service, index) => (
            <div
              key={service.name}
              className={`group relative overflow-hidden rounded-2xl border-2 ${service.border} ${service.bg} p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${service.name === "Water Supply" ? "from-sky-400 to-blue-500" : service.name === "Gas Network" ? "from-orange-400 to-red-500" : "from-yellow-400 to-amber-500"} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`} />
              <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${service.bg}`}>
                {service.name === "Water Supply" && (
                  <div className="absolute inset-0 rounded-full border-2 border-sky-300 opacity-30 animate-ping" style={{ animationDuration: "2s" }} />
                )}
                <service.Icon size={40} className={`${service.color} ${service.animation}`} />
              </div>
              <h3 className="relative mt-4 text-xl font-bold text-slate-950">{service.name}</h3>
              <p className="relative mt-2 text-sm text-slate-600">{service.description}</p>
              <div className="relative mt-4 flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">Live monitoring</span>
              </div>
              <div className={`relative mt-3 h-1 w-full rounded-full bg-gradient-to-r ${service.name === "Water Supply" ? "from-sky-400 to-blue-500" : service.name === "Gas Network" ? "from-orange-400 to-red-500" : "from-yellow-400 to-amber-500"} opacity-30`} />
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards Section */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="animate-fade-in-up mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-950">Choose Your Portal</h2>
          <p className="mt-2 text-slate-600">Select your role to access the right dashboard and tools</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {roleCards.map(({ role, title, copy, metric, Icon, button, highlight }, index) => (
            <article
              key={role}
              onMouseEnter={() => setHoveredCard(role)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ animationDelay: `${(index + 3) * 150}ms` }}
            >
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br from-transparent to-black/5 transition-opacity duration-300 ${hoveredCard === role ? "opacity-100" : "opacity-0"}`} />
              {highlight && (
                <span className="absolute right-4 top-4 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  {highlight}
                </span>
              )}
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 ${hoveredCard === role ? "scale-110" : ""} ${role === "user" ? "bg-sky-100 text-sky-700" : role === "technician" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-800"}`}>
                <Icon size={28} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{metric}</p>
              <h2 className="mt-1 text-2xl font-bold">{title}</h2>
              <p className="mt-3 min-h-16 leading-6 text-slate-600">{copy}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => navigate(`/${role}/login`)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 ${button} ${hoveredCard === role ? "shadow-lg scale-[1.02]" : ""}`}
                >
                  <LogIn size={16} />
                  Login
                </button>
                <button
                  onClick={() => navigate(`/${role}/register`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all duration-300 hover:bg-slate-200 hover:shadow-md"
                >
                  <UserPlus size={16} />
                  Register
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">How It Works</h2>
              <p className="mt-1 text-sm text-slate-600">Four simple steps to get your utility issues resolved</p>
            </div>
            <BarChart3 className="text-slate-300" size={32} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Submit complaint", "Choose utility type, priority, photo, and exact location.", "bg-sky-500", "from-sky-500 to-blue-600"],
              ["2", "Get token", "The system creates a queue token and finds a matching technician.", "bg-emerald-500", "from-emerald-500 to-green-600"],
              ["3", "Track service", "Follow map markers, technician ETA, and job status changes.", "bg-amber-500", "from-amber-500 to-orange-600"],
              ["4", "Chat and review", "Talk inside the assigned job and rate completed work.", "bg-slate-950", "from-slate-700 to-slate-900"],
            ].map(([step, title, copy, bgColor, gradient], index) => (
              <div
                key={step}
                className={`group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                style={{ animationDelay: `${(index + 6) * 150}ms` }}
              >
                <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white ${bgColor}`}>
                  {step}
                </div>
                <p className="relative mt-4 font-bold text-slate-950">{title}</p>
                <p className="relative mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                <div className={`relative mt-3 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-30`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Issues Marquee */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="animate-fade-in-up mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={22} />
              <h3 className="text-lg font-bold text-slate-950">Live Issues Across Service Zones</h3>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {liveIssues.map((issue, index) => {
              const IssueIcon = issue.Icon;
              return (
                <div
                  key={`${issue.type}-${issue.area}`}
                  className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    activeIssue === index ? "ring-2 ring-sky-400 shadow-lg" : ""
                  }`}
                  style={{ animationDelay: `${(index + 10) * 100}ms` }}
                >
                  <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${issue.color} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
                  <div className="relative flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${issue.color}`}>
                      <IssueIcon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950">{issue.area}</p>
                      <p className="text-sm text-slate-500">{issue.type} - {issue.status}</p>
                      <p className="text-xs text-slate-400">{issue.count} active complaints</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}