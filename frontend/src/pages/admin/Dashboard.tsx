import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  ShieldAlert,
  UserCog,
  Wrench,
  Activity,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ApiStatusBanner from "../../components/ApiStatusBanner";
import MapTracker from "../../components/map/MapTracker";
import type { MapLocation } from "../../components/map/MapTracker";
import { adminService } from "../../services/adminService";
import { complaintService } from "../../services/complaintService";
import { requestService } from "../../services/requestService";
import { technicianService } from "../../services/technicianService";
import { userManagementService } from "../../services/userManagementService";
import type {
  AdminAnalytics,
  AdminSection,
  Complaint,
  ComplaintStatus,
  Technician,
  TechnicianRequest,
  TechnicianStatus,
  User,
  UserRole,
} from "../../types/utility";
import { buildComplaintMapLocations } from "../../utils/mapLocations";
import {
  averageEtaMinutes,
  buildAreaIssues,
  formatSubmittedAt,
  priorityStyles,
  statusStyles,
  utilityStyles,
} from "../../utils/utilityDisplay";

const statusOptions: ComplaintStatus[] = ["Pending", "Processing", "Completed", "Cancelled"];
const technicianStatusOptions: TechnicianStatus[] = ["Active", "Busy", "Offline"];
const userRoleOptions: UserRole[] = ["Citizen", "Technician", "Admin"];
const adminSections: AdminSection[] = [
  "Dashboard",
  "Complaints",
  "Technicians",
  "Users",
  "Live Map",
  "Emergency Alerts",
  "Analytics",
];

interface ActivityItem {
  id: string;
  message: string;
  timestamp: number;
  type: "assign" | "status" | "request" | "delete" | "role" | "emergency";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<TechnicianRequest[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [requestFormComplaintId, setRequestFormComplaintId] = useState<string | null>(null);
  const [requestFormTechnicianId, setRequestFormTechnicianId] = useState("");
  const [requestFormMessage, setRequestFormMessage] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | "">("");
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pollInterval, setPollInterval] = useState<number>(8);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<number | null>(null);

  const areaIssues = useMemo(() => buildAreaIssues(complaints), [complaints]);
  const activeCount = complaints.filter((item) => item.status !== "Completed").length;
  const emergencyComplaints = complaints.filter((item) => item.priority === "Emergency");
  const completedCount = complaints.filter((item) => item.status === "Completed").length;
  const pendingRequests = requests.filter((request) => request.status === "Pending");

  const addActivity = useCallback((message: string, type: ActivityItem["type"]) => {
    setActivities((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now(), type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [complaintData, technicianData, analyticsData, requestData, userData] = await Promise.all([
        complaintService.list(),
        technicianService.list(),
        adminService.analytics(),
        requestService.list(),
        userManagementService.list(),
      ]);
      setComplaints(complaintData.complaints);
      setTechnicians(technicianData.technicians);
      setAnalytics(analyticsData);
      setRequests(requestData.requests);
      setUsers(userData.users);
      setLastUpdated(Date.now());
      setError("");
    } catch {
      setError("Could not load admin data from the backend. Please login as admin and start the API.");
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    buildComplaintMapLocations(complaints)
      .then(setMapLocations)
      .catch(() => {});
  }, [complaints]);

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

  const liveTechnicianLocations = technicians
    .filter(
      (technician) =>
        typeof technician.latitude === "number" && typeof technician.longitude === "number",
    )
    .map((technician) => ({
      id: technician.id,
      name: technician.name,
      lat: technician.latitude as number,
      lng: technician.longitude as number,
      status: technician.status,
    }));

  const handleAssign = async (complaintId: string, technicianId: string) => {
    if (!technicianId) return;
    setActionError("");
    setBusyAction(`assign-${complaintId}`);
    try {
      const { complaint } = await complaintService.assignTechnician(complaintId, technicianId);
      setComplaints((current) => current.map((item) => (item.id === complaintId ? complaint : item)));
      addActivity(`Assigned ${complaint.token} to a technician`, "assign");
    } catch {
      setActionError("Could not assign technician.");
    } finally {
      setBusyAction("");
    }
  };

  const handleStatusChange = async (complaintId: string, status: ComplaintStatus) => {
    setActionError("");
    setBusyAction(`status-${complaintId}`);
    try {
      const { complaint } = await complaintService.updateStatus(
        complaintId,
        status,
        `Status updated to ${status} by admin`,
      );
      setComplaints((current) => current.map((item) => (item.id === complaintId ? complaint : item)));
      addActivity(`Updated ${complaint.token} to ${status}`, "status");
    } catch {
      setActionError("Could not update complaint status.");
    } finally {
      setBusyAction("");
    }
  };

  const handleTechnicianStatus = async (technicianId: string, status: TechnicianStatus) => {
    setActionError("");
    setBusyAction(`tech-${technicianId}`);
    try {
      const { technician } = await technicianService.updateStatus(technicianId, status);
      setTechnicians((current) => current.map((item) => (item.id === technicianId ? technician : item)));
      addActivity(`Set ${technician.name} to ${status}`, "status");
    } catch {
      setActionError("Could not update technician availability.");
    } finally {
      setBusyAction("");
    }
  };

  const handleBulkTechnicianStatus = async (status: TechnicianStatus) => {
    setActionError("");
    setBusyAction(`bulk-tech-${status}`);
    try {
      const promises = technicians.map((tech) => technicianService.updateStatus(tech.id, status));
      await Promise.all(promises);
      const updated = await technicianService.list();
      setTechnicians(updated.technicians);
      addActivity(`Bulk updated all technicians to ${status}`, "status");
    } catch {
      setActionError("Could not bulk update technicians.");
    } finally {
      setBusyAction("");
    }
  };

  const handleRequestResponse = async (requestId: string, status: "Approved" | "Rejected") => {
    setActionError("");
    setBusyAction(`request-${requestId}`);
    try {
      await requestService.respond(requestId, status);
      await loadData();
      addActivity(`Responded to technician request: ${status}`, "request");
    } catch {
      setActionError("Could not update technician request.");
    } finally {
      setBusyAction("");
    }
  };

  const handleAdminRequestTechnician = async (complaintId: string) => {
    if (!requestFormTechnicianId || !requestFormMessage.trim()) {
      setActionError("Please select a technician and enter a message.");
      return;
    }

    setActionError("");
    setBusyAction(`admin-request-${complaintId}`);
    try {
      await requestService.create({
        complaintId,
        type: "Assignment",
        message: requestFormMessage.trim(),
        technicianId: requestFormTechnicianId,
      });
      setRequestFormComplaintId(null);
      setRequestFormTechnicianId("");
      setRequestFormMessage("");
      await loadData();
      addActivity(`Sent assignment request for complaint`, "request");
    } catch {
      setActionError("Could not send request to technician.");
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteTechnician = async (technicianId: string, technicianName: string) => {
    if (!window.confirm(`Are you sure you want to delete technician "${technicianName}"?`)) {
      return;
    }

    setActionError("");
    setBusyAction(`delete-${technicianId}`);
    try {
      await technicianService.remove(technicianId);
      await loadData();
      addActivity(`Deleted technician ${technicianName}`, "delete");
    } catch (err) {
      const message = err instanceof Error && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Could not delete technician."
        : "Could not delete technician.";
      setActionError(message);
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setActionError("");
    setBusyAction(`delete-user-${userId}`);
    try {
      await userManagementService.remove(userId);
      setUsers((current) => current.filter((item) => item.id !== userId));
      addActivity(`Deleted user ${userName}`, "delete");
    } catch (err) {
      const message = err instanceof Error && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Could not delete user."
        : "Could not delete user.";
      setActionError(message);
    } finally {
      setBusyAction("");
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setActionError("");
    setBusyAction(`role-${userId}`);
    try {
      const { user } = await userManagementService.updateRole(userId, { role: newRole });
      setUsers((current) => current.map((item) => (item.id === userId ? user : item)));
      addActivity(`Changed ${user.name} role to ${newRole}`, "role");
    } catch {
      setActionError("Could not update user role.");
    } finally {
      setBusyAction("");
    }
  };

  const handleEmergencyEscalate = async (complaintId: string) => {
    setActionError("");
    setBusyAction(`emergency-${complaintId}`);
    try {
      const { complaint } = await complaintService.updateStatus(
        complaintId,
        "Processing",
        "Emergency escalated by admin - immediate attention required",
      );
      setComplaints((current) => current.map((item) => (item.id === complaintId ? complaint : item)));
      addActivity(`Emergency escalated: ${complaint.token}`, "emergency");
    } catch {
      setActionError("Could not escalate emergency.");
    } finally {
      setBusyAction("");
    }
  };

  const handleQuickAssignEmergency = async (complaintId: string, technicianId: string) => {
    if (!technicianId) return;
    setActionError("");
    setBusyAction(`quick-assign-${complaintId}`);
    try {
      const { complaint } = await complaintService.assignTechnician(complaintId, technicianId);
      setComplaints((current) => current.map((item) => (item.id === complaintId ? complaint : item)));
      addActivity(`Quick assigned ${complaint.token} to technician`, "assign");
    } catch {
      setActionError("Could not quick assign technician.");
    } finally {
      setBusyAction("");
    }
  };

  const averageResponseMinutes = averageEtaMinutes(complaints);
  const completionRate = analytics?.totals.totalComplaints
    ? Math.round((analytics.totals.completedComplaints / analytics.totals.totalComplaints) * 100)
    : complaints.length
      ? Math.round((completedCount / complaints.length) * 100)
      : 0;
  const utilizationRate = analytics?.totals.activeTechnicians
    ? Math.round(
        ((analytics.totals.processingComplaints + analytics.totals.pendingComplaints) /
          analytics.totals.activeTechnicians) *
          100,
      )
    : technicians.filter((item) => item.status === "Active").length
      ? Math.round((activeCount / technicians.filter((item) => item.status === "Active").length) * 100)
      : 0;

  const stats: Array<{
    label: string;
    value: number;
    Icon: LucideIcon;
    gradient: string;
    iconBg: string;
    pulse?: boolean;
    trend?: string;
  }> = [
    {
      label: "Active Complaints",
      value: analytics ? analytics.totals.pendingComplaints + analytics.totals.processingComplaints : activeCount,
      Icon: ClipboardList,
      gradient: "from-sky-500 to-blue-600",
      iconBg: "bg-sky-100 text-sky-700",
      trend: "+12%",
    },
    {
      label: "Emergency Alerts",
      value: analytics?.totals.emergencyComplaints ?? emergencyComplaints.length,
      Icon: AlertTriangle,
      gradient: "from-red-500 to-rose-600",
      iconBg: "bg-red-100 text-red-700",
      pulse: true,
      trend: "!",
    },
    {
      label: "Technicians Online",
      value: analytics?.totals.activeTechnicians ?? technicians.filter((item) => item.status === "Active").length,
      Icon: Wrench,
      gradient: "from-emerald-500 to-green-600",
      iconBg: "bg-emerald-100 text-emerald-700",
      trend: "+5%",
    },
    {
      label: "Completed",
      value: analytics?.totals.completedComplaints ?? completedCount,
      Icon: CheckCircle2,
      gradient: "from-indigo-500 to-purple-600",
      iconBg: "bg-indigo-100 text-indigo-700",
      trend: "+18%",
    },
  ];

  const performanceMetrics = [
    {
      label: "Average response time",
      value: averageResponseMinutes ? `${averageResponseMinutes} min` : "N/A",
      percent: averageResponseMinutes ? Math.min(averageResponseMinutes * 4, 100) : 0,
    },
    {
      label: "Complaint completion",
      value: `${completionRate}%`,
      percent: completionRate,
    },
    {
      label: "Technician utilization",
      value: `${Math.min(utilizationRate, 100)}%`,
      percent: Math.min(utilizationRate, 100),
    },
  ];

  const priorityBreakdown = useMemo(() => {
    const counts = complaints.reduce<Record<string, number>>((acc, c) => {
      acc[c.priority] = (acc[c.priority] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: "Normal", value: counts.Normal || 0, color: "#64748b" },
      { name: "High", value: counts.High || 0, color: "#f59e0b" },
      { name: "Emergency", value: counts.Emergency || 0, color: "#ef4444" },
    ];
  }, [complaints]);

  const statusBreakdown = useMemo(() => {
    const counts = complaints.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: "Pending", value: counts.Pending || 0, color: "#94a3b8" },
      { name: "Processing", value: counts.Processing || 0, color: "#3b82f6" },
      { name: "Completed", value: counts.Completed || 0, color: "#10b981" },
      { name: "Cancelled", value: counts.Cancelled || 0, color: "#f43f5e" },
    ];
  }, [complaints]);

  const typeChartData = useMemo(() => {
    return (analytics?.complaintsByType ?? []).map((item) => ({
      name: item.type,
      count: item._count,
      fill: item.type === "Water" ? "#0ea5e9" : item.type === "Gas" ? "#f59e0b" : "#10b981",
    }));
  }, [analytics]);

  const areaChartData = useMemo(() => {
    return (analytics?.complaintsByArea ?? []).slice(0, 10).map((item) => ({
      name: item.area,
      count: item._count,
    }));
  }, [analytics]);

  const technicianPerformance = useMemo(() => {
    return technicians
      .map((tech) => {
        const activeJobs = complaints.filter(
          (c) => c.technician?.id === tech.id && c.status !== "Completed",
        ).length;
        const completedJobs = complaints.filter(
          (c) => c.technician?.id === tech.id && c.status === "Completed",
        ).length;
        const totalJobs = activeJobs + completedJobs;
        return {
          id: tech.id,
          name: tech.name,
          skill: tech.skill,
          status: tech.status,
          rating: tech.rating,
          activeJobs,
          completedJobs,
          totalJobs,
          efficiency: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 8);
  }, [technicians, complaints]);

  const sectionTitles: Record<AdminSection, string> = {
    Dashboard: "Admin Dashboard",
    Complaints: "Complaint Management",
    Technicians: "Technician Management",
    Users: "User Management",
    "Live Map": "Live Service Map",
    "Emergency Alerts": "Emergency Alerts",
    Analytics: "Service Analytics",
  };

  const sectionDescriptions: Record<AdminSection, string> = {
    Dashboard: "Overview of complaints, technician requests, and live performance.",
    Complaints: "Assign technicians, update status, and manage the full complaint queue.",
    Technicians: "Monitor technician availability, ratings, and workload.",
    Users: "Manage user roles, view accounts, and remove inactive users.",
    "Live Map": "Visual map of active service issues across areas.",
    "Emergency Alerts": "Critical emergency complaints requiring immediate action.",
    Analytics: "Detailed analytics on complaints, areas, and service performance.",
  };

  const selectSection = (section: AdminSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const renderComplaintTable = (rows: Complaint[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-3">Token</th>
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Area</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Technician</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((complaint) => {
            const style = utilityStyles[complaint.type];
            const Icon = style.Icon;
            const matchingTechnicians = technicians.filter((tech) => tech.skill === complaint.type);
            const isBusy =
              busyAction.startsWith(`assign-${complaint.id}`) || busyAction.startsWith(`status-${complaint.id}`);

            return (
              <tr key={complaint.id} className="border-b border-slate-100">
                <td className="px-4 py-4 font-bold">{complaint.token}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{complaint.title}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
                  >
                    <Icon size={14} />
                    {complaint.type}
                  </span>
                </td>
                <td className="px-4 py-4">{complaint.area}</td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-3 py-1 font-semibold ${priorityStyles[complaint.priority]}`}>
                    {complaint.priority}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-3 py-1 font-semibold ${statusStyles[complaint.status]}`}>
                    {complaint.status}
                  </span>
                  {complaint.review && (
                    <p className="mt-1 text-xs text-amber-700">Reviewed · {complaint.review.rating}/5</p>
                  )}
                </td>
                <td className="px-4 py-4">{complaint.technician?.name ?? "Unassigned"}</td>
                <td className="px-4 py-4">
                  <div className="flex min-w-[220px] flex-col gap-2">
                    <select
                      value={complaint.technician?.id ?? ""}
                      disabled={isBusy}
                      onChange={(event) => handleAssign(complaint.id, event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-sky-400"
                    >
                      <option value="">Assign technician</option>
                      {matchingTechnicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.status})
                        </option>
                      ))}
                    </select>
                    <select
                      value={complaint.status}
                      disabled={isBusy}
                      onChange={(event) => handleStatusChange(complaint.id, event.target.value as ComplaintStatus)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-sky-400"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {requestFormComplaintId === complaint.id ? (
                      <div className="rounded-md border border-sky-200 bg-sky-50 p-2">
                        <select
                          value={requestFormTechnicianId}
                          onChange={(event) => setRequestFormTechnicianId(event.target.value)}
                          className="mb-2 w-full rounded-md border border-sky-200 px-2 py-1 text-sm outline-none focus:border-sky-400"
                        >
                          <option value="">Select technician</option>
                          {matchingTechnicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={requestFormMessage}
                          onChange={(event) => setRequestFormMessage(event.target.value)}
                          placeholder="Explain why you need this technician to accept the job..."
                          className="mb-2 w-full rounded-md border border-sky-200 p-2 text-sm outline-none focus:border-sky-400"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={busyAction.startsWith(`admin-request-${complaint.id}`)}
                            onClick={() => handleAdminRequestTechnician(complaint.id)}
                            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                          >
                            Send request
                          </button>
                          <button
                            onClick={() => {
                              setRequestFormComplaintId(null);
                              setRequestFormTechnicianId("");
                              setRequestFormMessage("");
                            }}
                            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => setRequestFormComplaintId(complaint.id)}
                        className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50"
                      >
                        Request technician
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-slate-600">No complaints found.</p>}
    </div>
  );

  const renderRequestsPanel = () => (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Technician Requests</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
          {pendingRequests.length} pending
        </span>
      </div>
      <div className="space-y-3">
        {requests.map((request) => (
          <article key={request.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div>
                <p className="font-semibold">
                  {request.technician?.name} · {request.type}
                </p>
                <p className="text-sm text-slate-500">
                  {request.complaint?.token} · {request.complaint?.title} · {formatSubmittedAt(request.createdAt)}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                  request.status === "Approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : request.status === "Rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {request.status}
              </span>
            </div>
            <p className="mt-3 text-slate-700">{request.message}</p>
            {request.status === "Pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busyAction === `request-${request.id}`}
                  onClick={() => handleRequestResponse(request.id, "Approved")}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busyAction === `request-${request.id}`}
                  onClick={() => handleRequestResponse(request.id, "Rejected")}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
        {!requests.length && <p className="text-sm text-slate-600">No technician requests yet.</p>}
      </div>
    </div>
  );

  const getTechnicianJobCounts = (technicianId: string) => {
    const active = complaints.filter(
      (c) => c.technician?.id === technicianId && c.status !== "Completed",
    ).length;
    const completed = complaints.filter(
      (c) => c.technician?.id === technicianId && c.status === "Completed",
    ).length;
    return { active, completed };
  };

  const renderTechnicianPanel = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Technician Control</h2>
            <p className="mt-1 text-sm text-slate-600">
              {technicians.length} technicians · {technicians.filter((t) => t.status === "Active").length} online
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkTechnicianStatus("Active")}
              disabled={busyAction.startsWith("bulk-tech-")}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Set All Active
            </button>
            <button
              onClick={() => handleBulkTechnicianStatus("Offline")}
              disabled={busyAction.startsWith("bulk-tech-")}
              className="rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              Set All Offline
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {technicians.map((technician) => {
            const jobs = getTechnicianJobCounts(technician.id);
            const isBusy = busyAction.startsWith(`tech-${technician.id}`);
            const matchingComplaints = complaints.filter(
              (c) => c.technician?.id === technician.id && c.status !== "Completed",
            );

            return (
              <div
                key={technician.id}
                className={`rounded-lg border-2 bg-white p-5 shadow-sm transition-all ${
                  technician.status === "Active"
                    ? "border-emerald-200"
                    : technician.status === "Busy"
                      ? "border-amber-200"
                      : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        technician.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : technician.status === "Busy"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Wrench size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{technician.name}</p>
                      <p className="text-sm text-slate-500">
                        {technician.skill} · Rating {technician.rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      technician.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : technician.status === "Busy"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        technician.status === "Active"
                          ? "bg-emerald-500 animate-pulse"
                          : technician.status === "Busy"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                      }`}
                    />
                    {technician.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-sky-50 p-2 text-center">
                    <p className="text-lg font-bold text-sky-700">{jobs.active}</p>
                    <p className="text-xs text-slate-600">Active</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-2 text-center">
                    <p className="text-lg font-bold text-emerald-700">{jobs.completed}</p>
                    <p className="text-xs text-slate-600">Completed</p>
                  </div>
                  <div className="rounded-md bg-amber-50 p-2 text-center">
                    <p className="text-lg font-bold text-amber-700">{technician.rating.toFixed(1)}</p>
                    <p className="text-xs text-slate-600">Rating</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Actions</p>
                  <select
                    value={technician.status}
                    disabled={isBusy}
                    onChange={(event) => handleTechnicianStatus(technician.id, event.target.value as TechnicianStatus)}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-sky-400"
                  >
                    {technicianStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        Set {status}
                      </option>
                    ))}
                  </select>
                </div>

                {matchingComplaints.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Current Assignments ({matchingComplaints.length})
                    </p>
                    <div className="space-y-2">
                      {matchingComplaints.slice(0, 3).map((job) => (
                        <div key={job.id} className="rounded-md border border-slate-200 p-2">
                          <p className="text-sm font-semibold">{job.token}</p>
                          <p className="text-xs text-slate-500">
                            {job.title} · {job.status}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className={`text-xs font-semibold ${priorityStyles[job.priority]}`}>
                              {job.priority}
                            </span>
                            <span className="text-xs text-slate-500">{job.area}</span>
                          </div>
                        </div>
                      ))}
                      {matchingComplaints.length > 3 && (
                        <p className="text-xs text-slate-500">
                          +{matchingComplaints.length - 3} more assignments
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    disabled={isBusy}
                    onClick={() => handleDeleteTechnician(technician.id, technician.name)}
                    className="flex-1 rounded-md bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {!technicians.length && !isLoading && (
            <p className="text-sm text-slate-600 md:col-span-2 xl:col-span-3">
              No technicians registered yet.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderUsersPanel = () => {
    const filteredUsers = users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
      const matchesRole = !userRoleFilter || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });

    const getUserComplaintCount = (userId: string) =>
      complaints.filter((c) => c.citizen?.id === userId).length;

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">All Users</h2>
            <p className="mt-1 text-sm text-slate-600">
              {users.length} total users · {filteredUsers.length} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={userSearchTerm}
              onChange={(event) => setUserSearchTerm(event.target.value)}
              placeholder="Search by name or email..."
              className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value as UserRole | "")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
            >
              <option value="">All roles</option>
              {userRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Complaints</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isBusy = busyAction === `delete-user-${user.id}` || busyAction === `role-${user.id}`;
                const complaintCount = getUserComplaintCount(user.id);

                return (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{user.email}</p>
                      <p className="text-xs text-slate-500">{user.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.role}
                        disabled={isBusy}
                        onChange={(event) =>
                          handleUpdateUserRole(user.id, event.target.value as UserRole)
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold outline-none focus:border-sky-400"
                      >
                        {userRoleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold">{complaintCount}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        disabled={isBusy}
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                    {users.length ? "No users match your search." : "No users registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLiveMap = () => (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MapPinned className="text-sky-700" size={22} />
        <h2 className="text-xl font-bold">Live Service Map</h2>
      </div>
      <MapTracker
        height="420px"
        locations={mapLocations}
        technicianLocations={liveTechnicianLocations}
        initialLocation={{ lat: 23.8103, lng: 90.4125 }}
      />
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Emergency</span>
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">High</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Normal</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Technician live</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {areaIssues.map((issue) => (
          <div key={issue.area} className="rounded-md border border-slate-200 p-3">
            <p className="font-semibold">{issue.area}</p>
            <p className="text-sm text-slate-500">
              {issue.type} · {issue.affected} active · {issue.severity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    const completionPercent = analytics?.totals.totalComplaints
      ? Math.round((analytics.totals.completedComplaints / analytics.totals.totalComplaints) * 100)
      : 0;
    const pendingPercent = analytics?.totals.totalComplaints
      ? Math.round((analytics.totals.pendingComplaints / analytics.totals.totalComplaints) * 100)
      : 0;
    const processingPercent = analytics?.totals.totalComplaints
      ? Math.round((analytics.totals.processingComplaints / analytics.totals.totalComplaints) * 100)
      : 0;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Complaints", value: analytics?.totals.totalComplaints ?? 0, Icon: ClipboardList, color: "text-sky-700", bg: "bg-sky-50" },
            { label: "Completion Rate", value: `${completionPercent}%`, Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Pending Queue", value: `${pendingPercent}%`, Icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Processing", value: `${processingPercent}%`, Icon: BarChart3, color: "text-blue-700", bg: "bg-blue-50" },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className={`rounded-lg ${bg} p-5 shadow-sm transition-all hover:shadow-md`}>
              <Icon className={color} size={24} />
              <p className="mt-4 text-3xl font-bold text-slate-950">{value}</p>
              <p className="mt-1 text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Complaints by Area</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    cursor={{ fill: "rgba(14, 165, 233, 0.05)" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {areaChartData.map((entry) => (
                      <Cell key={entry.name} fill="#0ea5e9" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Complaints by Type</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {typeChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Status Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Priority Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityBreakdown}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {priorityBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Technician Performance</h2>
            <span className="text-sm text-slate-500">{technicians.length} technicians</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {technicianPerformance.map((tech) => (
                  <tr key={tech.id} className="border-b border-slate-100">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{tech.name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${utilityStyles[tech.skill as keyof typeof utilityStyles]?.bg} ${utilityStyles[tech.skill as keyof typeof utilityStyles]?.text}`}>
                        {tech.skill}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        tech.status === "Active" ? "bg-emerald-100 text-emerald-700" : tech.status === "Busy" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {tech.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold">{tech.rating.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-sky-700">{tech.activeJobs}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-emerald-700">{tech.completedJobs}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold">{tech.totalJobs}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div
                            className={`h-2 rounded-full ${tech.efficiency >= 70 ? "bg-emerald-500" : tech.efficiency >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${tech.efficiency}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{tech.efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!technicianPerformance.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                      No technicians registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Service Performance</h2>
            <div className="space-y-4">
              {performanceMetrics.map(({ label, value, percent }) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Top Areas by Complaint Volume</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(analytics?.complaintsByArea ?? []).slice(0, 9).map((item, index) => (
                <div key={item.area} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.area}</p>
                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                  </div>
                  <p className="text-2xl font-bold text-sky-700">{item._count}</p>
                  <p className="text-sm text-slate-500">complaints</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmergencyAlerts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-red-700" size={24} />
          <h2 className="text-xl font-bold text-red-950">Emergency Alerts</h2>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
          {emergencyComplaints.length} active
        </span>
      </div>
      {emergencyComplaints.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <p className="mt-2 text-lg font-semibold text-slate-700">No emergency alerts right now</p>
          <p className="text-sm text-slate-500">All systems operational</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {emergencyComplaints.map((complaint) => {
            const style = utilityStyles[complaint.type];
            const Icon = style.Icon;
            const matchingTechnicians = technicians.filter((tech) => tech.skill === complaint.type);

            return (
              <div
                key={complaint.id}
                className="rounded-lg border-2 border-red-200 bg-red-50 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${style.bg} ${style.text}`}>
                        <Icon size={14} />
                        {complaint.type}
                      </span>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                        {complaint.priority}
                      </span>
                      <span className="text-sm font-semibold text-slate-600">{complaint.token}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-950">{complaint.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{complaint.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPinned size={14} />
                        {complaint.area}
                      </span>
                      <span>Status: {complaint.status}</span>
                      {complaint.technician && (
                        <span>Assigned: {complaint.technician.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <select
                      value={complaint.technician?.id ?? ""}
                      disabled={busyAction.startsWith(`quick-assign-${complaint.id}`)}
                      onChange={(event) => handleQuickAssignEmergency(complaint.id, event.target.value)}
                      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
                    >
                      <option value="">Quick assign...</option>
                      {matchingTechnicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.status})
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busyAction.startsWith(`emergency-${complaint.id}`)}
                      onClick={() => handleEmergencyEscalate(complaint.id)}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Escalate Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, Icon, gradient, iconBg, pulse, trend }) => (
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
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
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
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Recent Complaints</h2>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                    {complaints.length} total
                  </span>
                </div>
                {renderComplaintTable(complaints.slice(0, 8))}
              </div>
              <div className="space-y-6">
                {renderRequestsPanel()}
                {activities.length > 0 && (
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-bold">Live Activity Feed</h3>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {activities.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-2 text-sm">
                          <span
                            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                              activity.type === "emergency"
                                ? "bg-red-500"
                                : activity.type === "assign"
                                  ? "bg-sky-500"
                                  : activity.type === "status"
                                    ? "bg-emerald-500"
                                    : activity.type === "delete"
                                      ? "bg-red-500"
                                      : activity.type === "role"
                                        ? "bg-amber-500"
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
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "Complaints":
        return (
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Complaint Queue</h2>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                {complaints.length} total
              </span>
            </div>
            {renderComplaintTable(complaints)}
          </div>
        );
      case "Technicians":
        return renderTechnicianPanel();
      case "Users":
        return (
          <div className="rounded-lg bg-white p-5 shadow-sm">
            {renderUsersPanel()}
          </div>
        );
      case "Live Map":
        return renderLiveMap();
      case "Emergency Alerts":
        return (
          <div className="rounded-lg bg-red-50 p-5 shadow-sm">
            {renderEmergencyAlerts()}
          </div>
        );
      case "Analytics":
        return renderAnalytics();
      default:
        return null;
    }
  };

  const sidebar = (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30">
          <UserCog size={22} className="text-white" />
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <div>
          <p className="font-bold text-white">Authority Panel</p>
          <p className="text-xs text-slate-400">Digital Queue System</p>
        </div>
      </div>
      <nav className="mt-8 space-y-1.5 text-sm">
        {adminSections.map((item) => (
          <button
            key={item}
            onClick={() => selectSection(item)}
            className={`relative w-full rounded-lg px-3 py-2.5 text-left font-semibold transition-all duration-200 ${
              activeSection === item
                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {activeSection === item && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 opacity-100" />
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 p-5 text-white lg:block">{sidebar}</aside>

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
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-sky-400 backdrop-blur-sm"
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

        <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
          {adminSections.map((item) => (
            <button
              key={item}
              onClick={() => selectSection(item)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                activeSection === item ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <ApiStatusBanner />
        {isLoading && <p className="mb-4 rounded-md bg-white p-4 text-slate-600 shadow-sm">Loading live database data...</p>}
        {error && <p className="mb-4 rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{error}</p>}
        {actionError && <p className="mb-4 rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{actionError}</p>}

        {!isLoading && renderSectionContent()}
      </main>
    </div>
  );
}
