import { api } from "./api";
import type { AdminAnalytics } from "../types/utility";

export const adminService = {
  async analytics(): Promise<AdminAnalytics> {
    const { data } = await api.get("/admin/analytics");
    return data;
  },
};
