import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const toTechnicianConversation = (conversation) => ({
  id: conversation.id,
  technician: {
    id: conversation.technician.id,
    name: conversation.technician.user.name,
    skill: conversation.technician.skill,
    status: conversation.technician.status,
    phone: conversation.technician.user.phone,
    locationUpdatedAt: conversation.technician.locationUpdatedAt,
  },
  updatedAt: conversation.updatedAt,
});

const toCitizenConversation = (conversation, complaint) => ({
  id: conversation.id,
  citizen: {
    id: conversation.citizen.id,
    name: conversation.citizen.name,
    email: conversation.citizen.email,
    phone: conversation.citizen.phone,
  },
  complaint: complaint
    ? {
        id: complaint.id,
        token: complaint.token,
        title: complaint.title,
        status: complaint.status,
        priority: complaint.priority,
        area: complaint.area,
      }
    : null,
  updatedAt: conversation.updatedAt,
});

router.get("/conversations", async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === "CITIZEN") {
      const conversations = await prisma.conversation.findMany({
        where: { citizenId: user.id },
        include: {
          technician: {
            include: { user: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      res.json({
        conversations: conversations.map(toTechnicianConversation),
      });
      return;
    }

    if (user.role === "TECHNICIAN") {
      const conversations = await prisma.conversation.findMany({
        where: { technicianId: user.technician.id },
        include: {
          citizen: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      const activeComplaints = await prisma.complaint.findMany({
        where: {
          technicianId: user.technician.id,
          citizenId: { in: conversations.map((conversation) => conversation.citizenId) },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      res.json({
        conversations: conversations.map((conversation) =>
          toCitizenConversation(
            conversation,
            activeComplaints.find((complaint) => complaint.citizenId === conversation.citizenId),
          ),
        ),
      });
      return;
    }

    res.json({ conversations: [] });
  } catch (error) {
    next(error);
  }
});

router.post("/conversations", async (req, res, next) => {
  try {
    const { technicianId } = req.body;
    const user = req.user;

    if (user.role !== "CITIZEN") {
      return res.status(403).json({ message: "Only citizens can start conversations" });
    }

    if (!technicianId) {
      return res.status(400).json({ message: "technicianId is required" });
    }

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { user: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        citizenId: user.id,
        technicianId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          citizenId: user.id,
          technicianId,
        },
      });
    }

    res.status(201).json({
      conversation: {
        id: conversation.id,
        technician: {
          id: technician.id,
          name: technician.user.name,
          skill: technician.skill,
          status: technician.status,
          phone: technician.user.phone,
        },
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/complaints/:complaintId/conversation", async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const user = req.user;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        technician: { include: { user: true } },
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!complaint.technicianId || !complaint.technician) {
      return res.status(400).json({ message: "This complaint does not have an assigned technician yet" });
    }

    const canChat =
      (user.role === "CITIZEN" && complaint.citizenId === user.id) ||
      (user.role === "TECHNICIAN" && complaint.technicianId === user.technician?.id);

    if (!canChat) {
      return res.status(403).json({ message: "You can only chat for complaints assigned to you" });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        citizenId: complaint.citizenId,
        technicianId: complaint.technicianId,
      },
      include: {
        technician: { include: { user: true } },
        citizen: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          citizenId: complaint.citizenId,
          technicianId: complaint.technicianId,
        },
        include: {
          technician: { include: { user: true } },
          citizen: true,
        },
      });
    }

    res.status(201).json({
      conversation:
        user.role === "TECHNICIAN"
          ? toCitizenConversation(conversation, complaint)
          : toTechnicianConversation(conversation),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/conversations/:conversationId/messages", async (req, res, next) => {
  try {
    const user = req.user;
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (
      (user.role === "CITIZEN" && conversation.citizenId !== user.id) ||
      (user.role === "TECHNICIAN" && conversation.technicianId !== user.technician.id)
    ) {
      return res.status(403).json({ message: "You do not have access to this conversation" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        text: message.text,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/conversations/:conversationId/messages", async (req, res, next) => {
  try {
    const user = req.user;
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (
      (user.role === "CITIZEN" && conversation.citizenId !== user.id) ||
      (user.role === "TECHNICIAN" && conversation.technicianId !== user.technician.id)
    ) {
      return res.status(403).json({ message: "You do not have access to this conversation" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        senderRole: user.role,
        text: text.trim(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({
      message: {
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        text: message.text,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
