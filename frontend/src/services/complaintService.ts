import { api } from "./api";
import type { Complaint, ComplaintPriority, UtilityType } from "../types/utility";

type CreateComplaintPayload = {
  title: string;
  description: string;
  type: UtilityType;
  area: string;
  address?: string;
  priority?: ComplaintPriority;
  photo?: File | null;
};

export const complaintService = {
  async list(): Promise<{ complaints: Complaint[] }> {
    const { data } = await api.get("/complaints");
    return data;
  },

  async listOpenJobs(): Promise<{ complaints: Complaint[] }> {
    const { data } = await api.get("/complaints/open-jobs");
    return data;
  },

  async create(payload: CreateComplaintPayload): Promise<{ complaint: Complaint }> {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("type", payload.type);
    formData.append("area", payload.area);
    if (payload.address) formData.append("address", payload.address);
    if (payload.priority) formData.append("priority", payload.priority);
    if (payload.photo) formData.append("photo", payload.photo);

    const { data } = await api.post("/complaints", formData);
    return data;
  },

  async getById(id: string): Promise<{ complaint: Complaint }> {
    const { data } = await api.get(`/complaints/${id}`);
    return data;
  },

  async updateStatus(id: string, status: string, note?: string) {
    const { data } = await api.patch(`/complaints/${id}/status`, { status, note });
    return data;
  },

  async assignTechnician(id: string, technicianId: string) {
    const { data } = await api.patch(`/complaints/${id}/assign`, { technicianId });
    return data;
  },

  async submitReview(id: string, rating: number, comment?: string) {
    const { data } = await api.post(`/complaints/${id}/review`, { rating, comment });
    return data;
  },

  async confirm(id: string) {
    const { data } = await api.patch(`/complaints/${id}/confirm`);
    return data;
  },
};
