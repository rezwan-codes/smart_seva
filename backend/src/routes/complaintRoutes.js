import { Router } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { createUniqueComplaintToken } from "../lib/tokens.js";
import { parseEnum, toApiComplaint } from "../lib/formatters.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../lib/multer.js";

const router = Router();
const utilityTypes = ["WATER", "GAS", "ELECTRICITY"];
const priorities = ["NORMAL", "HIGH", "EMERGENCY"];
const statuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"];

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : undefined;
};

const complaintInclude = {
  citizen: { include: { technician: true } },
  technician: { include: { user: true } },
  statusHistory: { orderBy: { createdAt: "desc" } },
  review: { include: { citizen: true } },
};

async function refreshTechnicianRating(technicianId) {
  const aggregate = await prisma.review.aggregate({
    where: { technicianId },
    _avg: { rating: true },
  });

  await prisma.technician.update({
    where: { id: technicianId },
    data: { rating: aggregate._avg.rating ?? 5 },
  });
}

router.use(requireAuth);

  router.get("/", async (req, res, next) => {
    try {
      const where =
        req.user.role === "ADMIN"
          ? {}
          : req.user.role === "TECHNICIAN"
            ? { technicianId: req.user.technician?.id, status: { not: "PENDING" } }
            : { citizenId: req.user.id };

      const complaints = await prisma.complaint.findMany({
        where,
        include: complaintInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      res.json({ complaints: complaints.map(toApiComplaint) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/open-jobs", requireRole("TECHNICIAN"), async (req, res, next) => {
    try {
      const technician = req.user.technician;

      if (!technician) {
        return res.status(403).json({ message: "Technician profile not found" });
      }

      const complaints = await prisma.complaint.findMany({
        where: {
          type: technician.skill,
          status: "PENDING",
          OR: [{ technicianId: null }, { technicianId: technician.id }],
        },
        include: complaintInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      res.json({ complaints: complaints.map(toApiComplaint) });
    } catch (error) {
      next(error);
    }
  });

router.post(
  "/",
  requireRole("CITIZEN", "ADMIN"),
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const { title, description, type, area, address, priority } = req.body;

      if (!title || !description || !area) {
        return res.status(400).json({ message: "Title, description, and area are required" });
      }

      const complaintType = parseEnum(type, utilityTypes, "ELECTRICITY");
      const complaintPriority = parseEnum(priority, priorities, "NORMAL");
      const openCount = await prisma.complaint.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      });
      const token = await createUniqueComplaintToken(prisma);

      const technician = await prisma.technician.findFirst({
        where: { skill: complaintType, status: "ACTIVE" },
        orderBy: [{ rating: "desc" }, { createdAt: "asc" }],
      });

      const photo = req.file ? `/uploads/${req.file.filename}` : null;

      const complaint = await prisma.complaint.create({
        data: {
          token,
          title,
          description,
          type: complaintType,
          area,
          address,
          latitude: parseCoordinate(req.body.latitude),
          longitude: parseCoordinate(req.body.longitude),
          priority: complaintPriority,
          position: openCount + 1,
          citizenId: req.user.id,
          technicianId: technician?.id,
          photo,
          status: "PENDING",
          statusHistory: {
            create: {
              status: "PENDING",
              note: technician ? "Complaint submitted: technician matched, awaiting confirmation" : "Complaint submitted",
            },
          },
        },
        include: complaintInclude,
      });

      res.status(201).json({ complaint: toApiComplaint(complaint) });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: complaintInclude,
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const canView =
      req.user.role === "ADMIN" ||
      complaint.citizenId === req.user.id ||
      complaint.technicianId === req.user.technician?.id ||
      (req.user.role === "TECHNICIAN" &&
        !complaint.technicianId &&
        complaint.type === req.user.technician?.skill &&
        ["PENDING", "PROCESSING"].includes(complaint.status));

    if (!canView) {
      return res.status(403).json({ message: "You do not have permission to view this complaint" });
    }

    res.json({ complaint: toApiComplaint(complaint) });
  } catch (error) {
    next(error);
  }
});

  router.patch("/:id/confirm", requireRole("TECHNICIAN"), async (req, res, next) => {
    try {
      const existing = await prisma.complaint.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Complaint not found" });
      }

      if (existing.technicianId !== req.user.technician?.id) {
        return res.status(403).json({ message: "You can only confirm complaints assigned to you" });
      }

      if (existing.status !== "PENDING") {
        return res.status(400).json({ message: "This complaint is not pending confirmation" });
      }

      const complaint = await prisma.complaint.update({
        where: { id: req.params.id },
        data: {
          status: "PROCESSING",
          statusHistory: {
            create: {
              status: "PROCESSING",
              note: "Technician confirmed assignment",
            },
          },
        },
        include: complaintInclude,
      });

      await prisma.technician.update({
        where: { id: existing.technicianId },
        data: { status: "BUSY" },
      });

      res.json({ complaint: toApiComplaint(complaint) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/status", requireRole("ADMIN", "TECHNICIAN"), async (req, res, next) => {
  try {
    const existing = await prisma.complaint.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (
      req.user.role === "TECHNICIAN" &&
      existing.technicianId !== req.user.technician?.id
    ) {
      return res.status(403).json({ message: "You can only update complaints assigned to you" });
    }

    const status = parseEnum(req.body.status, statuses, "PENDING");
    const note =
      req.body.note ||
      (status === "COMPLETED" ? "Work completed by technician" : undefined);

    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note,
          },
        },
      },
      include: complaintInclude,
    });

    if (status === "COMPLETED" && existing.technicianId) {
      await prisma.technician.update({
        where: { id: existing.technicianId },
        data: { status: "ACTIVE" },
      });
    }

    res.json({ complaint: toApiComplaint(complaint) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/assign", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({ message: "technicianId is required" });
    }

    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: {
        technicianId,
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            note: "Technician assigned by admin",
          },
        },
      },
      include: complaintInclude,
    });

    res.json({ complaint: toApiComplaint(complaint) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/review", requireRole("CITIZEN"), async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: { review: true },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.citizenId !== req.user.id) {
      return res.status(403).json({ message: "You can only review your own complaints" });
    }

    if (complaint.status !== "COMPLETED") {
      return res.status(400).json({ message: "You can only review completed work" });
    }

    if (!complaint.technicianId) {
      return res.status(400).json({ message: "No technician was assigned to this complaint" });
    }

    if (complaint.review) {
      return res.status(409).json({ message: "You have already submitted a review for this complaint" });
    }

    const review = await prisma.review.create({
      data: {
        complaintId: complaint.id,
        citizenId: req.user.id,
        technicianId: complaint.technicianId,
        rating: numericRating,
        comment: comment?.trim() || null,
      },
      include: { citizen: true },
    });

    await refreshTechnicianRating(complaint.technicianId);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint.id },
      include: complaintInclude,
    });

    res.status(201).json({ complaint: toApiComplaint(updated), review });
  } catch (error) {
    next(error);
  }
});

export default router;
