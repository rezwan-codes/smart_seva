import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  ImageOff,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  ShieldAlert,
  Wrench,
  RefreshCw,
  Activity,
  TrendingUp,
} from "lucide-react";
import ApiStatusBanner from "../../components/ApiStatusBanner";
import MapTracker from "../../components/map/MapTracker";
import type { MapLocation } from "../../components/map/MapTracker";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { authService } from "../../services/authService";
import { complaintService } from "../../services/complaintService";
import { requestService } from "../../services/requestService";
import type {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  RequestType,
  TechnicianRequest,
  User,
} from "../../types/utility";
import { buildComplaintMapLocations } from "../../utils/mapLocations";
import {
  averageEtaMinutes,
  formatEta,
  formatSubmittedAt,
  priorityStyles,
  utilityStyles,
} from "../../utils/utilityDisplay";

type TechnicianSection = "Dashboard" | "My Jobs" | "Available Jobs" | "Admin Requests";

const SECTIONS: TechnicianSection[] = ["Dashboard", "My Jobs", "Available Jobs", "Admin Requests"];

const STATUSES: ComplaintStatus[] = ["Pending", "Processing"];
const PRIORITIES: ComplaintPriority[] = ["Normal", "High", "Emergency"];
const requestTypes: RequestType[] = ["Assignment", "Help", "Reassign", "Other"];

interface ActivityItem {
  id: string;
  message: string;
  timestamp: number;
  type: "assign" | "status" | "request" | "complete" | "confirm" | "emergency";
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<TechnicianSection>("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [openJobs, setOpenJobs] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<TechnicianRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [jobMapLocations, setJobMapLocations] = useState<MapLocation[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pollInterval, setPollInterval] = useState<number>(8);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<number | null>(null);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [requestingJobId, setRequestingJobId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<RequestType>("Assignment");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestContext, setRequestContext] = useState<"available" | "assigned">("available");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showCompletedInAssignments, setShowCompletedInAssignments] = useState(false);

  const liveLocation = useLiveLocation(Boolean(currentUser));

  const assignedJobs = complaints.filter((complaint) => complaint.status !== "Completed");
  const completedJobs = complaints.filter((complaint) => complaint.status === "Completed");
  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const avgEta = useMemo(() => averageEtaMinutes(assignedJobs), [assignedJobs]);

  const utilityBreakdown = useMemo(() => {
    return assignedJobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {});
  }, [assignedJobs]);

  const addActivity = useCallback((message: string, type: ActivityItem["type"]) => {
    setActivities((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now(), type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [userData, assignedData, openData, requestData] = await Promise.all([
        authService.me(),
        complaintService.list(),
        complaintService.listOpenJobs(),
        requestService.list(),
      ]);
      setCurrentUser(userData.user);
      setComplaints(assignedData.complaints);
      setOpenJobs(openData.complaints);
      setRequests(requestData.requests);
      setLastUpdated(Date.now());
      setError("");
    } catch {
      setError("Could not load technician data from the backend.");
    } finally {
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    buildComplaintMapLocations([...complaints, ...openJobs])
      .then(setJobMapLocations)
      .catch(() => {});
  }, [complaints, openJobs]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => loadData(false), pollInterval * 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [loadData, pollInterval]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConfirmJob = async (jobId: string) => {
    setActionError("");
    try {
      await complaintService.confirm(jobId);
      setConfirmingId(null);
      await loadData();
      addActivity(`Confirmed job assignment`, "confirm");
    } catch {
      setActionError("Could not confirm this job. Please try again.");
    }
  };

  const handleCompleteWork = async (jobId: string) => {
    setActionError("");
    try {
      await complaintService.updateStatus(jobId, "Completed", completionNote.trim() || "Work completed on site");
      setCompletingId(null);
      setCompletionNote("");
      await loadData();
      addActivity(`Completed job`, "complete");
    } catch {
      setActionError("Could not mark this job as completed. Please try again.");
    }
  };

  const handleRequestAdmin = async (complaintId: string) => {
    if (!requestMessage.trim()) {
      setActionError("Please enter a message for the admin.");
      return;
    }
    setActionError("");
    try {
      await requestService.create({
        complaintId,
        type: requestType,
        message: requestMessage.trim(),
      });
      setRequestingJobId(null);
      setRequestMessage("");
      setRequestType("Assignment");
      setRequestContext("available");
      await loadData();
      addActivity(`Sent admin request`, "request");
    } catch {
      setActionError("Could not send request to admin. You may already have a pending request for this job.");
    }
  };

  const openRequestForm = (
    job: Complaint,
    context: "available" | "assigned",
    type: RequestType,
    message: string,
  ) => {
    setRequestContext(context);
    setRequestingJobId(job.id);
    setRequestType(type);
    setRequestMessage(message);
  };

  const requestFormTypes =
    requestContext === "assigned"
      ? requestTypes.filter((type) => type !== "Assignment")
      : requestTypes;

  const selectSection = (section: TechnicianSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const resetAssignmentFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortBy("priority");
    setTypeFilter(null);
    setShowCompletedInAssignments(false);
    setExpandedCardId(null);
  };

  const handleToggleCard = (jobId: string) => {
    setExpandedCardId((prev) => (prev === jobId ? null : jobId));
  };

  const sectionTitles: Record<TechnicianSection, string> = {
    Dashboard: "Technician Dashboard",
    "My Jobs": "My Jobs",
    "Available Jobs": "Available Jobs",
    "Admin Requests": "My Admin Requests",
  };

  const sectionDescriptions: Record<TechnicianSection, string> = {
    Dashboard: "Overview of your assigned jobs, available work, and live map.",
    "My Jobs": "Active work assigned to you. Use filters to narrow results.",
    "Available Jobs": "Open jobs matching your skill. Auto-matched jobs require your confirmation.",
    "Admin Requests": "Track requests you sent to the authority panel.",
  };

  const sidebar = (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] shadow-lg shadow-blue-500/30">
          <Wrench size={22} className="text-white" />
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <div>
          <p className="font-bold text-white">Technician</p>
          <p className="text-xs text-slate-400">Smart Utility</p>
        </div>
      </div>
      <nav className="mt-8 space-y-1.5 text-sm">
        {SECTIONS.map((item) => (
          <button
            key={item}
            onClick={() => selectSection(item)}
            className={`relative w-full rounded-lg px-3 py-2.5 text-left font-semibold transition-all duration-200 ${
              activeSection === item
                ? "bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {activeSection === item && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] opacity-100" />
            )}
            <span className="relative flex items-center justify-between">
              {item}
              {item === "Dashboard" && pendingRequests.length > 0 && (
                <span className="relative z-10 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-slate-950 font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Activity size={14} className="text-emerald-400" />
            <span>System Status</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400">All systems operational</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Polling: {pollInterval}s
          </div>
        </div>
      </div>
    </>
  );

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const renderDashboard = () => {
    const completionRate = completedJobs.length + assignedJobs.length > 0
      ? Math.round((completedJobs.length / (completedJobs.length + assignedJobs.length)) * 100)
      : 0;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Assigned Jobs",
              value: assignedJobs.length,
              Icon: ClipboardList,
              gradient: "from-blue-500 to-blue-600",
              iconBg: "bg-blue-100 text-blue-700",
              trend: "+3",
            },
            {
              label: "Open Jobs",
              value: openJobs.length,
              Icon: Wrench,
              gradient: "from-teal-500 to-teal-600",
              iconBg: "bg-teal-100 text-teal-700",
              trend: "+2",
            },
            {
              label: "Pending Requests",
              value: pendingRequests.length,
              Icon: Clock,
              gradient: "from-amber-500 to-amber-600",
              iconBg: "bg-amber-100 text-amber-700",
              pulse: pendingRequests.length > 0,
            },
            {
              label: "Avg ETA",
              value: formatEta(avgEta ?? undefined),
              Icon: Navigation,
              gradient: "from-emerald-500 to-emerald-600",
              iconBg: "bg-emerald-100 text-emerald-700",
              trend: "-2m",
            },
          ].map(({ label, value, Icon, gradient, iconBg, trend, pulse }) => (
            <div
              key={label}
              className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                pulse ? "animate-glow" : ""
              }`}
            >
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`} />
              <div className="relative flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={24} />
                </div>
                {pulse && (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                  </span>
                )}
                {trend && !pulse && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                    <TrendingUp size={12} />
                    {trend}
                  </span>
                )}
              </div>
              <div className="relative mt-4">
                <p className="text-3xl font-bold text-slate-950">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
              <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-20 transition-opacity duration-300 group-hover:opacity-40`} />
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm border border-emerald-100">
            <p className="text-sm font-semibold text-slate-600">Completed Jobs</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{completedJobs.length}</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-200">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{completionRate}% completion rate</p>
          </div>
          {(["Water", "Gas", "Electricity"] as const).map((type) => {
            const style = utilityStyles[type];
            const Icon = style.Icon;
            const count = utilityBreakdown[type] ?? 0;
            return (
              <div
                key={type}
                className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              >
                <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${type === "Water" ? "from-sky-400 to-blue-500" : type === "Gas" ? "from-amber-400 to-orange-500" : "from-emerald-400 to-green-500"} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
                <div className="relative flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">{type}</p>
                    <p className="text-2xl font-bold text-slate-950">{count}</p>
                  </div>
                </div>
                <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${type === "Water" ? "from-sky-400 to-blue-500" : type === "Gas" ? "from-amber-400 to-orange-500" : "from-emerald-400 to-green-500"} opacity-30`} />
              </div>
            );
          })}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-950">Live Job Map</h1>
              <p className="mt-1 text-sm text-slate-500">
                Your account location is shared while this dashboard is open.
              </p>
            </div>
            <Link
              to="/map"
              className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-[#1d4ed8] hover:to-[#1e40af] hover:shadow-xl hover:shadow-blue-500/40"
            >
              <Navigation size={16} />
              Open full map
            </Link>
          </div>
          <MapTracker
            height="300px"
            locations={jobMapLocations}
            userLocation={liveLocation.location}
            initialLocation={liveLocation.location ?? { lat: 23.8103, lng: 90.4125 }}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#EF4444]/10 px-3 py-1 text-[#EF4444]">Emergency</span>
            <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[#F59E0B]">High</span>
            <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-[#22C55E]">Normal</span>
            <span className="rounded-full bg-[#2563EB]/10 px-3 py-1 text-[#2563EB]">
              {liveLocation.status === "tracking" ? "Live tracking on" : "Allow location"}
            </span>
          </div>
        </section>

        {activities.length > 0 && (
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">Live Activity Feed</h3>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {activities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      activity.type === "emergency"
                        ? "bg-red-500"
                        : activity.type === "assign"
                          ? "bg-blue-500"
                          : activity.type === "status"
                            ? "bg-emerald-500"
                            : activity.type === "complete"
                              ? "bg-green-500"
                              : activity.type === "confirm"
                                ? "bg-teal-500"
                                : "bg-slate-400"
                    }`}
                  />
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
          </section>
        )}
      </div>
    );
  };

  const filteredAndSortedJobs = useMemo(() => {
    const filtered = assignedJobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (priorityFilter !== "all" && job.priority !== priorityFilter) return false;
      if (typeFilter && job.type !== typeFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    const priorityScore = { Emergency: 3, High: 2, Normal: 1 };

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
        case "eta":
          return (a.technician?.etaMinutes ?? Infinity) - (b.technician?.etaMinutes ?? Infinity);
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "token":
          return (a.token ?? "").localeCompare(b.token ?? "");
        default:
          return 0;
      }
    });

    return sorted;
  }, [assignedJobs, statusFilter, priorityFilter, sortBy, typeFilter]);

  const renderMyJobs = () => (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">My Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Active work assigned to you. Use filters to narrow results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#2563EB]"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            {showCompletedInAssignments && (
              <option value="Completed">Completed</option>
            )}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#2563EB]"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#2563EB]"
          >
            <option value="priority">Sort: Priority</option>
            <option value="eta">Sort: ETA</option>
            <option value="recent">Sort: Recent</option>
            <option value="token">Sort: Token</option>
          </select>
          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="flex items-center gap-2 rounded-md border border-[#2563EB]/20 bg-[#2563EB]/10 px-3 py-2 text-xs font-semibold text-[#2563EB] transition hover:bg-[#2563EB]/20"
            >
              {typeFilter}
              <span className="text-[#2563EB]">×</span>
            </button>
          )}
          <button
            onClick={resetAssignmentFilters}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-4">
        {filteredAndSortedJobs.map((job) => {
          const hasPendingRequest = requests.some(
            (request) => request.complaintId === job.id && request.status === "Pending",
          );

          return (
            <div key={job.id}>
              <JobCard
                job={job}
                completingId={completingId}
                completionNote={completionNote}
                onStartComplete={() => setCompletingId(job.id)}
                onCancelComplete={() => {
                  setCompletingId(null);
                  setCompletionNote("");
                }}
                onComplete={() => handleCompleteWork(job.id)}
                onNoteChange={setCompletionNote}
                onRequestAdmin={() =>
                  openRequestForm(
                    job,
                    "assigned",
                    "Help",
                    `I need admin support for assigned job ${job.token}.`,
                  )
                }
                hasPendingRequest={hasPendingRequest}
                isExpanded={expandedCardId === job.id}
                onToggle={() => handleToggleCard(job.id)}
              />

              {requestingJobId === job.id && requestContext === "assigned" && (
                <div className="mt-3 rounded-md border border-[#2563EB]/20 bg-[#2563EB]/10 p-4">
                  <p className="font-semibold text-[#0F172A]">Request admin</p>
                  <select
                    value={requestType}
                    onChange={(event) => setRequestType(event.target.value as RequestType)}
                    className="mt-3 w-full rounded-md border border-[#2563EB]/20 px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                  >
                    {requestFormTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={requestMessage}
                    onChange={(event) => setRequestMessage(event.target.value)}
                    placeholder="Explain why you need admin action..."
                    className="mt-3 w-full rounded-md border border-[#2563EB]/20 p-3 outline-none focus:border-[#2563EB]"
                    rows={3}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRequestAdmin(job.id)}
                      className="flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 font-semibold text-white transition hover:bg-[#1d4ed8]"
                    >
                      <Send size={16} />
                      Send request
                    </button>
                    <button
                      onClick={() => {
                        setRequestingJobId(null);
                        setRequestMessage("");
                      }}
                      className="rounded-md bg-white px-4 py-2 font-semibold text-[#0F172A] ring-1 ring-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!filteredAndSortedJobs.length && (
          <p className="rounded-md bg-slate-50 p-4 text-[#0F172A]">No jobs match the current filters.</p>
        )}
      </div>
    </section>
  );

  const renderAvailableJobs = () => {
    const myTechnicianId = currentUser?.technician?.id;

    return (
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0F172A]">Available Jobs</h1>
        <p className="mt-1 text-slate-500">
          Open jobs matching your skill. Auto-matched jobs require your confirmation.
        </p>
        <div className="mt-5 grid gap-4">
          {openJobs.map((job) => {
            const style = utilityStyles[job.type];
            const hasPendingRequest = requests.some(
              (request) => request.complaintId === job.id && request.status === "Pending",
            );
            const isAutoMatched = job.technician?.id === myTechnicianId;

            return (
              <article key={job.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    {job.photoUrl ? (
                      <img
                        src={job.photoUrl}
                        alt={job.title}
                        className="mb-3 h-40 w-full max-w-xs rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-40 max-w-xs items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                        <div className="text-center text-slate-400">
                          <ImageOff size={32} className="mx-auto" />
                          <p className="mt-1 text-sm">No photo</p>
                        </div>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-[#2563EB]">{job.token}</p>
                    <h2 className="mt-1 text-xl font-bold text-[#0F172A]">{job.title}</h2>
                    <p className="mt-2 text-slate-500">{job.description}</p>
                    <p className="mt-2 flex items-center gap-2 text-slate-500">
                      <MapPin size={18} />
                      {job.area}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text}`}>
                    {job.type}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${priorityStyles[job.priority]}`}>
                    {job.priority}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {job.status}
                  </span>
                  {isAutoMatched && (
                    <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-sm font-semibold text-[#22C55E]">
                      Auto-matched to you
                    </span>
                  )}
                </div>

                {hasPendingRequest ? (
                  <p className="mt-4 rounded-md bg-[#F59E0B]/10 p-3 text-sm font-semibold text-[#F59E0B]">
                    Admin request pending for this job.
                  </p>
                ) : confirmingId === job.id ? (
                  <div className="mt-4 rounded-md border border-[#22C55E]/20 bg-[#22C55E]/10 p-4">
                    <p className="font-semibold text-[#0F172A]">Confirm this assignment</p>
                    <p className="mb-3 mt-1 text-sm text-slate-500">
                      Confirm that you accept this job and are ready to work on it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleConfirmJob(job.id)}
                        className="rounded-md bg-[#22C55E] px-4 py-2 font-semibold text-white transition hover:bg-[#16a34a]"
                      >
                        Confirm and start
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md bg-white px-4 py-2 font-semibold text-[#0F172A] ring-1 ring-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : requestingJobId === job.id ? (
                  <div className="mt-4 rounded-md border border-[#2563EB]/20 bg-[#2563EB]/10 p-4">
                    <p className="font-semibold text-[#0F172A]">Request admin</p>
                    <select
                      value={requestType}
                      onChange={(event) => setRequestType(event.target.value as RequestType)}
                      className="mt-3 w-full rounded-md border border-[#2563EB]/20 px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                    >
                      {requestTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={requestMessage}
                      onChange={(event) => setRequestMessage(event.target.value)}
                      placeholder="Explain why you need admin action..."
                      className="mt-3 w-full rounded-md border border-[#2563EB]/20 p-3 outline-none focus:border-[#2563EB]"
                      rows={3}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRequestAdmin(job.id)}
                        className="flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 font-semibold text-white transition hover:bg-[#1d4ed8]"
                      >
                        <Send size={16} />
                        Send request
                      </button>
                      <button
                        onClick={() => {
                          setRequestingJobId(null);
                          setRequestMessage("");
                        }}
                        className="rounded-md bg-white px-4 py-2 font-semibold text-[#0F172A] ring-1 ring-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isAutoMatched && (
                      <button
                        onClick={() => setConfirmingId(job.id)}
                        className="flex items-center gap-2 rounded-md bg-[#22C55E] px-4 py-2 font-semibold text-white transition hover:bg-[#16a34a]"
                      >
                        <CheckCircle2 size={16} />
                        Confirm assignment
                      </button>
                    )}
                    {!isAutoMatched && (
                      <button
                        onClick={() =>
                          openRequestForm(
                            job,
                            "available",
                            "Assignment",
                            `I am available to take job ${job.token} in ${job.area}.`,
                          )
                        }
                        className="flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 font-semibold text-white transition hover:bg-[#1d4ed8]"
                      >
                        <MessageSquare size={16} />
                        Request admin
                      </button>
                    )}
                    <Link
                      to={`/complaints/${job.id}`}
                      className="flex items-center gap-2 rounded-md bg-[#0F172A] px-4 py-2 font-semibold text-white transition hover:bg-[#1e293b]"
                    >
                      <ExternalLink size={16} />
                      View job
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
          {!openJobs.length && (
            <p className="rounded-md bg-slate-50 p-4 text-slate-600">No open jobs available for your skill right now.</p>
          )}
        </div>
      </section>
    );
  };

  const renderAdminRequests = () => (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold text-[#0F172A]">My Admin Requests</h1>
      <p className="mt-1 text-slate-500">Track requests you sent to the authority panel.</p>
      <div className="mt-5 space-y-3">
        {requests.map((request) => (
          <article key={request.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {request.complaint?.token} · {request.complaint?.title}
                </p>
                <p className="text-sm text-slate-500">
                  {request.type} · {formatSubmittedAt(request.createdAt)}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                  request.status === "Approved"
                    ? "bg-[#22C55E]/10 text-[#22C55E]"
                    : request.status === "Rejected"
                      ? "bg-[#EF4444]/10 text-[#EF4444]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                }`}
              >
                {request.status}
              </span>
            </div>
            <p className="mt-3 text-slate-600">{request.message}</p>
            {request.adminNote && (
              <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
                Admin reply: {request.adminNote}
              </p>
            )}
          </article>
        ))}
        {!requests.length && (
          <p className="rounded-md bg-slate-50 p-4 text-slate-600">You have not sent any admin requests yet.</p>
        )}
      </div>
    </section>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return renderDashboard();
      case "My Jobs":
        return renderMyJobs();
      case "Available Jobs":
        return renderAvailableJobs();
      case "Admin Requests":
        return renderAdminRequests();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-[#0F172A]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 p-5 text-white lg:block">
        {sidebar}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative h-full w-64 bg-slate-950 p-5 text-white">{sidebar}</aside>
        </div>
      )}

      <main className="px-5 py-6 sm:px-8 lg:ml-64">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-xl sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg bg-white/10 p-2 lg:hidden backdrop-blur-sm"
              aria-label="Open navigation"
            >
              <Menu size={20} className="text-white" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{sectionTitles[activeSection]}</h1>
                {activeSection === "Dashboard" && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-300">{sectionDescriptions[activeSection]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-sm md:flex">
              <Activity size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Live</span>
              <span className="text-slate-400">•</span>
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span className="hidden sm:inline">{timeAgo(lastUpdated)}</span>
              <span className="sm:hidden">{isRefreshing ? "Refreshing" : "Live"}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-60 backdrop-blur-sm"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <select
              value={pollInterval}
              onChange={(event) => setPollInterval(Number(event.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#2563EB] backdrop-blur-sm"
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
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/40"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <ApiStatusBanner />
        {error && (
          <p className="mb-4 rounded-md bg-[#EF4444]/10 p-4 font-semibold text-[#EF4444]">{error}</p>
        )}
        {actionError && (
          <p className="mb-4 rounded-md bg-[#EF4444]/10 p-4 font-semibold text-[#EF4444]">{actionError}</p>
        )}

        {renderSectionContent()}
      </main>
    </div>
  );
}

type StatusFilter = "all" | ComplaintStatus;
type PriorityFilter = "all" | ComplaintPriority;
type SortKey = "priority" | "eta" | "recent" | "token";

const PRIORITY_ACCENT: Record<ComplaintPriority, { border: string; badge: string; glow: string }> = {
  Emergency: {
    border: "border-l-[#EF4444]",
    badge: "bg-[#EF4444] text-white",
    glow: "shadow-[#EF4444]/20",
  },
  High: {
    border: "border-l-[#F59E0B]",
    badge: "bg-[#F59E0B] text-white",
    glow: "shadow-[#F59E0B]/20",
  },
  Normal: {
    border: "border-l-[#22C55E]",
    badge: "bg-[#22C55E] text-white",
    glow: "shadow-[#22C55E]/20",
  },
};

type JobCardProps = {
  job: Complaint;
  completingId: string | null;
  completionNote: string;
  onStartComplete: () => void;
  onCancelComplete: () => void;
  onComplete: () => void;
  onNoteChange: (value: string) => void;
  onRequestAdmin?: () => void;
  hasPendingRequest?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

function JobCard({
  job,
  completingId,
  completionNote,
  onStartComplete,
  onCancelComplete,
  onComplete,
  onNoteChange,
  onRequestAdmin,
  hasPendingRequest,
  isExpanded,
  onToggle,
}: JobCardProps) {
  const accent = PRIORITY_ACCENT[job.priority];
  const isEmergency = job.priority === "Emergency";

  return (
    <article
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 ${
        isExpanded ? `shadow-lg ${accent.glow}` : "shadow-sm hover:shadow-md"
      } border-l-4 ${accent.border}`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${accent.badge}`}>
                {job.priority}
              </span>
              {isEmergency && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-2.5 py-1 text-xs font-semibold text-[#EF4444]">
                  <ShieldAlert size={12} />
                  Emergency
                </span>
              )}
              <span className="text-xs font-semibold text-slate-500">{job.type}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{job.token}</p>
            <h2 className="text-lg font-bold text-[#0F172A]">{job.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={14} />
              {job.area}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full bg-[#0F172A] px-3 py-1 text-xs font-semibold text-white">
              {job.status}
            </span>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? "Collapse" : "Expand"}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-md p-3 ${isEmergency ? "bg-[#EF4444]/10 border border-[#EF4444]/20" : "bg-white border border-slate-200"}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</p>
              <p className={`mt-1 text-lg font-bold ${isEmergency ? "text-[#EF4444]" : "text-[#0F172A]"}`}>{job.priority}</p>
            </div>
            <div className="rounded-md bg-white p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ETA</p>
              <p className="mt-1 text-lg font-bold text-[#0F172A]">{formatEta(job.technician?.etaMinutes)}</p>
            </div>
            <div className="rounded-md bg-white p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Citizen Contact</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#0F172A]">
                <Phone size={14} />
                {job.citizen?.phone ?? "Not available"}
              </p>
            </div>
          </div>

          {completingId === job.id ? (
            <div className="mt-4 rounded-md border border-[#22C55E]/20 bg-[#22C55E]/10 p-4">
              <p className="font-semibold text-[#0F172A]">Complete this job</p>
              <textarea
                value={completionNote}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Brief work summary (optional)"
                className="mt-3 w-full rounded-md border border-[#22C55E]/20 bg-white p-3 outline-none focus:border-[#22C55E]"
                rows={3}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onComplete}
                  className="rounded-md bg-[#22C55E] px-4 py-2 font-semibold text-white transition hover:bg-[#16a34a]"
                >
                  Confirm complete
                </button>
                <button
                  onClick={onCancelComplete}
                  className="rounded-md bg-white px-4 py-2 font-semibold text-[#0F172A] ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={onStartComplete}
                className="flex items-center gap-2 rounded-md bg-[#22C55E] px-4 py-2 font-semibold text-white transition hover:bg-[#16a34a]"
              >
                <CheckCircle2 size={16} />
                Complete work
              </button>
              {onRequestAdmin && !hasPendingRequest && (
                <button
                  onClick={onRequestAdmin}
                  className="flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  <MessageSquare size={16} />
                  Request admin
                </button>
              )}
              {hasPendingRequest && (
                <span className="rounded-md bg-[#F59E0B]/10 px-4 py-2 text-sm font-semibold text-[#F59E0B]">
                  Admin request pending
                </span>
              )}
              <Link
                to={`/complaints/${job.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-md bg-[#0F172A] px-4 py-2 font-semibold text-white transition hover:bg-[#1e293b]"
              >
                <ExternalLink size={16} />
                View details
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
