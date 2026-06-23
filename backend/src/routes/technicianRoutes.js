import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { parseEnum, toApiTechnician } from "../lib/formatters.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const statuses = ["ACTIVE", "BUSY", "OFFLINE"];

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const technicians = await prisma.technician.findMany({
      include: { user: true },
      orderBy: [{ status: "asc" }, { rating: "desc" }],
    });

    res.json({ technicians: technicians.map(toApiTechnician) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireRole("ADMIN", "TECHNICIAN"), async (req, res, next) => {
  try {
    const technicianId = req.user.role === "TECHNICIAN" ? req.user.technician?.id : req.params.id;

    const technician = await prisma.technician.update({
      where: { id: technicianId },
      data: { status: parseEnum(req.body.status, statuses, "ACTIVE") },
      include: { user: true },
    });

    res.json({ technician: toApiTechnician(technician) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const technician = await prisma.technician.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    const activeComplaints = await prisma.complaint.count({
      where: {
        technicianId: id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (activeComplaints > 0) {
      return res.status(400).json({ message: "Cannot delete technician with active complaints" });
    }

    await prisma.technician.delete({ where: { id } });

    res.json({ message: "Technician deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
