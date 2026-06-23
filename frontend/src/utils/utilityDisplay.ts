import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Droplets, Flame, Zap } from "lucide-react";
import type { Complaint, ComplaintPriority, ComplaintStatus, UtilityType } from "../types/utility";

export type AreaIssue = {
  area: string;
  type: UtilityType;
  severity: ComplaintPriority;
  affected: number;
  status: string;
  top: string;
  left: string;
};

export const utilityStyles: Record<
  UtilityType,
  { Icon: LucideIcon; bg: string; text: string; border: string }
> = {
  Water: {
    Icon: Droplets,
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  Gas: {
    Icon: Flame,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Electricity: {
    Icon: Zap,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

export const priorityStyles: Record<ComplaintPriority, string> = {
  Normal: "bg-slate-100 text-slate-700",
  High: "bg-orange-100 text-orange-700",
  Emergency: "bg-red-100 text-red-700",
};

export const statusStyles: Record<ComplaintStatus, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Processing: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

export const EmergencyIcon = AlertTriangle;

export function formatEta(minutes?: number) {
  return typeof minutes === "number" ? `${minutes} min` : "Not assigned";
}

export function formatDistance(km?: number) {
  return typeof km === "number" ? `${km.toFixed(km % 1 === 0 ? 0 : 1)} km` : "Unknown";
}

export function formatSubmittedAt(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function averageEtaMinutes(complaints: Complaint[]) {
  const etas = complaints
    .filter((complaint) => complaint.status !== "Completed")
    .map((complaint) => complaint.technician?.etaMinutes)
    .filter((minutes): minutes is number => typeof minutes === "number");

  if (!etas.length) {
    return null;
  }

  return Math.round(etas.reduce((total, minutes) => total + minutes, 0) / etas.length);
}

export function buildAreaIssues(complaints: Complaint[]): AreaIssue[] {
  const grouped = complaints.reduce<Record<string, AreaIssue>>((current, complaint, index) => {
    const existing = current[complaint.area];
    const priorityScore = { Normal: 1, High: 2, Emergency: 3 };
    const severity =
      existing && priorityScore[existing.severity] > priorityScore[complaint.priority]
        ? existing.severity
        : complaint.priority;

    current[complaint.area] = {
      area: complaint.area,
      type: complaint.type,
      severity,
      affected: (existing?.affected ?? 0) + 1,
      status: `${complaint.type} complaint ${complaint.status.toLowerCase()}`,
      top: existing?.top ?? `${22 + (index * 17) % 52}%`,
      left: existing?.left ?? `${18 + (index * 23) % 62}%`,
    };

    return current;
  }, {});

  return Object.values(grouped);
}
