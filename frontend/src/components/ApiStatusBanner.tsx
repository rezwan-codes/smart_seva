import { useEffect, useState } from "react";
import { Database, WifiOff } from "lucide-react";
import { healthService } from "../services/healthService";

export default function ApiStatusBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    healthService
      .check()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, []);

  if (isConnected === null) {
    return null;
  }

  if (isConnected) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        <Database size={16} />
        Connected to PostgreSQL via backend API
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      <WifiOff size={16} />
      Backend API is offline. Start it with `npm run dev` in the backend folder.
    </div>
  );
}
