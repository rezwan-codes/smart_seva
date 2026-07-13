import { useEffect, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  Star,
  Ticket,
  Wrench,
} from "lucide-react";
import JobChatPanel from "../../components/chat/JobChatPanel";
import MapTracker from "../../components/map/MapTracker";
import { complaintService } from "../../services/complaintService";
import { authService } from "../../services/authService";
import type { Complaint, User } from "../../types/utility";
import {
  formatDistance,
  formatEta,
  formatSubmittedAt,
  priorityStyles,
  statusStyles,
  utilityStyles,
} from "../../utils/utilityDisplay";

function getDashboardPath(role: string | null) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "technician") return "/technician/dashboard";
  return "/dashboard";
}

function technicianLiveLabel(complaint: Complaint) {
  if (!complaint.technician) return "Waiting for assignment";
  if (complaint.technician.status === "Offline") return "Technician offline";
  if (!complaint.technician.locationUpdatedAt) return `${complaint.technician.status} - no live ping`;

  const minutes = Math.round((Date.now() - new Date(complaint.technician.locationUpdatedAt).getTime()) / 60000);
  return minutes <= 3 ? `Live now - ${complaint.technician.status}` : `Last live ${minutes} min ago`;
}

export default function ComplaintDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const role = localStorage.getItem("role");
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadComplaint = useCallback(() => {
    if (!id) return Promise.resolve();
    return complaintService
      .getById(id)
      .then((data) => setComplaint(data.complaint))
      .catch(() => setError("Could not load this complaint from the backend."));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadComplaint().finally(() => setIsLoading(false));
  }, [id, loadComplaint]);

  useEffect(() => {
    authService
      .me()
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setError("Could not load user data."));
  }, []);

  const handleCompleteWork = async () => {
    if (!complaint) return;
    setActionError("");
    setIsCompleting(true);
    try {
      const { complaint: updated } = await complaintService.updateStatus(
        complaint.id,
        "Completed",
        completionNote.trim() || "Work completed on site",
      );
      setComplaint(updated);
      setCompletionNote("");
    } catch {
      setActionError("Could not mark this job as completed.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!complaint) return;
    setActionError("");
    setIsSubmittingReview(true);
    try {
      const { complaint: updated } = await complaintService.submitReview(
        complaint.id,
        reviewRating,
        reviewComment.trim() || undefined,
      );
      setComplaint(updated);
    } catch {
      setActionError("Could not submit your review. It may already exist or the work is not completed yet.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 p-8 text-slate-600">Loading complaint...</div>;
  }

  if (!complaint) {
    return <div className="min-h-screen bg-slate-100 p-8 font-semibold text-red-700">{error || "Complaint not found."}</div>;
  }

  const style = utilityStyles[complaint.type];
  const Icon = style.Icon;
  const canComplete =
    role === "technician" &&
    currentUser?.technician?.id === complaint.technician?.id &&
    complaint.status !== "Completed" &&
    complaint.status !== "Cancelled";
  const canReview =
    role === "citizen" && complaint.status === "Completed" && !complaint.review;
  const activeStep = complaint.status === "Pending" ? 1 : complaint.status === "Processing" ? 2 : complaint.status === "Completed" ? 3 : 0;
  const progressPercent = complaint.status === "Cancelled" ? 100 : Math.min(activeStep * 33, 100);
  const hasComplaintLocation = typeof complaint.latitude === "number" && typeof complaint.longitude === "number";

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 text-slate-950 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate(getDashboardPath(role))}
          className="mb-5 flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {actionError && (
          <p className="mb-4 rounded-md bg-red-50 p-4 font-semibold text-red-700">{actionError}</p>
        )}

        <section className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text}`}>
                  <Icon size={16} />
                  {complaint.type} service job
                </span>
                <h1 className="mt-4 text-3xl font-bold">{complaint.title}</h1>
                <p className="mt-2 flex items-center gap-2 text-slate-300">
                  <MapPin size={18} />
                  {complaint.area} - {formatSubmittedAt(complaint.createdAt)}
                </p>
              </div>
              <div className="rounded-md bg-white px-5 py-4 text-slate-950">
                <p className="text-sm text-slate-500">Digital Token</p>
                <p className="text-3xl font-bold">{complaint.token}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-200">Service progress</span>
                <span className="font-bold text-white">{complaint.status}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full rounded-full ${
                    complaint.status === "Cancelled" ? "bg-rose-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-xl font-bold">Issue Details</h2>
              <p className="mt-2 leading-7 text-slate-700">{complaint.description}</p>
              {complaint.address && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Navigation size={16} />
                  {complaint.address}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Activity size={16} />
                Live Service Snapshot
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Technician</span>
                  <span className="text-right font-semibold">{complaint.technician?.name ?? "Not assigned"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Presence</span>
                  <span className="text-right font-semibold">{technicianLiveLabel(complaint)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Priority</span>
                  <span className="font-semibold">{complaint.priority}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-md bg-slate-100 p-4">
              <Ticket className="text-sky-700" size={22} />
              <p className="mt-3 text-sm text-slate-500">Queue Position</p>
              <p className="text-2xl font-bold">#{complaint.position}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-4">
              <Clock className="text-amber-700" size={22} />
              <p className="mt-3 text-sm text-slate-500">Status</p>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[complaint.status]}`}>
                {complaint.status}
              </span>
            </div>
            <div className="rounded-md bg-slate-100 p-4">
              <CheckCircle2 className="text-emerald-700" size={22} />
              <p className="mt-3 text-sm text-slate-500">Priority</p>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${priorityStyles[complaint.priority]}`}>
                {complaint.priority}
              </span>
            </div>
            <div className="rounded-md bg-slate-100 p-4">
              <Wrench className="text-indigo-700" size={22} />
              <p className="mt-3 text-sm text-slate-500">ETA</p>
              <p className="text-2xl font-bold">{formatEta(complaint.technician?.etaMinutes)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {complaint.photoUrl && (
              <div>
                <h2 className="text-xl font-bold">Complaint Photo</h2>
                <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
                  <img
                    src={complaint.photoUrl}
                    alt="Complaint photo"
                    className="max-h-80 w-full object-cover"
                  />
                </div>
              </div>
            )}

            {hasComplaintLocation && (
              <div>
                <h2 className="text-xl font-bold">Job Location</h2>
                <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
                  <MapTracker
                    height="260px"
                    initialLocation={{ lat: complaint.latitude as number, lng: complaint.longitude as number }}
                    zoom={14}
                    locations={[
                      {
                        lat: complaint.latitude as number,
                        lng: complaint.longitude as number,
                        label: `${complaint.token} - ${complaint.area}`,
                        severity: complaint.priority,
                        description: complaint.status,
                      },
                    ]}
                    technicianLocations={
                      typeof complaint.technician?.latitude === "number" &&
                      typeof complaint.technician.longitude === "number"
                        ? [
                            {
                              id: complaint.technician.id,
                              name: complaint.technician.name,
                              lat: complaint.technician.latitude,
                              lng: complaint.technician.longitude,
                              status: complaint.technician.status,
                            },
                          ]
                        : []
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {complaint.status === "Completed" && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={20} />
                Work completed
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                The assigned technician has finished this job. Citizens can now leave a service review.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="rounded-md border border-slate-200 p-5">
              <h2 className="text-xl font-bold">Progress Timeline</h2>
              <div className="mt-5 space-y-5">
                {(complaint.statusHistory?.length
                  ? [...complaint.statusHistory].reverse()
                  : [{ note: "Complaint submitted", status: "Pending", createdAt: complaint.createdAt }]
                ).map((history, index, items) => (
                  <div key={`${history.status}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-4 w-4 rounded-full ${
                          index === items.length - 1 ? "bg-emerald-600" : "bg-sky-600"
                        }`}
                      />
                      {index < items.length - 1 && <span className="h-10 w-px bg-slate-200" />}
                    </div>
                    <div>
                      <p className="font-semibold">{history.note || history.status}</p>
                      <p className="text-sm text-slate-500">
                        {history.createdAt ? formatSubmittedAt(history.createdAt) : "Updated"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-md bg-emerald-50 p-5">
                <h2 className="text-xl font-bold">Technician</h2>
                <p className="mt-3 text-lg font-semibold">{complaint.technician?.name ?? "Not assigned yet"}</p>
                <p className="text-slate-600">
                  {complaint.technician
                    ? `${complaint.technician.skill} specialist - ${formatDistance(complaint.technician.distanceKm)}`
                    : "The authority has not assigned a technician yet."}
                </p>
                <p className="mt-4 flex items-center gap-2 font-semibold text-emerald-800">
                  <Phone size={18} />
                  {complaint.technician?.phone ?? "Not available"}
                </p>
                {complaint.technician && (
                  <div className="mt-3 space-y-2">
                    <p className="flex items-center gap-1 text-amber-600">
                      <Star size={16} fill="currentColor" />
                      <span className="font-semibold">{complaint.technician.rating.toFixed(1)}</span>
                      <span className="text-sm text-slate-500">average rating</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <ShieldAlert size={16} />
                      {technicianLiveLabel(complaint)}
                    </p>
                  </div>
                )}
              </div>

              <JobChatPanel complaint={complaint} currentUser={currentUser} />

              {complaint.review && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-5">
                  <h2 className="text-xl font-bold">Your review</h2>
                  <div className="mt-3 flex items-center gap-1 text-amber-600">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={18}
                        fill={index < complaint.review!.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  {complaint.review.comment && (
                    <p className="mt-3 text-slate-700">{complaint.review.comment}</p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    Submitted {formatSubmittedAt(complaint.review.createdAt)}
                  </p>
                </div>
              )}

              {canReview && (
                <div className="rounded-md border border-sky-200 bg-sky-50 p-5">
                  <h2 className="text-xl font-bold">Rate this service</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    How was the technician&apos;s work on this complaint?
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value)}
                        className={`rounded-md p-2 transition ${
                          reviewRating >= value ? "text-amber-500" : "text-slate-300"
                        }`}
                      >
                        <Star size={24} fill={reviewRating >= value ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Share feedback about the completed work (optional)"
                    className="mt-4 w-full rounded-md border border-sky-200 p-3 outline-none focus:border-sky-400"
                    rows={3}
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="mt-3 w-full rounded-md bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit review"}
                  </button>
                </div>
              )}

              {canComplete && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
                  <h2 className="text-xl font-bold">Complete work</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Mark this job as done so the citizen can review your service.
                  </p>
                  <textarea
                    value={completionNote}
                    onChange={(event) => setCompletionNote(event.target.value)}
                    placeholder="Work summary (optional)"
                    className="mt-4 w-full rounded-md border border-emerald-200 p-3 outline-none focus:border-emerald-400"
                    rows={3}
                  />
                  <button
                    onClick={handleCompleteWork}
                    disabled={isCompleting}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {isCompleting ? "Saving..." : "Mark as completed"}
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
