import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import complaintRoutes from "./complaintRoutes.js";
import technicianRoutes from "./technicianRoutes.js";

import requestRoutes from "./requestRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "smart-utility-api" });
});

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/technicians", technicianRoutes);
router.use("/requests", requestRoutes);
router.use("/admin", adminRoutes);

export default router;
