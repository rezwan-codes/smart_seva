import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  ImageOff,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  Wrench,
} from "lucide-react";
import ApiStatusBanner from "../../components/ApiStatusBanner";
import { authService } from "../../services/authService";
import { complaintService } from "../../services/complaintService";
import { requestService } from "../../services/requestService";
import type { Complaint, RequestType, TechnicianRequest, User } from "../../types/utility";
import { formatDistance, formatEta, formatSubmittedAt, priorityStyles, utilityStyles } from "../../utils/utilityDisplay";

type Tab = "assignments" | "available" | "requests";

const requestTypes: RequestType[] = ["Assignment", "Help", "Reassign", "Other"];

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("assignments");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [openJobs, setOpenJobs] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<TechnicianRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [requestingJobId, setRequestingJobId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<RequestType>("Assignment");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestContext, setRequestContext] = useState<"available" | "assigned">("available");
  const [actionError, setActionError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const myTechnicianId = currentUser?.technician?.id;
  const assignedJobs = complaints.filter((complaint) => complaint.status !== "Completed");
  const completedJobs = complaints.filter((complaint) => complaint.status === "Completed");
  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const nearestDistance = useMemo(() => {
    const distances = assignedJobs
      .map((job) => job.technician?.distanceKm)
      .filter((distance): distance is number => typeof distance === "number");

    return distances.length ? Math.min(...distances) : undefined;
  }, [assignedJobs]);

  const loadData = () =>
    Promise.all([
      authService.me(),
      complaintService.list(),
      complaintService.listOpenJobs(),
      requestService.list(),
    ])
      .then(([userData, assignedData, openData, requestData]) => {
        setCurrentUser(userData.user);
        setComplaints(assignedData.complaints);
        setOpenJobs(openData.complaints);
        setRequests(requestData.requests);
      })
      .catch(() => setError("Could not load technician data from the backend."));

  useEffect(() => {
    const loadInitial = () => {
      loadData().finally(() => setIsLoading(false));
    };

    loadInitial();
    const interval = setInterval(loadData, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleConfirmJob = async (jobId: string) => {
    setActionError("");
    try {
      await complaintService.confirm(jobId);
      setConfirmingId(null);
      await loadData();
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

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "assignments", label: "My Jobs", count: assignedJobs.length },
    { id: "available", label: "Available Jobs", count: openJobs.length },
    { id: "requests", label: "Admin Requests", count: pendingRequests.length },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 px-5 py-4 text-white shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="text-emerald-300" size={24} />
            <div>
              <p className="font-bold">Technician Dashboard</p>
              <p className="text-sm text-slate-300">View jobs and request admin support</p>
            </div>
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

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <ApiStatusBanner />
        {actionError && (
          <p className="mb-4 rounded-md bg-red-50 p-4 font-semibold text-red-700">{actionError}</p>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <Wrench className="text-sky-700" size={24} />
            <p className="mt-4 text-3xl font-bold">{assignedJobs.length}</p>
            <p className="text-sm text-slate-500">Assigned jobs</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <ClipboardList className="text-amber-700" size={24} />
            <p className="mt-4 text-3xl font-bold">{openJobs.length}</p>
            <p className="text-sm text-slate-500">Open jobs</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <Navigation className="text-emerald-700" size={24} />
            <p className="mt-4 text-3xl font-bold">{formatDistance(nearestDistance)}</p>
            <p className="text-sm text-slate-500">Nearest job distance</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <CheckCircle2 className="text-indigo-700" size={24} />
            <p className="mt-4 text-3xl font-bold">{completedJobs.length}</p>
            <p className="text-sm text-slate-500">Completed jobs</p>
          </div>
        </section>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" ? ` (${tab.count})` : ""}
            </button>
          ))}
        </div>

        {isLoading && <p className="rounded-lg bg-white p-4 text-slate-600 shadow-sm">Loading...</p>}
        {error && <p className="rounded-lg bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{error}</p>}

        {activeTab === "assignments" && !isLoading && (
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">My Assignments</h1>
            <div className="mt-5 grid gap-4">
              {assignedJobs.map((job) => {
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
                    />

                    {requestingJobId === job.id && requestContext === "assigned" && (
                      <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-4">
                        <p className="font-semibold text-sky-900">Request admin</p>
                        <select
                          value={requestType}
                          onChange={(event) => setRequestType(event.target.value as RequestType)}
                          className="mt-3 w-full rounded-md border border-sky-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
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
                          className="mt-3 w-full rounded-md border border-sky-200 p-3 outline-none focus:border-sky-400"
                          rows={3}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleRequestAdmin(job.id)}
                            className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
                          >
                            <Send size={16} />
                            Send request
                          </button>
                          <button
                            onClick={() => {
                              setRequestingJobId(null);
                              setRequestMessage("");
                            }}
                            className="rounded-md bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!assignedJobs.length && (
                <p className="rounded-md bg-slate-50 p-4 text-slate-600">No active assigned jobs right now.</p>
              )}
            </div>

            {completedJobs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold">Recently completed</h2>
                <div className="mt-4 space-y-3">
                  {completedJobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col justify-between gap-2 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-slate-500">
                          {job.token} · {job.area}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "available" && !isLoading && (
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">Available Jobs</h1>
            <p className="mt-1 text-slate-600">
              Open jobs matching your skill. Auto-matched jobs require your confirmation.
            </p>
            <div className="mt-5 grid gap-4">
              {openJobs.map((job) => {
                const style = utilityStyles[job.type];
                const Icon = style.Icon;
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
                        <p className="text-sm font-semibold text-sky-700">{job.token}</p>
                        <h2 className="mt-1 text-xl font-bold">{job.title}</h2>
                        <p className="mt-2 text-slate-600">{job.description}</p>
                        <p className="mt-2 flex items-center gap-2 text-slate-600">
                          <MapPin size={18} />
                          {job.area}
                        </p>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text}`}>
                        <Icon size={14} />
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
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                          Auto-matched to you
                        </span>
                      )}
                    </div>

                    {hasPendingRequest ? (
                      <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                        Admin request pending for this job.
                      </p>
                    ) : confirmingId === job.id ? (
                      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                        <p className="font-semibold text-emerald-900">Confirm this assignment</p>
                        <p className="mb-3 mt-1 text-sm text-emerald-800">
                          Confirm that you accept this job and are ready to work on it.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleConfirmJob(job.id)}
                            className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Confirm and start
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="rounded-md bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : requestingJobId === job.id ? (
                      <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-4">
                        <p className="font-semibold text-sky-900">Request admin</p>
                        <select
                          value={requestType}
                          onChange={(event) => setRequestType(event.target.value as RequestType)}
                          className="mt-3 w-full rounded-md border border-sky-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
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
                          className="mt-3 w-full rounded-md border border-sky-200 p-3 outline-none focus:border-sky-400"
                          rows={3}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleRequestAdmin(job.id)}
                            className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
                          >
                            <Send size={16} />
                            Send request
                          </button>
                          <button
                            onClick={() => {
                              setRequestingJobId(null);
                              setRequestMessage("");
                            }}
                            className="rounded-md bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200"
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
                            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
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
                            className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
                          >
                            <MessageSquare size={16} />
                            Request admin
                          </button>
                        )}
                        <Link
                          to={`/complaints/${job.id}`}
                          className="flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
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
        )}

        {activeTab === "requests" && !isLoading && (
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">My Admin Requests</h1>
            <p className="mt-1 text-slate-600">Track requests you sent to the authority panel.</p>
            <div className="mt-5 space-y-3">
              {requests.map((request) => (
                <article key={request.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold">
                        {request.complaint?.token} · {request.complaint?.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {request.type} · {formatSubmittedAt(request.createdAt)}
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
                  {request.adminNote && (
                    <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
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
        )}
      </main>
    </div>
  );
}

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
}: JobCardProps) {
  return (
    <article className="rounded-md border border-slate-200 p-4">
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
          <p className="text-sm font-semibold text-sky-700">{job.token}</p>
          <h2 className="mt-1 text-xl font-bold">{job.title}</h2>
          <p className="mt-2 text-slate-600">{job.description}</p>
          <p className="mt-2 flex items-center gap-2 text-slate-600">
            <MapPin size={18} />
            {job.area}
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          {job.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-slate-100 p-3">
          <p className="text-sm text-slate-500">Priority</p>
          <p className="font-bold">{job.priority}</p>
        </div>
        <div className="rounded-md bg-slate-100 p-3">
          <p className="text-sm text-slate-500">ETA</p>
          <p className="font-bold">{formatEta(job.technician?.etaMinutes)}</p>
        </div>
        <div className="rounded-md bg-slate-100 p-3">
          <p className="text-sm text-slate-500">Contact</p>
          <p className="flex items-center gap-2 font-bold">
            <Phone size={16} />
            {job.citizen?.phone ?? "Citizen"}
          </p>
        </div>
      </div>

      {completingId === job.id ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">Complete this job</p>
          <textarea
            value={completionNote}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Brief work summary (optional)"
            className="mt-3 w-full rounded-md border border-emerald-200 p-3 outline-none focus:border-emerald-400"
            rows={3}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onComplete}
              className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Confirm complete
            </button>
            <button
              onClick={onCancelComplete}
              className="rounded-md bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onStartComplete}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
          >
            <CheckCircle2 size={18} />
            Complete work
          </button>
          {onRequestAdmin && !hasPendingRequest && (
            <button
              onClick={onRequestAdmin}
              className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
            >
              <MessageSquare size={16} />
              Request admin
            </button>
          )}
          {hasPendingRequest && (
            <span className="rounded-md bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              Admin request pending
            </span>
          )}
          <Link
            to={`/complaints/${job.id}`}
            className="flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
          >
            <ExternalLink size={18} />
            View details
          </Link>
        </div>
      )}
    </article>
  );
}
