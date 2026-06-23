import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { complaintService } from "../../services/complaintService";
import type { Complaint } from "../../types/utility";
import { priorityStyles, statusStyles, utilityStyles } from "../../utils/utilityDisplay";

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    complaintService
      .list()
      .then((data) => setComplaints(data.complaints))
      .catch(() => setError("Could not load complaints from the backend."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter((complaint) => {
        const query = search.trim().toLowerCase();

        if (!query) {
          return true;
        }

        return [complaint.token, complaint.title, complaint.area, complaint.type]
          .join(" ")
          .toLowerCase()
          .includes(query);
      }),
    [complaints, search],
  );

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 text-slate-950 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-5 flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-white"
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold">My Complaints</h1>
              <p className="mt-1 text-slate-600">All submitted utility service requests.</p>
            </div>
            <div className="flex items-center rounded-md border border-slate-300 bg-white px-3">
              <Search className="text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search token or area"
                className="w-full p-3 outline-none sm:w-64"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Complaint</th>
                  <th className="px-4 py-3">Utility</th>
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((complaint) => {
                  const style = utilityStyles[complaint.type];
                  const Icon = style.Icon;

                  return (
                    <tr
                      key={complaint.id}
                      onClick={() => navigate(`/complaints/${complaint.id}`)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-sky-50"
                    >
                      <td className="px-4 py-4 font-bold">{complaint.token}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{complaint.title}</p>
                        <p className="text-slate-500">{complaint.area}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${style.bg} ${style.text}`}>
                          <Icon size={16} />
                          {complaint.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">#{complaint.position}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 font-semibold ${priorityStyles[complaint.priority]}`}>
                          {complaint.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 font-semibold ${statusStyles[complaint.status]}`}>
                          {complaint.status}
                        </span>
                        {complaint.status === "Completed" && !complaint.review && (
                          <p className="mt-1 text-xs font-semibold text-sky-700">Review available</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {isLoading && <p className="p-4 text-slate-600">Loading complaints...</p>}
            {!isLoading && !filteredComplaints.length && (
              <p className="p-4 text-slate-600">No complaints found.</p>
            )}
            {error && <p className="p-4 font-semibold text-red-700">{error}</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
