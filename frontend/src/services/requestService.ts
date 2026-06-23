import { api } from "./api";
import type { RequestType, TechnicianRequest } from "../types/utility";

type CreateRequestPayload = {
  complaintId: string;
  type?: RequestType;
  message: string;
  technicianId?: string;
};

export const requestService = {
  async list(): Promise<{ requests: TechnicianRequest[] }> {
    const { data } = await api.get("/requests");
    return data;
  },

  async create(payload: CreateRequestPayload): Promise<{ request: TechnicianRequest }> {
    const { data } = await api.post("/requests", payload);
    return data;
  },

  async respond(id: string, status: "Approved" | "Rejected", adminNote?: string) {
    const { data } = await api.patch(`/requests/${id}`, { status, adminNote });
    return data;
  },
};
