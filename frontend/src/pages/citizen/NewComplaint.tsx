import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
  Lightbulb,
  MapPin,
  MessageCircle,
  Send,
  ShieldAlert,
  UserCheck,
  Zap,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import MapTracker from "../../components/map/MapTracker";
import { useLiveLocation } from "../../hooks/useLiveLocation";
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

type FormStep = "details" | "location" | "priority" | "review";

const utilityConfig: Record<
  UtilityType,
  {
    Icon: LucideIcon;
    title: string;
    examples: string[];
    color: string;
    bg: string;
    border: string;
    text: string;
  }
> = {
  Electricity: {
    Icon: Zap,
    title: "Electricity Issues",
    examples: ["Transformer failure", "Power outage", "Exposed wire", "Voltage fluctuation"],
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "emerald",
  },
  Water: {
    Icon: Droplets,
    title: "Water Supply Issues",
    examples: ["Low pressure", "Pipe leakage", "Turbid water", "No supply"],
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "sky",
  },
  Gas: {
    Icon: Flame,
    title: "Gas Supply Issues",
    examples: ["Gas smell / leak", "Low pressure", "No supply", "Pipeline damage"],
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "amber",
  },
};

const priorityConfig: Record<
  ComplaintPriority,
  { label: string; description: string; color: string; bg: string; border: string }
> = {
  Normal: {
    label: "Normal",
    description: "Non-urgent issues. Standard response time applies.",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  High: {
    label: "High Priority",
    description: "Urgent issues affecting multiple users. Prioritized dispatch.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  Emergency: {
    label: "Emergency",
    description: "Critical safety hazards. Immediate response required.",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

function getStepNumber(step: FormStep): number {
  const order: FormStep[] = ["details", "location", "priority", "review"];
  return order.indexOf(step) + 1;
}

function getTotalSteps(): number {
  return 4;
}

function SmartSuggestion({ form }: { form: ComplaintForm }) {
  const suggestions = useMemo(() => {
    const s: string[] = [];
    const subject = form.subject.toLowerCase();
    const desc = form.description.toLowerCase();

    if (/\b(leak|smell|fire|spark|exposed|burst|emergency|danger)\b/.test(subject + " " + desc)) {
      s.push("This sounds like an emergency. Consider setting priority to Emergency.");
    }
    if (/\b(outage|power|no light|dark|electricity)\b/.test(subject + " " + desc)) {
      s.push("Power outage detected. Ensure safety by keeping away from exposed wires.");
    }
    if (/\b(gas|smell|odor)\b/.test(subject + " " + desc)) {
      s.push("Gas issues can be dangerous. Avoid open flames and mark as Emergency if leaking.");
    }
    if (/\b(water|pipe|leak|pressure|no water)\b/.test(subject + " " + desc)) {
      s.push("Water issues may affect multiple households. Consider High priority if widespread.");
    }
    if (form.subject.length > 0 && form.description.length < 20) {
      s.push("Add more details to help technicians understand the issue better.");
    }
    if (s.length === 0 && form.subject.length > 0) {
      s.push("Good description! Make sure to pin the exact location on the map.");
    }

    return s.slice(0, 3);
  }, [form]);

  if (!suggestions.length) return null;

  return (
    <div className="animate-fade-in-up rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 shrink-0 text-sky-600" size={20} />
        <div>
          <p className="text-sm font-semibold text-sky-900">Smart Suggestions</p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-sky-800">
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AnimatedProgressBar({ currentStep }: { currentStep: FormStep }) {
  const steps: { key: FormStep; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "location", label: "Location" },
    { key: "priority", label: "Priority" },
    { key: "review", label: "Review" },
  ];

  const currentNum = getStepNumber(currentStep);
  const total = getTotalSteps();
  const progress = ((currentNum - 1) / (total - 1)) * 100;

  return (
    <div className="animate-fade-in-up mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentNum;
          const isCompleted = stepNum < currentNum;

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500 ${
                      isActive
                        ? "border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/30 scale-110"
                        : isCompleted
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : stepNum}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold sm:text-sm ${
                      isActive ? "text-sky-700" : isCompleted ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-2 h-0.5 flex-1 bg-slate-200 sm:mx-4">
                    <div
                      className={`h-full transition-all duration-700 ${
                        isCompleted ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function NewComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ComplaintForm>(initialForm);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("details");
  const liveLocation = useLiveLocation();

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

  const isFormValid = useMemo(() => {
    return form.subject.trim().length > 0 && form.area.trim().length > 0 && form.description.trim().length > 0;
  }, [form]);

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
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lng,
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
        <div className="mx-auto max-w-3xl animate-fade-in-up">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-emerald-200">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="text-white" size={48} />
              </div>
              <h1 className="text-3xl font-bold">Complaint Submitted!</h1>
              <p className="mt-2 text-emerald-50">
                {hasTechnician
                  ? "Your complaint has been sent to the assigned technician."
                  : "Your complaint has been queued and technicians will be notified."}
              </p>
            </div>

            <div className="p-6">
              <div className="mx-auto max-w-sm rounded-lg bg-slate-950 p-6 text-center text-white shadow-lg">
                <p className="text-sm text-slate-300">Your Digital Token</p>
                <p className="mt-2 text-5xl font-bold tracking-wider">{submittedComplaint.token}</p>
                <p className="mt-2 text-xs text-slate-400">Save this token to track your complaint</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="card-hover rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Queue Position</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">#{submittedComplaint.position}</p>
                </div>
                <div className="card-hover rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{submittedComplaint.status}</p>
                </div>
                <div className="card-hover rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Technician ETA</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{formatEta(submittedComplaint.technician?.etaMinutes)}</p>
                </div>
              </div>

              {hasTechnician && (
                <div className="mt-4 animate-fade-in-up rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                      <UserCheck size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-900">Assigned Technician</p>
                      <p className="mt-1 text-sm text-emerald-800">
                        {submittedComplaint.technician?.name} ({submittedComplaint.technician?.skill}) - Rating:{" "}
                        {submittedComplaint.technician?.rating.toFixed(1)}/5
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <MapPin size={14} />
                        {formatDistance(submittedComplaint.technician?.distanceKm)} away
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => navigate(`/complaints/${submittedComplaint.id}`)}
                  className="group flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-500/25"
                >
                  <MessageCircle size={18} className="transition group-hover:scale-110" />
                  Open Job Details
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
                >
                  Track From Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStepNum = getStepNumber(currentStep);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {/* Animated Header */}
      <header className="relative overflow-hidden bg-slate-950 px-5 py-5 shadow-lg sm:px-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
        </div>
        <div className="relative mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={18} className="transition group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">New Utility Complaint</h1>
            <p className="text-xs text-slate-400">Step {currentStepNum} of {getTotalSteps()}</p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        {/* Progress Bar */}
        <AnimatedProgressBar currentStep={currentStep} />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Form */}
          <section className="animate-fade-in-up rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {/* Step 1: Details */}
            {currentStep === "details" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Complaint Details</h2>
                  <p className="mt-1 text-slate-600">Tell us what utility issue you're experiencing.</p>
                </div>

                {/* Utility Type Selection */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">What type of utility issue?</label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(utilityConfig) as UtilityType[]).map((type) => {
                      const config = utilityConfig[type];
                      const Icon = config.Icon;
                      const isSelected = form.type === type;

                      return (
                        <button
                          key={type}
                          onClick={() => updateField("type", type)}
                          className={`card-hover group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all duration-300 ${
                            isSelected
                              ? `${config.border} ${config.bg} shadow-md`
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                              <CheckCircle2 size={12} />
                            </div>
                          )}
                          <Icon
                            size={32}
                            className={`transition group-hover:scale-110 ${
                              isSelected ? config.color : "text-slate-400"
                            }`}
                          />
                          <p className={`mt-2 font-bold ${isSelected ? config.color : "text-slate-700"}`}>
                            {config.title}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {config.examples.slice(0, 2).map((example) => (
                              <li key={example} className="text-xs text-slate-500">
                                • {example}
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Complaint Subject</span>
                    <div className="relative mt-2">
                      <input
                        value={form.subject}
                        onChange={(event) => updateField("subject", event.target.value)}
                        placeholder="e.g., Transformer failure in Block C"
                        className="w-full rounded-md border border-slate-300 bg-white p-3 pr-16 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                      <span className="absolute right-3 top-3 text-xs text-slate-400">
                        {form.subject.length}/100
                      </span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Area</span>
                    <input
                      value={form.area}
                      onChange={(event) => updateField("area", event.target.value)}
                      placeholder="Dhanmondi, Mirpur, Uttara"
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full Address</span>
                  <div className="mt-2 flex rounded-md border border-slate-300 bg-white transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200">
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
                  <div className="relative">
                    <textarea
                      value={form.description}
                      onChange={(event) => updateField("description", event.target.value)}
                      rows={5}
                      placeholder="Explain what happened, when it started, and how many people are affected."
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                    <span className="absolute right-3 bottom-3 text-xs text-slate-400">
                      {form.description.length}/500
                    </span>
                  </div>
                </label>

                <SmartSuggestion form={form} />

                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep("location")}
                    disabled={!form.subject.trim() || !form.area.trim()}
                    className="group flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:hover:bg-sky-600"
                  >
                    Continue to Location
                    <ChevronRight size={18} className="transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === "location" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Pin Your Location</h2>
                  <p className="mt-1 text-slate-600">Click the exact spot on the map where the issue is located.</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Quick Actions</p>
                      <p className="text-xs text-slate-500">Use your current position or click the map</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => liveLocation.location && setSelectedLocation(liveLocation.location)}
                      disabled={!liveLocation.location}
                      className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      <MapPin size={16} />
                      Use My Location
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border-2 border-slate-200 shadow-sm transition hover:border-sky-300">
                  <MapTracker
                    height="320px"
                    zoom={13}
                    initialLocation={selectedLocation ?? liveLocation.location ?? { lat: 23.8103, lng: 90.4125 }}
                    userLocation={liveLocation.location}
                    onLocationSelect={setSelectedLocation}
                  />
                </div>

                {selectedLocation && (
                  <div className="animate-fade-in-up flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Location Selected</p>
                      <p className="font-mono text-sm text-emerald-700">
                        {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>
                )}

                {!selectedLocation && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Location Required</p>
                        <p className="mt-1 text-sm text-amber-700">
                          Please click on the map or use your current location to pin the complaint location.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep("details")}
                    className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep("priority")}
                    disabled={!selectedLocation}
                    className="group flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:hover:bg-sky-600"
                  >
                    Continue to Priority
                    <ChevronRight size={18} className="transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Priority */}
            {currentStep === "priority" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Set Priority Level</h2>
                  <p className="mt-1 text-slate-600">Choose the urgency level based on the severity of the issue.</p>
                </div>

                <SmartSuggestion form={form} />

                <div className="grid gap-4 sm:grid-cols-3">
                  {(Object.keys(priorityConfig) as ComplaintPriority[]).map((priority) => {
                    const config = priorityConfig[priority];
                    const isSelected = form.priority === priority;

                    return (
                      <button
                        key={priority}
                        onClick={() => updateField("priority", priority)}
                        className={`card-hover group relative overflow-hidden rounded-lg border-2 p-5 text-left transition-all duration-300 ${
                          isSelected
                            ? `${config.border} ${config.bg} shadow-lg scale-[1.02]`
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                        <p className={`text-lg font-bold ${isSelected ? config.color : "text-slate-700"}`}>
                          {config.label}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{config.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 shrink-0 text-red-600" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Emergency Guidelines</p>
                      <p className="mt-1 text-sm text-red-700">
                        Use Emergency only for critical safety hazards like gas leaks, transformer fires, exposed
                        wires, or pipeline bursts. False emergency reports may delay response to real emergencies.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep("location")}
                    className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep("review")}
                    className="group flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
                  >
                    Review Complaint
                    <ChevronRight size={18} className="transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Review & Submit</h2>
                  <p className="mt-1 text-slate-600">Verify all details before submitting your complaint.</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-500">Utility Type</p>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${utilityConfig[form.type].bg} ${utilityConfig[form.type].color}`}>
                        {(() => {
                          const Icon = utilityConfig[form.type].Icon;
                          return <Icon size={16} />;
                        })()}
                        {form.type}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-500">Subject</p>
                    <p className="mt-1 font-semibold text-slate-900">{form.subject || "Not provided"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Area</p>
                      <p className="mt-1 font-semibold text-slate-900">{form.area || "Not provided"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Priority</p>
                      <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${priorityConfig[form.priority].bg} ${priorityConfig[form.priority].color}`}>
                        {form.priority}
                      </span>
                    </div>
                  </div>

                  {form.address && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Address</p>
                      <p className="mt-1 text-sm text-slate-700">{form.address}</p>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-500">Description</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{form.description || "No description provided"}</p>
                  </div>

                  {selectedLocation && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-emerald-700" />
                        <p className="text-sm font-semibold text-emerald-900">Location Pinned</p>
                      </div>
                      <p className="mt-1 font-mono text-sm text-emerald-700">
                        {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                      </p>
                    </div>
                  )}

                  {form.photo && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">Photo Evidence</p>
                      <div className="mt-3 inline-flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2">
                        <img
                          src={URL.createObjectURL(form.photo)}
                          alt="Preview"
                          className="h-20 w-20 rounded object-cover"
                        />
                        <span className="text-sm text-slate-600">{form.photo.name}</span>
                      </div>
                    </div>
                  )}

                  {assignedTechnician && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2">
                        <UserCheck size={18} className="text-emerald-700" />
                        <p className="text-sm font-semibold text-emerald-900">Suggested Technician</p>
                      </div>
                      <p className="mt-1 text-sm text-emerald-800">
                        {assignedTechnician.name} ({assignedTechnician.skill}) - {formatDistance(assignedTechnician.distanceKm)} · ETA{" "}
                        {formatEta(assignedTechnician.etaMinutes)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
                      <AlertTriangle size={16} />
                      {error}
                    </div>
                  )}
                  <button
                    onClick={() => setCurrentStep("priority")}
                    className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitComplaint}
                    disabled={isSubmitting || !isFormValid}
                    className="group relative flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} className="transition group-hover:scale-110" />
                        Submit Complaint
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            {/* Step Indicator Card */}
            <div className="animate-fade-in-up overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="bg-slate-950 px-5 py-4 text-white">
                <h3 className="font-bold">Submission Progress</h3>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {[
                    { step: "details", label: "Details", icon: ClipboardList },
                    { step: "location", label: "Location", icon: MapPin },
                    { step: "priority", label: "Priority", icon: ShieldAlert },
                    { step: "review", label: "Review", icon: CheckCircle2 },
                  ].map(({ step, label, icon: Icon }) => {
                    const isActive = currentStep === step;
                    const isCompleted = getStepNumber(currentStep) > getStepNumber(step as FormStep);

                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-3 rounded-lg p-3 transition ${
                          isActive ? "bg-sky-50 ring-2 ring-sky-200" : isCompleted ? "bg-emerald-50" : "bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${
                            isActive ? "bg-sky-600 text-white" : isCompleted ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${isActive ? "text-sky-900" : isCompleted ? "text-emerald-900" : "text-slate-600"}`}>
                            {label}
                          </p>
                        </div>
                        {isCompleted && <CheckCircle2 size={16} className="text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Emergency Alert */}
            <div className="animate-fade-in-up overflow-hidden rounded-xl bg-slate-950 p-5 text-white shadow-sm">
              <ShieldAlert className="text-red-300" size={26} />
              <h2 className="mt-3 text-lg font-bold">Emergency Alert</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Mark emergency only for critical issues such as gas leakage, transformer failure, exposed wire, or
                main pipeline burst.
              </p>
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs font-semibold text-red-200">False emergency reports delay real emergency responses.</p>
              </div>
            </div>

            {/* Nearest Technician */}
            <div className="animate-fade-in-up overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="bg-amber-500 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Flame size={22} />
                  <h2 className="text-lg font-bold">Nearest Technician</h2>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600">
                  {assignedTechnician
                    ? `${assignedTechnician.name} will be suggested for ${form.type} issues.`
                    : `An available ${form.type} technician will be assigned automatically.`}
                </p>
                {assignedTechnician && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-slate-100 p-3">
                      <p className="text-xs text-slate-500">Distance</p>
                      <p className="font-bold">{formatDistance(assignedTechnician.distanceKm)}</p>
                    </div>
                    <div className="rounded-md bg-slate-100 p-3">
                      <p className="text-xs text-slate-500">ETA</p>
                      <p className="font-bold">{formatEta(assignedTechnician.etaMinutes)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}