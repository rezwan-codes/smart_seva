import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Flame,
  MapPin,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { complaintService } from "../../services/complaintService";
import { technicianService } from "../../services/technicianService";
import type { Complaint, ComplaintPriority, Technician, UtilityType } from "../../types/utility";
import {
  formatDistance,
  formatEta,
} from "../../utils/utilityDisplay";

type ComplaintForm = {
  type: UtilityType;
  priority: ComplaintPriority;
  subject: string;
  area: string;
  address: string;
  description: string;
  photo: File | null;
};

const initialForm: ComplaintForm = {
  type: "Electricity",
  priority: "Normal",
  subject: "",
  area: "",
  address: "",
  description: "",
  photo: null,
};

export default function NewComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ComplaintForm>(initialForm);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    technicianService
      .list()
      .then((data) => setTechnicians(data.technicians))
      .catch(() => setTechnicians([]));
  }, []);

  const assignedTechnician = useMemo(
    () => technicians.find((technician) => technician.skill === form.type && technician.status === "Active"),
    [form.type, technicians],
  );

  const updateField = <Key extends keyof ComplaintForm>(
    field: Key,
    value: ComplaintForm[Key],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitComplaint = async () => {
    if (!form.subject.trim() || !form.area.trim() || !form.description.trim()) {
      alert("Please add subject, area, and description.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data = await complaintService.create({
        title: form.subject,
        description: form.description,
        type: form.type,
        area: form.area,
        address: form.address,
        priority: form.priority,
        photo: form.photo,
      });

      setSubmittedComplaint(data.complaint);
    } catch (requestError) {
      const errorResponse = requestError as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (errorResponse.response?.status === 401) {
        setError("Your session expired. Please login again.");
        return;
      }

      setError(
        errorResponse.response?.data?.message ??
          (errorResponse.message === "Network Error"
            ? "Could not reach the backend. Make sure the API is running on port 5000."
            : "Could not submit the complaint. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedComplaint) {
    const hasTechnician = submittedComplaint.technician !== null;
    return (
      <div className="min-h-screen bg-slate-100 px-5 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
          <h1 className="mt-4 text-3xl font-bold">Complaint Submitted</h1>
          <p className="mt-2 text-slate-600">
            {hasTechnician
              ? `Your complaint has been sent to ${submittedComplaint.technician?.name}. They will review it and confirm the assignment shortly.`
              : "Your complaint has been queued. Available technicians matching your utility type will be notified."}
          </p>
          <div className="mx-auto mt-6 max-w-sm rounded-md bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Token Number</p>
            <p className="text-4xl font-bold">{submittedComplaint.token}</p>
          </div>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-md bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Queue Position</p>
              <p className="text-2xl font-bold">#{submittedComplaint.position}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Status</p>
              <p className="text-2xl font-bold">{submittedComplaint.status}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Technician ETA</p>
              <p className="text-2xl font-bold">{formatEta(submittedComplaint.technician?.etaMinutes)}</p>
            </div>
          </div>
          {hasTechnician && (
            <div className="mx-auto mt-4 max-w-sm rounded-md border border-emerald-200 bg-emerald-50 p-4 text-left">
              <p className="font-semibold text-emerald-900">Assigned Technician</p>
              <p className="mt-1 text-sm text-emerald-800">
                {submittedComplaint.technician?.name} ({submittedComplaint.technician?.skill}) - Rating: {submittedComplaint.technician?.rating.toFixed(1)}/5
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <MapPin size={14} />
                {formatDistance(submittedComplaint.technician?.distanceKm)} away
              </p>
            </div>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
          >
            Track From Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-white px-5 py-4 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <p className="font-semibold">New Utility Complaint</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Submit a Complaint</h1>
          <p className="mt-1 text-slate-600">
            Add the issue details and the system will generate a digital token.
          </p>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">Utility Type</label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {(["Electricity", "Water", "Gas"] as UtilityType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateField("type", type)}
                    className={`rounded-md border p-4 text-left font-semibold transition ${
                      form.type === type
                        ? "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Complaint Subject</span>
                <input
                  value={form.subject}
                  onChange={(event) => updateField("subject", event.target.value)}
                  placeholder="Transformer failure, gas smell, low water pressure"
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Area</span>
                <input
                  value={form.area}
                  onChange={(event) => updateField("area", event.target.value)}
                  placeholder="Dhanmondi, Mirpur, Uttara"
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full Address</span>
              <div className="mt-2 flex rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
                <MapPin className="ml-3 mt-3 text-slate-400" size={20} />
                <input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="House, road, block, nearest landmark"
                  className="w-full rounded-md p-3 outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={5}
                placeholder="Explain what happened, when it started, and how many people are affected."
                className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </label>

            <div>
              <label className="text-sm font-semibold text-slate-700">Priority</label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {(["Normal", "High", "Emergency"] as ComplaintPriority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => updateField("priority", priority)}
                    className={`rounded-md border p-3 text-left font-semibold transition ${
                      form.priority === priority
                        ? "border-red-400 bg-red-50 text-red-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Photo Evidence</label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  updateField("photo", file);
                }}
              />
              {form.photo ? (
                <div className="mt-3 inline-flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2">
                  <img
                    src={URL.createObjectURL(form.photo)}
                    alt="Preview"
                    className="h-16 w-16 rounded object-cover"
                  />
                  <span className="text-sm text-slate-600">{form.photo.name}</span>
                  <button
                    type="button"
                    onClick={() => updateField("photo", null)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="mt-3 flex w-fit items-center gap-2 rounded-md border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Camera size={18} />
                  Add Photo
                </button>
              )}
            </div>

            <div className="flex flex-col justify-end gap-3 sm:flex-row">
              {error && (
                <p className="self-center text-sm font-semibold text-red-700">{error}</p>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-md bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={submitComplaint}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
              >
                <Send size={18} />
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg bg-slate-950 p-5 text-white shadow-sm">
            <ShieldAlert className="text-red-300" size={26} />
            <h2 className="mt-3 text-xl font-bold">Emergency Alert</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Mark emergency only for critical issues such as gas leakage,
              transformer failure, exposed wire, or main pipeline burst.
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <Flame className="text-amber-600" size={26} />
            <h2 className="mt-3 text-xl font-bold">Nearest Technician</h2>
            <p className="mt-2 text-slate-600">
              {assignedTechnician
                ? `${assignedTechnician.name} will be suggested automatically for ${form.type}.`
                : `An available ${form.type} technician will be assigned from the database.`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Distance</p>
                <p className="font-bold">{formatDistance(assignedTechnician?.distanceKm)}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-sm text-slate-500">ETA</p>
                <p className="font-bold">{formatEta(assignedTechnician?.etaMinutes)}</p>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
