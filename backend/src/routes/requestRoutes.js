import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { parseEnum, toApiRequest } from "../lib/formatters.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const requestTypes = ["ASSIGNMENT", "HELP", "REASSIGN", "OTHER"];
const requestStatuses = ["PENDING", "APPROVED", "REJECTED"];

const requestInclude = {
  complaint: {
    include: {
      citizen: true,
      technician: { include: { user: true } },
    },
  },
  technician: { include: { user: true } },
};

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : { technicianId: req.user.technician?.id };

    const requests = await prisma.technicianRequest.findMany({
      where,
      include: requestInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    res.json({ requests: requests.map(toApiRequest) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("TECHNICIAN", "ADMIN"), async (req, res, next) => {
  try {
    let technicianId = req.user.technician?.id;
    const { complaintId, type, message, technicianId: adminTechnicianId } = req.body;

    if (req.user.role === "ADMIN") {
      if (!adminTechnicianId) {
        return res.status(400).json({ message: "technicianId is required for admin requests" });
      }
      technicianId = adminTechnicianId;
    } else {
      if (!technicianId) {
        return res.status(403).json({ message: "Technician profile not found" });
      }
    }

    if (!complaintId || !message?.trim()) {
      return res.status(400).json({ message: "complaintId and message are required" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.status === "COMPLETED" || complaint.status === "CANCELLED") {
      return res.status(400).json({ message: "Cannot request admin help for a closed complaint" });
    }

    const requestType = parseEnum(type, requestTypes, "ASSIGNMENT");

    if (requestType === "ASSIGNMENT" && complaint.technicianId) {
      return res.status(400).json({ message: "This job is already assigned to a technician" });
    }

    const existingPending = await prisma.technicianRequest.findFirst({
      where: {
        complaintId,
        technicianId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return res.status(409).json({ message: "You already have a pending request for this job" });
    }

    const request = await prisma.technicianRequest.create({
      data: {
        complaintId,
        technicianId,
        type: requestType,
        message: message.trim(),
      },
      include: requestInclude,
    });

    res.status(201).json({ request: toApiRequest(request) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("ADMIN", "TECHNICIAN"), async (req, res, next) => {
  try {
    const status = parseEnum(req.body.status, requestStatuses, "PENDING");
    const adminNote = req.body.adminNote?.trim() || null;

    if (status === "PENDING") {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    const existing = await prisma.technicianRequest.findUnique({
      where: { id: req.params.id },
      include: { complaint: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (existing.status !== "PENDING") {
      return res.status(409).json({ message: "This request has already been handled" });
    }

    if (req.user.role === "TECHNICIAN") {
      if (existing.technicianId !== req.user.technician?.id) {
        return res.status(403).json({ message: "You can only respond to requests targeting you" });
      }
      if (existing.type !== "ASSIGNMENT") {
        return res.status(400).json({ message: "You can only respond to assignment requests" });
      }
    }

    const request = await prisma.technicianRequest.update({
      where: { id: req.params.id },
      data: { status, adminNote },
      include: requestInclude,
    });

    if (status === "APPROVED") {
      if (existing.type === "ASSIGNMENT" && !existing.complaint.technicianId) {
        await prisma.complaint.update({
          where: { id: existing.complaintId },
          data: {
            technicianId: existing.technicianId,
            status: "PROCESSING",
            statusHistory: {
              create: {
                status: "PROCESSING",
                note: req.user.role === "TECHNICIAN"
                  ? "Technician accepted assignment request"
                  : "Technician assigned after admin approved request",
              },
            },
          },
        });

        await prisma.technician.update({
          where: { id: existing.technicianId },
          data: { status: "BUSY" },
        });
      } else if (existing.type === "REASSIGN") {
        await prisma.complaint.update({
          where: { id: existing.complaintId },
          data: {
            technicianId: null,
            status: "PENDING",
            statusHistory: {
              create: {
                status: "PENDING",
                note: "Technician reassignment approved by admin",
              },
            },
          },
        });

        await prisma.technician.update({
          where: { id: existing.technicianId },
          data: { status: "ACTIVE" },
        });
      } else {
        await prisma.complaint.update({
          where: { id: existing.complaintId },
          data: {
            statusHistory: {
              create: {
                status: existing.complaint.status,
                note: `Admin approved technician request: ${existing.message}`,
              },
            },
          },
        });
      }
    }

    res.json({ request: toApiRequest(request) });
  } catch (error) {
    next(error);
  }
});

export default router;
