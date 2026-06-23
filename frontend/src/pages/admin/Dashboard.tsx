import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LogOut,
  MapPinned,
  Menu,
  Timer,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import ApiStatusBanner from "../../components/ApiStatusBanner";
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
} from "../../types/utility";
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
const adminSections: AdminSection[] = [
  "Dashboard",
  "Complaints",
  "Technicians",
  "Users",
  "Live Map",
  "Emergency Alerts",
  "Analytics",
];

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

  const areaIssues = useMemo(() => buildAreaIssues(complaints), [complaints]);
  const activeCount = complaints.filter((item) => item.status !== "Completed").length;
  const emergencyComplaints = complaints.filter((item) => item.priority === "Emergency");
  const completedCount = complaints.filter((item) => item.status === "Completed").length;
  const pendingRequests = requests.filter((request) => request.status === "Pending");

  const loadData = () =>
    Promise.all([
      complaintService.list(),
      technicianService.list(),
      adminService.analytics(),
      requestService.list(),
      userManagementService.list(),
    ])
      .then(([complaintData, technicianData, analyticsData, requestData, userData]) => {
        setComplaints(complaintData.complaints);
        setTechnicians(technicianData.technicians);
        setAnalytics(analyticsData);
        setRequests(requestData.requests);
        setUsers(userData.users);
      })
      .catch(() => setError("Could not load admin data from the backend. Please login as admin and start the API."));

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, []);

  const handleAssign = async (complaintId: string, technicianId: string) => {
    if (!technicianId) return;
    setActionError("");
    setBusyAction(`assign-${complaintId}`);
    try {
      const { complaint } = await complaintService.assignTechnician(complaintId, technicianId);
      setComplaints((current) => current.map((item) => (item.id === complaintId ? complaint : item)));
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
    } catch {
      setActionError("Could not update technician availability.");
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
    } catch (err) {
      const message = err instanceof Error && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Could not delete user."
        : "Could not delete user.";
      setActionError(message);
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

  const stats: Array<{ label: string; value: number; Icon: LucideIcon; color: string }> = [
    {
      label: "Active Complaints",
      value: analytics ? analytics.totals.pendingComplaints + analytics.totals.processingComplaints : activeCount,
      Icon: ClipboardList,
      color: "text-sky-700",
    },
    {
      label: "Emergency Alerts",
      value: analytics?.totals.emergencyComplaints ?? emergencyComplaints.length,
      Icon: AlertTriangle,
      color: "text-red-700",
    },
    {
      label: "Technicians Online",
      value: analytics?.totals.activeTechnicians ?? technicians.filter((item) => item.status === "Active").length,
      Icon: Wrench,
      color: "text-emerald-700",
    },
    {
      label: "Completed",
      value: analytics?.totals.completedComplaints ?? completedCount,
      Icon: CheckCircle2,
      color: "text-indigo-700",
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

  const renderTechnicianPanel = () => (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Wrench className="text-emerald-700" size={22} />
        <h2 className="text-xl font-bold">Technician Control</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {technicians.map((technician) => (
          <div key={technician.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{technician.name}</p>
                <p className="text-sm text-slate-500">
                  {technician.skill} · Rating {technician.rating.toFixed(1)}
                </p>
                <p className="text-sm text-slate-500">{technician.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {technician.status}
              </span>
            </div>
            <select
              value={technician.status}
              disabled={busyAction === `tech-${technician.id}`}
              onChange={(event) => handleTechnicianStatus(technician.id, event.target.value as TechnicianStatus)}
              className="mt-3 w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-sky-400"
            >
              {technicianStatusOptions.map((status) => (
                <option key={status} value={status}>
                  Set {status}
                </option>
              ))}
            </select>
            <button
              disabled={busyAction === `delete-${technician.id}`}
              onClick={() => handleDeleteTechnician(technician.id, technician.name)}
              className="mt-2 w-full rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete technician
            </button>
          </div>
        ))}
        {!technicians.length && !isLoading && <p className="text-sm text-slate-600">No technicians registered yet.</p>}
      </div>
    </div>
  );

  const renderUsersPanel = () => {
    const citizenUsers = users.filter((user) => user.role === "Citizen");
    const filteredUsers = citizenUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()),
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Citizens</h2>
            <p className="mt-1 text-sm text-slate-600">{citizenUsers.length} citizen user{citizenUsers.length === 1 ? "" : "s"} total</p>
          </div>
          <input
            type="text"
            value={userSearchTerm}
            onChange={(event) => setUserSearchTerm(event.target.value)}
            placeholder="Search citizens..."
            className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isBusy = busyAction === `delete-user-${user.id}`;

                return (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-4">{user.email}</td>
                    <td className="px-4 py-4">{user.phone ?? "—"}</td>
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
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                    {citizenUsers.length ? "No citizens match your search." : "No citizen users registered yet."}
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
      <div className="relative h-[420px] overflow-hidden rounded-md bg-slate-200">
        <div className="absolute inset-4 rounded-lg border-2 border-white" />
        {areaIssues.map((issue) => (
          <div
            key={issue.area}
            className="absolute"
            style={{ top: issue.top, left: issue.left }}
          >
            <span
              className={`block h-4 w-4 rounded-full ring-4 ${
                issue.severity === "Emergency"
                  ? "bg-red-600 ring-red-200"
                  : issue.severity === "High"
                    ? "bg-orange-500 ring-orange-200"
                    : "bg-sky-600 ring-sky-200"
              }`}
            />
            <p className="mt-2 min-w-[120px] rounded-md bg-white/90 px-2 py-1 text-xs font-semibold shadow-sm">
              {issue.area}
            </p>
          </div>
        ))}
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

  const renderAnalytics = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="text-emerald-700" size={22} />
          <h2 className="text-xl font-bold">Service Performance</h2>
        </div>
        <div className="space-y-4">
          {performanceMetrics.map(({ label, value, percent }) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Complaints by Utility Type</h2>
        <div className="mt-4 space-y-3">
          {(analytics?.complaintsByType ?? []).map((item) => (
            <div key={item.type} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
              <span className="font-semibold">{item.type}</span>
              <span className="font-bold">{item._count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm xl:col-span-2">
        <h2 className="text-xl font-bold">Top Areas by Complaint Volume</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(analytics?.complaintsByArea ?? []).slice(0, 9).map((item) => (
            <div key={item.area} className="rounded-md border border-slate-200 p-3">
              <p className="font-semibold">{item.area}</p>
              <p className="text-2xl font-bold text-sky-700">{item._count}</p>
              <p className="text-sm text-slate-500">complaints</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, Icon, color }) => (
                <div key={label} className="rounded-lg bg-white p-5 shadow-sm">
                  <Icon className={color} size={24} />
                  <p className="mt-4 text-3xl font-bold">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </section>
            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">Recent Complaints</h2>
                {renderComplaintTable(complaints.slice(0, 8))}
              </div>
              {renderRequestsPanel()}
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
            <div className="flex items-center gap-2">
              <Timer className="text-red-700" size={22} />
              <h2 className="text-xl font-bold text-red-950">Emergency Alerts</h2>
            </div>
            <div className="mt-4 space-y-3">
              {emergencyComplaints.map((complaint) => (
                <div key={complaint.id} className="rounded-md bg-white p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">
                        {complaint.token} · {complaint.title}
                      </p>
                      <p className="text-sm text-slate-600">
                        {complaint.area} · {complaint.type} · {complaint.status}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[complaint.status]}`}>
                      {complaint.status}
                    </span>
                  </div>
                </div>
              ))}
              {!emergencyComplaints.length && (
                <p className="rounded-md bg-white p-4 text-slate-600">No emergency alerts right now.</p>
              )}
            </div>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-500">
          <UserCog size={22} />
        </div>
        <div>
          <p className="font-bold">Authority Panel</p>
          <p className="text-xs text-slate-400">Digital Queue System</p>
        </div>
      </div>
      <nav className="mt-8 space-y-2 text-sm">
        {adminSections.map((item) => (
          <button
            key={item}
            onClick={() => selectSection(item)}
            className={`w-full rounded-md px-3 py-2 text-left font-semibold transition ${
              activeSection === item ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            {item}
            {item === "Dashboard" && pendingRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-slate-950">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );

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
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md bg-slate-100 p-2 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{sectionTitles[activeSection]}</h1>
              <p className="mt-1 text-slate-600">{sectionDescriptions[activeSection]}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                localStorage.clear();
                navigate("/");
              }
            }}
            className="flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            <LogOut size={18} />
            Logout
          </button>
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
