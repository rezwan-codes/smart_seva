import { api } from "./api";
import type { Technician, TechnicianStatus } from "../types/utility";

export const technicianService = {
  async list(): Promise<{ technicians: Technician[] }> {
    const { data } = await api.get("/technicians");
    return data;
  },

  async updateStatus(id: string, status: TechnicianStatus) {
    const { data } = await api.patch(`/technicians/${id}/status`, { status });
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(`/technicians/${id}`);
    return data;
  },
};
