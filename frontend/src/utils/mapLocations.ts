import type { Complaint } from "../types/utility";
import type { MapLocation } from "../components/map/MapTracker";
import { buildAreaIssues } from "./utilityDisplay";
import { geocodeAddress } from "./geocode";

export async function buildComplaintMapLocations(complaints: Complaint[]) {
  const activeComplaints = complaints.filter((complaint) => complaint.status !== "Completed");
  const locations: MapLocation[] = activeComplaints
    .filter(
      (complaint) =>
        typeof complaint.latitude === "number" && typeof complaint.longitude === "number",
    )
    .map((complaint) => ({
      lat: complaint.latitude as number,
      lng: complaint.longitude as number,
      label: `${complaint.token} - ${complaint.area}`,
      severity: complaint.priority,
      description: `${complaint.type} - ${complaint.status}`,
    }));

  const locatedAreas = new Set(locations.map((location) => location.label.split(" - ").at(-1)));
  const areaIssues = buildAreaIssues(
    activeComplaints.filter((complaint) => !locatedAreas.has(complaint.area)),
  );
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !areaIssues.length) {
    return locations;
  }

  const areaLocations = await Promise.all(
    areaIssues.map((issue) =>
      geocodeAddress(`${issue.area}, Dhaka, Bangladesh`, apiKey).then((coords) => {
        if (!coords) return null;
        return {
          lat: coords.lat,
          lng: coords.lng,
          label: issue.area,
          severity: issue.severity,
          description: `${issue.type} - ${issue.affected} active`,
        } as MapLocation;
      }),
    ),
  );

  return [...locations, ...areaLocations.filter((location): location is MapLocation => location !== null)];
}
