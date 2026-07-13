export type UtilityType = "Water" | "Gas" | "Electricity";
export type ComplaintStatus = "Pending" | "Processing" | "Completed" | "Cancelled";
export type ComplaintPriority = "Normal" | "High" | "Emergency";
export type TechnicianStatus = "Active" | "Busy" | "Offline";

export type Technician = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skill: UtilityType;
  status: TechnicianStatus;
  area?: string;
  distanceKm?: number;
  etaMinutes?: number;
  rating: number;
  latitude?: number | null;
  longitude?: number | null;
  locationUpdatedAt?: string | null;
};

export type UserRole = "Citizen" | "Technician" | "Admin";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  technician?: Technician | null;
  latitude?: number | null;
  longitude?: number | null;
  locationUpdatedAt?: string | null;
};

export type StatusHistory = {
  id: string;
  complaintId: string;
  status: string;
  note?: string;
  createdAt: string;
};

export type Review = {
  id: string;
  complaintId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  citizenName?: string;
};

export type Complaint = {
  id: string;
  token: string;
  title: string;
  description: string;
  type: UtilityType;
  area: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  position: number;
  photo?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  citizen?: User;
  technician: Technician | null;
  statusHistory?: StatusHistory[];
  review?: Review | null;
};

export type AdminAnalytics = {
  totals: {
    totalComplaints: number;
    pendingComplaints: number;
    processingComplaints: number;
    completedComplaints: number;
    emergencyComplaints: number;
    activeTechnicians: number;
  };
  complaintsByType: Array<{ type: string; _count: number }>;
  complaintsByArea: Array<{ area: string; _count: number }>;
};

export type RequestType = "Assignment" | "Help" | "Reassign" | "Other";
export type RequestStatus = "Pending" | "Approved" | "Rejected";

export type TechnicianRequest = {
  id: string;
  complaintId: string;
  technicianId: string;
  type: RequestType;
  message: string;
  status: RequestStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  complaint?: Pick<Complaint, "id" | "token" | "title" | "area" | "type" | "status" | "priority">;
  technician?: Technician;
};

export type AdminSection =
  | "Dashboard"
  | "Complaints"
  | "Technicians"
  | "Users"
  | "Live Map"
  | "Emergency Alerts"
  | "Analytics";
