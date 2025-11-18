// controllers/mediaController.js
import fs from "fs/promises";
import path from "path";
import xxhashWasm from "xxhash-wasm";
import uploadDir from "../utils/uploadPath.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let hasher = null;
xxhashWasm().then((instance) => {
  hasher = instance;
});

const tempDir = path.join(uploadDir, "temp");
await fs.mkdir(tempDir, { recursive: true }).catch(() => {});

export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/\s+/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "video/mp4",
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});
export const getMediaHash = async (req, res) => {

    const tempFilePath = req.file?.path; 

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const fileBuffer = await fs.readFile(tempFilePath);
        const fileString = fileBuffer.toString("latin1");

        if (!hasher) {
            hasher = await xxhashWasm();
        }
        const hash = hasher.h64(fileString).toString();

        await fs.unlink(tempFilePath).catch(() => {});

        res.status(200).json({
            hash: hash,
            mimeType: req.file.mimetype,
            size: req.file.size,
            filename: req.file.originalname,
        });
    } catch (error) {
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => {});
        }
        console.error("Hashing error:", error);
        res.status(500).json({ message: "Server error during hashing" });
    }
};
export const uploadMedia = async (req, res) => {
    const tempFilePath = req.file?.path;

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { restaurantId, type, hash } = req.query; 
        if (!type || !hash) {
            await fs.unlink(tempFilePath).catch(() => {});
            return res.status(400).json({ message: "Missing type or hash in query" });
        }

        const safeName = req.file.originalname.replace(/\s+/g, "_");
        const filename = `${Date.now()}-${safeName}`; 

        const folderPath = restaurantId
            ? path.join(uploadDir, `restaurant_${restaurantId}`, type.trim())
            : path.join(uploadDir, "media", "shared", type.trim());

        await fs.mkdir(folderPath, { recursive: true });

        const finalFilePath = path.join(folderPath, filename);
        await fs.copyFile(tempFilePath, finalFilePath); 

        await fs.unlink(tempFilePath).catch(() => {}); 

        const fileUrl = restaurantId
            ? `uploads/restaurant_${restaurantId}/${type.trim()}/${filename}`
            : `uploads/media/shared/${type.trim()}/${filename}`;

        res.status(201).json({
            url: fileUrl,
            mimeType: req.file.mimetype,
            size: req.file.size,
            hash: hash, 
            filename: filename,
        });
    } catch (error) {
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => {}); 
        }
        console.error("Upload error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const uploadMultipleMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const { restaurantId, type } = req.query;
    if (!type) {
      return res.status(400).json({ message: "Missing type" });
    }

    const results = [];

    for (const file of req.files) {
      const tempFilePath = file.path;
      let result = { filename: file.originalname, success: false };

      try {
        const fileBuffer = await fs.readFile(tempFilePath);
        const fileString = fileBuffer.toString("latin1");

        if (!hasher) {
          hasher = await xxhashWasm();
        }
        const hash = hasher.h64(fileString).toString();
        const safeName = file.originalname.replace(/\s+/g, "_");
        const filename = `${Date.now()}-${safeName}`;

        const folderPath = restaurantId
          ? path.join(uploadDir, `restaurant_${restaurantId}`, type.trim())
          : path.join(uploadDir, "media", "shared", type.trim());

        await fs.mkdir(folderPath, { recursive: true });

        const finalFilePath = path.join(folderPath, filename);
        await fs.copyFile(tempFilePath, finalFilePath);

        await fs.unlink(tempFilePath).catch(() => {});

        const fileUrl = restaurantId
          ? `uploads/restaurant_${restaurantId}/${type.trim()}/${filename}`
          : `uploads/media/shared/${type.trim()}/${filename}`;

        result = {
          url: fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          hash: hash,
          filename: filename,
          type: type.trim(),
          success: true,
        };
        results.push(result);
      } catch (fileError) {
        if (tempFilePath) {
          await fs.unlink(tempFilePath).catch(() => {});
        }
        result.error = fileError.message;
        result.success = false;
        results.push(result);
      }
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    res.status(201).json({
      message: `${successfulCount} files uploaded, ${failedCount} failed.`,
      results,
    });
  } catch (error) {
    console.error("Multi-upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteFile = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "Missing file URL" });
  }
  try {
    const filePath = path.join(uploadDir, url);
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn(`File not found or could not be deleted: ${url}`);
    }
    res.json({ message: "Physical media file deletion request processed." });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export default upload;
