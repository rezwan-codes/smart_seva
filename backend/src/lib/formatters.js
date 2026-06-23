const enumToTitle = (value) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const toApiUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: enumToTitle(user.role),
  technician: user.technician
    ? {
        id: user.technician.id,
        skill: enumToTitle(user.technician.skill),
        status: enumToTitle(user.technician.status),
        area: user.technician.area,
        distanceKm: user.technician.distanceKm,
        etaMinutes: user.technician.etaMinutes,
        rating: user.technician.rating,
      }
    : null,
});

export const toApiTechnician = (technician) => ({
  id: technician.id,
  name: technician.user.name,
  email: technician.user.email,
  phone: technician.user.phone,
  skill: enumToTitle(technician.skill),
  status: enumToTitle(technician.status),
  area: technician.area,
  distanceKm: technician.distanceKm,
  etaMinutes: technician.etaMinutes,
  rating: technician.rating,
});

export const toApiReview = (review) => ({
  id: review.id,
  complaintId: review.complaintId,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  citizenName: review.citizen?.name,
});

export const toApiRequest = (request) => ({
  id: request.id,
  complaintId: request.complaintId,
  technicianId: request.technicianId,
  type: enumToTitle(request.type),
  message: request.message,
  status: enumToTitle(request.status),
  adminNote: request.adminNote,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  complaint: request.complaint
    ? {
        id: request.complaint.id,
        token: request.complaint.token,
        title: request.complaint.title,
        area: request.complaint.area,
        type: enumToTitle(request.complaint.type),
        status: enumToTitle(request.complaint.status),
        priority: enumToTitle(request.complaint.priority),
      }
    : undefined,
  technician: request.technician ? toApiTechnician(request.technician) : undefined,
});

export const toApiComplaint = (complaint) => ({
  id: complaint.id,
  token: complaint.token,
  title: complaint.title,
  description: complaint.description,
  type: enumToTitle(complaint.type),
  area: complaint.area,
  address: complaint.address,
  status: enumToTitle(complaint.status),
  priority: enumToTitle(complaint.priority),
  position: complaint.position,
  photo: complaint.photo,
  photoUrl: complaint.photo ? `http://localhost:5000${complaint.photo}` : null,
  createdAt: complaint.createdAt,
  updatedAt: complaint.updatedAt,
  citizen: complaint.citizen ? toApiUser(complaint.citizen) : undefined,
  technician: complaint.technician ? toApiTechnician(complaint.technician) : null,
  statusHistory: complaint.statusHistory ?? [],
  review: complaint.review ? toApiReview(complaint.review) : null,
});

export const parseEnum = (value, allowed, fallback) => {
  const normalized = String(value ?? fallback)
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

  return allowed.includes(normalized) ? normalized : fallback;
};
