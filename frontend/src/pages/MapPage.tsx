import { useEffect, useMemo, useState } from "react";
import MapTracker from "../components/map/MapTracker";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { authService } from "../services/authService";
import { complaintService } from "../services/complaintService";
import { technicianService } from "../services/technicianService";
import type { Complaint, Technician, User } from "../types/utility";
import { buildComplaintMapLocations } from "../utils/mapLocations";
import type { MapLocation } from "../components/map/MapTracker";

export default function MapPage() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const liveLocation = useLiveLocation();

  useEffect(() => {
    Promise.all([authService.me(), complaintService.list(), technicianService.list()])
      .then(([userData, complaintData, technicianData]) => {
        setUser(userData.user);
        setComplaints(complaintData.complaints);
        setTechnicians(technicianData.technicians);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    buildComplaintMapLocations(complaints)
      .then(setMapLocations)
      .catch(() => {});
  }, [complaints]);

  const technicianLocations = useMemo(
    () =>
      technicians
        .filter(
          (technician) =>
            typeof technician.latitude === "number" &&
            typeof technician.longitude === "number",
        )
        .map((technician) => ({
          id: technician.id,
          name: technician.name,
          lat: technician.latitude as number,
          lng: technician.longitude as number,
          status: technician.status,
        })),
    [technicians],
  );

  const backPath =
    user?.role === "Admin" ? "/admin/dashboard" : user?.role === "Technician" ? "/technician/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 px-5 py-4 text-white shadow-sm sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to={backPath}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <h1 className="mb-4 text-2xl font-bold">Live Map</h1>
        <p className="mb-4 text-slate-600">Track active complaints, emergency areas, your account location, and technician positions.</p>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <MapTracker
            height="500px"
            locations={mapLocations}
            userLocation={liveLocation.location}
            technicianLocations={technicianLocations}
            initialLocation={liveLocation.location ?? { lat: 23.8103, lng: 90.4125 }}
            onLocationSelect={setSelectedLocation}
          />

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Emergency</span>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">High</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Normal</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">Your location</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Technician</span>
          </div>

          {selectedLocation && (
            <div className="mt-4 rounded-md bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">Selected Location:</p>
              <p className="mt-1 text-slate-700">
                Latitude: {selectedLocation.lat.toFixed(6)}, Longitude: {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
