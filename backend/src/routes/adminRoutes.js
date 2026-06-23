import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { parseEnum, toApiUser } from "../lib/formatters.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

const roles = ["CITIZEN", "TECHNICIAN", "ADMIN"];

router.get("/analytics", async (req, res, next) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      processingComplaints,
      completedComplaints,
      emergencyComplaints,
      activeTechnicians,
      complaintsByType,
      complaintsByArea,
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { status: "PROCESSING" } }),
      prisma.complaint.count({ where: { status: "COMPLETED" } }),
      prisma.complaint.count({ where: { priority: "EMERGENCY" } }),
      prisma.technician.count({ where: { status: "ACTIVE" } }),
      prisma.complaint.groupBy({ by: ["type"], _count: true }),
      prisma.complaint.groupBy({ by: ["area"], _count: true, orderBy: { _count: { area: "desc" } } }),
    ]);

    res.json({
      totals: {
        totalComplaints,
        pendingComplaints,
        processingComplaints,
        completedComplaints,
        emergencyComplaints,
        activeTechnicians,
      },
      complaintsByType,
      complaintsByArea,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const where = req.query.role ? { role: parseEnum(req.query.role, roles) } : undefined;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        technician: {
          select: {
            id: true,
            skill: true,
            status: true,
            area: true,
            distanceKm: true,
            etaMinutes: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users: users.map(toApiUser) });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const normalizedRole = parseEnum(role, roles, "CITIZEN");

    const user = await prisma.user.update({
      where: { id },
      data: { role: normalizedRole },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        technician: {
          select: {
            id: true,
            skill: true,
            status: true,
            area: true,
            distanceKm: true,
            etaMinutes: true,
            rating: true,
          },
        },
      },
    });

    res.json({ user: toApiUser(user) });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.technician.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(error);
  }
});

export default router;
