import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import fs from "fs";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { upload } from "./lib/multer.js";
import routes from "./routes/index.js";

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);
