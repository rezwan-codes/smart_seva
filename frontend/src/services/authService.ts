import { api } from "./api";
import type { User } from "../types/utility";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "citizen" | "technician" | "admin";
  skill?: "water" | "gas" | "electricity";
  area?: string;
};

export const authService = {
  async login(payload: LoginPayload): Promise<{ user: User; token: string }> {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("smartUtilityToken", data.token);
    return data;
  },

  async register(payload: RegisterPayload): Promise<{ user: User; token: string }> {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("smartUtilityToken", data.token);
    return data;
  },

  async me(): Promise<{ user: User }> {
    const { data } = await api.get("/auth/me");
    return data;
  },

  async updateLocation(latitude: number, longitude: number): Promise<{ user: User }> {
    const { data } = await api.patch("/auth/location", { latitude, longitude });
    return data;
  },

  logout() {
    localStorage.removeItem("smartUtilityToken");
  },
};
