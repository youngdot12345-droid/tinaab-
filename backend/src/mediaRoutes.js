import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { getUserFromToken } from "./services/authService.js";

const uploadDir = path.resolve(process.env.MEDIA_STORAGE_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"]
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + "." + allowed.get(file.mimetype))
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype))
});

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export function registerMediaRoutes(app) {
  app.post("/api/media/upload", (req, res, next) => {
    upload.single("file")(req, res, async (error) => {
      try {
        if (error) {
          return res.status(400).json({ ok: false, reason: error.code === "LIMIT_FILE_SIZE" ? "Media file is larger than 50 MB." : "Unsupported media upload." });
        }
        const user = await getUserFromToken(readBearerToken(req));
        if (!user) return res.status(401).json({ ok: false, reason: "Authentication required." });
        if (!req.file) return res.status(400).json({ ok: false, reason: "Choose an image or video file." });

        const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
        res.status(201).json({
          ok: true,
          mediaUrl: "/uploads/" + req.file.filename,
          mediaType,
          originalName: req.file.originalname,
          size: req.file.size
        });
      } catch (err) {
        if (req.file?.path) fs.rmSync(req.file.path, { force: true });
        next(err);
      }
    });
  });
}
