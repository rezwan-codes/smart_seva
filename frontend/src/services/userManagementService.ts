import { api } from "./api";
import type { User, UserRole } from "../types/utility";

type UpdateRolePayload = {
  role: UserRole;
};

export const userManagementService = {
  async list(role?: UserRole): Promise<{ users: User[] }> {
    const params = role ? { params: { role } } : {};
    const { data } = await api.get("/admin/users", params);
    return data;
  },

  async updateRole(id: string, payload: UpdateRolePayload) {
    const { data } = await api.patch(`/admin/users/${id}/role`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  },
};
