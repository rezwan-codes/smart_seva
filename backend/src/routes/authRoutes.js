import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { parseEnum, toApiUser } from "../lib/formatters.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const roles = ["CITIZEN", "TECHNICIAN", "ADMIN"];
const utilityTypes = ["WATER", "GAS", "ELECTRICITY"];

const signToken = (user) =>
  jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role, skill, area } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedRole = parseEnum(role, roles, "CITIZEN");
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone,
        role: normalizedRole,
        technician:
          normalizedRole === "TECHNICIAN"
            ? {
                create: {
                  skill: parseEnum(skill, utilityTypes, "ELECTRICITY"),
                  area,
                  etaMinutes: 20,
                  distanceKm: 1.5,
                },
              }
            : undefined,
      },
      include: { technician: true },
    });

    res.status(201).json({ user: toApiUser(user), token: signToken(user) });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email is already registered" });
    }

    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: String(email ?? "").toLowerCase() },
      include: { technician: true },
    });

    if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ user: toApiUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toApiUser(req.user) });
});

router.patch("/location", requireAuth, async (req, res, next) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        latitude,
        longitude,
        locationUpdatedAt: new Date(),
        technician:
          req.user.role === "TECHNICIAN" && req.user.technician
            ? {
                update: {
                  latitude,
                  longitude,
                  locationUpdatedAt: new Date(),
                },
              }
            : undefined,
      },
      include: { technician: true },
    });

    res.json({ user: toApiUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
