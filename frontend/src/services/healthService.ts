import { api } from "./api";

export const healthService = {
  async check(): Promise<{ status: string; service: string }> {
    const { data } = await api.get("/health");
    return data;
  },
};
