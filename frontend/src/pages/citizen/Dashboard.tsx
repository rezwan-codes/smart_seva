import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  LogOut,
  MapPinned,
  Phone,
  Ticket,
  Wrench,
} from "lucide-react";
import ApiStatusBanner from "../../components/ApiStatusBanner";
import { authService } from "../../services/authService";
import { complaintService } from "../../services/complaintService";
import type { Complaint, User } from "../../types/utility";
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

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const activeComplaint = complaints.find((item) => item.status !== "Completed");
  const completedCount = complaints.filter((item) => item.status === "Completed").length;
  const areaIssues = useMemo(() => buildAreaIssues(complaints), [complaints]);

  useEffect(() => {
    Promise.all([complaintService.list(), authService.me()])
      .then(([complaintData, userData]) => {
        setComplaints(complaintData.complaints);
        setUser(userData.user);
      })
      .catch(() => setError("Could not load live database data. Please login and start the backend."))
      .finally(() => setIsLoading(false));
  }, []);

  const averageWaiting = averageEtaMinutes(complaints);

  const stats = useMemo(
    () => [
      {
        label: "Active complaints",
        value: complaints.length - completedCount,
        Icon: Ticket,
        color: "text-sky-700",
      },
      {
        label: "Average waiting",
        value: averageWaiting ? `${averageWaiting} min` : "N/A",
        Icon: Clock,
        color: "text-amber-700",
      },
      {
        label: "Completed",
        value: completedCount,
        Icon: CheckCircle2,
        color: "text-emerald-700",
      },
    ],
    [averageWaiting, completedCount, complaints.length],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 px-5 py-4 text-white shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">Digital Queue System</p>
            <p className="text-sm text-slate-300">Citizen service dashboard</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                localStorage.clear();
                navigate("/");
              }
            }}
            className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-lg bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user?.name ?? "Citizen"}</h1>
              <p className="mt-1 text-slate-600">
                Track your complaint token, queue position, status, and assigned technician.
              </p>
            </div>
            <button
              onClick={() => navigate("/new-complaint")}
              className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700"
            >
              <ClipboardPlus size={18} />
              New Complaint
            </button>
          </div>

          <ApiStatusBanner />
          {isLoading && <p className="rounded-md bg-white p-4 text-slate-600 shadow-sm">Loading live data...</p>}
          {error && <p className="rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, Icon, color }) => (
              <div key={label} className="rounded-lg bg-white p-5 shadow-sm">
                <Icon className={color} size={24} />
                <p className="mt-4 text-3xl font-bold">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {activeComplaint && (
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                    Current complaint
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{activeComplaint.title}</h2>
                  <p className="mt-1 text-slate-600">
                    {activeComplaint.area} - Submitted {formatSubmittedAt(activeComplaint.createdAt)}
                  </p>
                </div>
                <div className="rounded-md bg-slate-950 px-5 py-3 text-white">
                  <p className="text-xs text-slate-300">Digital Token</p>
                  <p className="text-2xl font-bold">{activeComplaint.token}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-md bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Queue Position</p>
                  <p className="mt-2 text-3xl font-bold">#{activeComplaint.position}</p>
                </div>
                <div className="rounded-md bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[activeComplaint.status]}`}>
                    {activeComplaint.status}
                  </span>
                </div>
                <div className="rounded-md bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Priority</p>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${priorityStyles[activeComplaint.priority]}`}>
                    {activeComplaint.priority}
                  </span>
                </div>
                <div className="rounded-md bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Technician ETA</p>
                  <p className="mt-2 text-2xl font-bold">{formatEta(activeComplaint.technician?.etaMinutes)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">My Complaints</h2>
              <button
                onClick={() => navigate("/complaints")}
                className="text-sm font-semibold text-sky-700 hover:text-sky-900"
              >
                View all
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
                    className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-md border p-2 ${style.bg} ${style.text} ${style.border}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">{complaint.title}</p>
                        <p className="text-sm text-slate-500">
                          {complaint.token} - {complaint.type} - {complaint.area}
                        </p>
                      </div>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[complaint.status]}`}>
                      {complaint.status}
                    </span>
                  </button>
                );
              })}
              {!isLoading && !complaints.length && (
                <p className="rounded-md bg-slate-50 p-4 text-slate-600">
                  No complaints found in your database account yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          {activeComplaint && (
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wrench className="text-emerald-700" size={22} />
                <h2 className="text-xl font-bold">Assigned Technician</h2>
              </div>
              <div className="rounded-md bg-emerald-50 p-4">
                <p className="text-lg font-bold">{activeComplaint.technician?.name ?? "Not assigned yet"}</p>
                <p className="text-sm text-slate-600">
                  {activeComplaint.technician
                    ? `${activeComplaint.technician.skill} specialist - ${formatDistance(activeComplaint.technician.distanceKm)} away`
                    : "A technician will be assigned by the authority."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-white p-3">
                    <p className="text-slate-500">ETA</p>
                    <p className="font-bold">{formatEta(activeComplaint.technician?.etaMinutes)}</p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-slate-500">Rating</p>
                    <p className="font-bold">{activeComplaint.technician?.rating ?? "-"}/5</p>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <Phone size={16} />
                  {activeComplaint.technician?.phone ?? "Not available"}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MapPinned className="text-sky-700" size={22} />
              <h2 className="text-xl font-bold">Live Issue Map</h2>
            </div>
            <div className="relative h-72 overflow-hidden rounded-md bg-slate-200">
              <div className="absolute inset-4 rounded-lg border-2 border-white/80" />
              {areaIssues.map((issue) => (
                <span
                  key={issue.area}
                  className={`absolute h-4 w-4 rounded-full ring-4 ${
                    issue.severity === "Emergency"
                      ? "bg-red-600 ring-red-200"
                      : issue.severity === "High"
                        ? "bg-orange-500 ring-orange-200"
                        : "bg-sky-600 ring-sky-200"
                  }`}
                  style={{ top: issue.top, left: issue.left }}
                  title={issue.area}
                />
              ))}
              {!areaIssues.length && (
                <p className="absolute bottom-4 left-4 rounded-md bg-white px-3 py-2 text-sm font-semibold shadow">
                  No active service areas
                </p>
              )}
              <p className="absolute bottom-4 left-4 rounded-md bg-white px-3 py-2 text-sm font-semibold shadow">
                Dhaka service areas
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {areaIssues.slice(0, 3).map((issue) => (
                <div key={issue.area} className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
                  <AlertTriangle
                    className={issue.severity === "Emergency" ? "text-red-600" : "text-orange-600"}
                    size={18}
                  />
                  <div>
                    <p className="font-semibold">{issue.area}</p>
                    <p className="text-sm text-slate-600">{issue.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
