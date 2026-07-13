import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  Lightbulb,
  LogOut,
  MapPinned,
  Phone,
  RefreshCw,
  Ticket,
  TrendingUp,
  Wrench,
  Activity,
} from "lucide-react";
import ApiStatusBanner from "../../components/ApiStatusBanner";
import MapTracker from "../../components/map/MapTracker";
import type { MapLocation } from "../../components/map/MapTracker";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { authService } from "../../services/authService";
import { complaintService } from "../../services/complaintService";
import type { Complaint, User } from "../../types/utility";
import { buildComplaintMapLocations } from "../../utils/mapLocations";
import {
  averageEtaMinutes,
  buildAreaIssues,
  formatDistance,
  formatEta,
  formatSubmittedAt,
  priorityStyles,
  statusStyles,
  utilityStyles,
} from "../../utils/utilityDisplay";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1600;
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

function getSmartTip(complaints: Complaint[]): { text: string; icon: string } | null {
  if (!complaints.length) {
    return { text: "No complaints yet. Submit your first utility issue to get started!", icon: "info" };
  }

  const emergency = complaints.filter((c) => c.priority === "Emergency" && c.status !== "Completed");
  if (emergency.length) {
    return { text: `You have ${emergency.length} emergency complaint${emergency.length > 1 ? "s" : ""} requiring immediate attention.`, icon: "alert" };
  }

  const pending = complaints.filter((c) => c.status === "Pending");
  if (pending.length > 2) {
    return { text: `${pending.length} complaints are pending. Consider following up for faster resolution.`, icon: "clock" };
  }

  const processing = complaints.filter((c) => c.status === "Processing");
  if (processing.length) {
    return { text: `${processing.length} complaint${processing.length > 1 ? "s are" : " is"} being processed. Track live on the map.`, icon: "map" };
  }

  return null;
}

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollInterval, setPollInterval] = useState<number>(8);
  const [activities, setActivities] = useState<{ id: string; message: string; timestamp: number; type: string }[]>([]);
  const intervalRef = useRef<number | null>(null);

  const liveLocation = useLiveLocation(Boolean(user));
  const activeComplaint = complaints.find((item) => item.status !== "Completed");
  const completedCount = complaints.filter((item) => item.status === "Completed").length;
  const areaIssues = useMemo(() => buildAreaIssues(complaints), [complaints]);
  const averageWaiting = averageEtaMinutes(complaints);
  const smartTip = getSmartTip(complaints);

  const addActivity = useCallback((message: string, type: string) => {
    setActivities((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now(), type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [complaintData, userData] = await Promise.all([complaintService.list(), authService.me()]);
      setComplaints(complaintData.complaints);
      setUser(userData.user);
      setLastUpdated(Date.now());
      setError("");
    } catch {
      setError("Could not load live database data. Please login and start the backend.");
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    buildComplaintMapLocations(complaints)
      .then(setMapLocations)
      .catch(() => {});
    
    if (complaints.length > 0) {
      const latestComplaint = complaints[0];
      addActivity(`Latest: ${latestComplaint.title.substring(0, 30)}...`, "status");
    }
  }, [complaints, addActivity]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => loadData(false), pollInterval * 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [loadData, pollInterval]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const assignedTechnicianLocation =
    typeof activeComplaint?.technician?.latitude === "number" &&
    typeof activeComplaint.technician.longitude === "number"
      ? {
          id: activeComplaint.technician.id,
          name: activeComplaint.technician.name,
          lat: activeComplaint.technician.latitude,
          lng: activeComplaint.technician.longitude,
          status: activeComplaint.technician.status,
        }
      : null;

  const stats = useMemo(
    () => [
      {
        label: "Active complaints",
        value: complaints.length - completedCount,
        Icon: Ticket,
        gradient: "from-sky-500 to-blue-600",
        iconBg: "bg-sky-100 text-sky-700",
        trend: "+2",
      },
      {
        label: "Average waiting",
        value: averageWaiting ?? 0,
        suffix: averageWaiting ? " min" : "",
        Icon: Clock,
        gradient: "from-amber-500 to-orange-600",
        iconBg: "bg-amber-100 text-amber-700",
        trend: "-3m",
      },
      {
        label: "Completed",
        value: completedCount,
        Icon: CheckCircle2,
        gradient: "from-emerald-500 to-green-600",
        iconBg: "bg-emerald-100 text-emerald-700",
        trend: "+5",
      },
    ],
    [averageWaiting, completedCount, complaints.length],
  );

  const quickActions = [
    { label: "New Complaint", icon: ClipboardPlus, path: "/new-complaint", gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/30" },
    { label: "View All", icon: ArrowRight, path: "/complaints", gradient: "from-slate-700 to-slate-900", shadow: "shadow-slate-500/30" },
    { label: "Live Map", icon: MapPinned, path: "/map", gradient: "from-emerald-500 to-green-600", shadow: "shadow-emerald-500/30" },
  ];

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {/* Enhanced Dynamic Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-5 text-white shadow-xl sm:px-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="animate-fade-in-up">
            <p className="text-lg font-bold text-white">{getTimeGreeting()}, {user?.name ?? "Citizen"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-emerald-400">Live</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Updated {timeAgo(lastUpdated)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="animate-fade-in-up flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-60 backdrop-blur-sm"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <select
              value={pollInterval}
              onChange={(event) => setPollInterval(Number(event.target.value))}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-white outline-none focus:border-sky-400 backdrop-blur-sm"
            >
              <option value={3} className="text-slate-900">3s</option>
              <option value={5} className="text-slate-900">5s</option>
              <option value={8} className="text-slate-900">8s</option>
              <option value={15} className="text-slate-900">15s</option>
            </select>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to logout?")) {
                  localStorage.clear();
                  navigate("/");
                }
              }}
              className="animate-fade-in-up flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/40"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-6">
          {/* Smart Tip Banner */}
          {smartTip && (
            <div className="animate-fade-in-up card-hover flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
                <Lightbulb size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-sky-900">Smart Insight</p>
                <p className="mt-1 text-sm text-sky-800">{smartTip.text}</p>
              </div>
            </div>
          )}

          <ApiStatusBanner />
          {isLoading && (
            <div className="animate-fade-in rounded-md bg-white p-6 text-center text-slate-600 shadow-sm">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-600" />
              Loading live data...
            </div>
          )}
          {error && <p className="animate-fade-in rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{error}</p>}

          {/* Quick Actions */}
          <div className="animate-fade-in-up grid grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map(({ label, icon: Icon, path, gradient, shadow }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`group relative overflow-hidden rounded-xl bg-gradient-to-r ${gradient} px-4 py-3 text-sm font-semibold text-white shadow-lg ${shadow} transition-all hover:shadow-xl hover:-translate-y-0.5`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center justify-center gap-2">
                  <Icon size={18} className="transition group-hover:scale-110" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Stats with animated counters */}
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, Icon, gradient, iconBg, trend }, index) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`} />
                <div className="relative flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={24} />
                  </div>
                  {trend && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      <TrendingUp size={12} />
                      {trend}
                    </span>
                  )}
                </div>
                <div className="relative mt-4">
                  <p className="text-3xl font-bold text-slate-950">
                    <AnimatedCounter target={value} suffix={label.includes("waiting") && averageWaiting ? " min" : ""} />
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </div>
                <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-20 transition-opacity duration-300 group-hover:opacity-40`} />
              </div>
            ))}
          </div>

          {/* Active Complaint Card */}
          {activeComplaint && (
            <div className="animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                      Current complaint
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{activeComplaint.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-slate-300">
                      <MapPinned size={16} />
                      {activeComplaint.area} - Submitted {formatSubmittedAt(activeComplaint.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-5 py-3 text-slate-950 shadow-lg">
                    <p className="text-xs text-slate-500">Digital Token</p>
                    <p className="text-2xl font-bold">{activeComplaint.token}</p>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-200">Service Progress</span>
                    <span className="font-bold text-white">{activeComplaint.status}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        activeComplaint.status === "Cancelled" ? "bg-rose-400" : "bg-emerald-400"
                      }`}
                      style={{
                        width: activeComplaint.status === "Cancelled" ? "100%" : activeComplaint.status === "Pending" ? "33%" : activeComplaint.status === "Processing" ? "66%" : "100%",
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>Submitted</span>
                    <span>Assigned</span>
                    <span>Processing</span>
                    <span>Completed</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-4">
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-sky-400 opacity-10 blur-xl transition-opacity group-hover:opacity-20" />
                  <Ticket className="relative text-sky-700" size={22} />
                  <p className="relative mt-3 text-sm text-slate-500">Queue Position</p>
                  <p className="relative text-3xl font-bold text-slate-950">#{activeComplaint.position}</p>
                </div>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-400 opacity-10 blur-xl transition-opacity group-hover:opacity-20" />
                  <Clock className="relative text-amber-700" size={22} />
                  <p className="relative mt-3 text-sm text-slate-500">Status</p>
                  <span className={`relative mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[activeComplaint.status]}`}>
                    {activeComplaint.status}
                  </span>
                </div>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400 opacity-10 blur-xl transition-opacity group-hover:opacity-20" />
                  <CheckCircle2 className="relative text-emerald-700" size={22} />
                  <p className="relative mt-3 text-sm text-slate-500">Priority</p>
                  <span className={`relative mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${priorityStyles[activeComplaint.priority]}`}>
                    {activeComplaint.priority}
                  </span>
                </div>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-indigo-400 opacity-10 blur-xl transition-opacity group-hover:opacity-20" />
                  <Wrench className="relative text-indigo-700" size={22} />
                  <p className="relative mt-3 text-sm text-slate-500">Technician ETA</p>
                  <p className="relative text-2xl font-bold text-slate-950">{formatEta(activeComplaint.technician?.etaMinutes)}</p>
                </div>
              </div>
            </div>
          )}

          {/* My Complaints List */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">My Complaints</h2>
              <button
                onClick={() => navigate("/complaints")}
                className="group flex items-center gap-1 text-sm font-semibold text-sky-700 transition hover:text-sky-900"
              >
                View all
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </button>
            </div>
            <div className="space-y-3">
              {complaints.map((complaint) => {
                const style = utilityStyles[complaint.type];
                const Icon = style.Icon;

                return (
                  <button
                    key={complaint.id}
                    onClick={() => navigate(`/complaints/${complaint.id}`)}
                    className="card-hover flex w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg border p-2.5 transition ${style.bg} ${style.text} ${style.border}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">{complaint.title}</p>
                        <p className="text-sm text-slate-500">
                          {complaint.token} - {complaint.type} - {complaint.area}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Submitted {formatSubmittedAt(complaint.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[complaint.status]}`}>
                        {complaint.status}
                      </span>
                      {complaint.status === "Completed" && (
                        <span className="text-xs text-emerald-600">Reviewed</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {!isLoading && !complaints.length && (
                <div className="animate-fade-in rounded-lg bg-slate-50 p-8 text-center text-slate-600">
                  <Ticket className="mx-auto mb-3 text-slate-300" size={40} />
                  <p className="font-semibold">No complaints found</p>
                  <p className="mt-1 text-sm">Submit your first complaint to get started.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="space-y-6">
          {/* Live Activity Feed */}
          {activities.length > 0 && (
            <div className="animate-fade-in-up overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Activity size={20} />
                  <h2 className="text-lg font-bold">Live Activity</h2>
                </div>
              </div>
              <div className="p-4">
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {activities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        activity.type === "create" ? "bg-sky-500" :
                        activity.type === "status" ? "bg-emerald-500" :
                        activity.type === "review" ? "bg-amber-500" :
                        "bg-slate-400"
                      }`} />
                      <span className="flex-1 text-slate-700">{activity.message}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {new Intl.DateTimeFormat(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).format(new Date(activity.timestamp))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Technician Card */}
          {activeComplaint && (
            <div className="animate-fade-in-up overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Wrench size={22} />
                  <h2 className="text-lg font-bold">Assigned Technician</h2>
                </div>
              </div>
              <div className="p-5">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400 opacity-10 blur-xl" />
                  <div className="relative">
                    <p className="text-lg font-bold text-slate-950">{activeComplaint.technician?.name ?? "Not assigned yet"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {activeComplaint.technician
                        ? `${activeComplaint.technician.skill} specialist - ${formatDistance(activeComplaint.technician.distanceKm)} away`
                        : "A technician will be assigned by the authority."}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-slate-500">ETA</p>
                        <p className="font-bold text-slate-950">{formatEta(activeComplaint.technician?.etaMinutes)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-slate-500">Rating</p>
                        <p className="font-bold text-slate-950">{activeComplaint.technician?.rating ?? "-"}/5</p>
                      </div>
                    </div>
                    <p className="relative mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <Phone size={16} />
                      {activeComplaint.technician?.phone ?? "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Map */}
          <div className="animate-fade-in-up overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <MapPinned size={22} />
                <h2 className="text-lg font-bold">Live Issue Map</h2>
              </div>
            </div>
            <div className="p-5">
              <MapTracker
                height="260px"
                locations={mapLocations}
                userLocation={liveLocation.location}
                technicianLocations={assignedTechnicianLocation ? [assignedTechnicianLocation] : []}
                initialLocation={{ lat: 23.8103, lng: 90.4125 }}
              />
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                {liveLocation.status === "tracking" && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-emerald-700">Live location shared</span>
                  </>
                )}
                {liveLocation.status === "blocked" && (
                  <>
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span className="text-amber-700">Allow location to share tracking</span>
                  </>
                )}
                {liveLocation.status === "idle" && (
                  <>
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-slate-500">Tracking starts after permission</span>
                  </>
                )}
              </div>

              {/* Area Issues */}
              {areaIssues.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area Watch</p>
                  {areaIssues.slice(0, 3).map((issue) => (
                    <div key={issue.area} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5 transition hover:bg-slate-100">
                      <AlertTriangle
                        className={`mt-0.5 shrink-0 ${issue.severity === "Emergency" ? "text-red-600" : "text-orange-600"}`}
                        size={16}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{issue.area}</p>
                        <p className="text-xs text-slate-500">{issue.status}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        issue.severity === "Emergency" ? "bg-red-100 text-red-700" :
                        issue.severity === "High" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {issue.affected}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}