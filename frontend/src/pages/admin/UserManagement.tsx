import { useEffect, useMemo, useState } from "react";
import { Shield, Users } from "lucide-react";
import { userManagementService } from "../../services/userManagementService";
import type { User } from "../../types/utility";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await userManagementService.list("Citizen");
        setUsers(data.users);
      } catch {
        setError("Could not load users. Please ensure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [users, searchTerm]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    setActionError("");
    setBusyUserId(`delete-${userId}`);
    try {
      await userManagementService.remove(userId);
      setUsers((current) => current.filter((item) => item.id !== userId));
    } catch {
      setActionError("Could not delete user.");
    } finally {
      setBusyUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <p className="rounded-md bg-white p-4 text-slate-600 shadow-sm">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{error}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Citizens</h2>
          <p className="mt-1 text-sm text-slate-600">{users.length} registered citizen{users.length === 1 ? "" : "s"} total</p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-slate-300 px-4 py-2 pl-10 text-sm outline-none focus:border-sky-400 sm:w-72"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Shield size={16} />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          <Users size={14} />
          Citizens: {users.length}
        </span>
      </div>

      {actionError && (
        <p className="rounded-md bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{actionError}</p>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isBusy = busyUserId === `delete-${user.id}`;

              return (
                <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-4">{user.email}</td>
                  <td className="px-4 py-4">{user.phone ?? "—"}</td>
                  <td className="px-4 py-4">
                    <button
                      disabled={isBusy}
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filteredUsers.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                  {users.length ? "No citizens match your search." : "No citizen users registered yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
