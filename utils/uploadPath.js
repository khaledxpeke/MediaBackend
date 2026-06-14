import "../config/loadEnv.js";
import path from "path";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";
const uploadDir = isProduction
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");

if (isProduction && !uploadDir) {
  throw new Error(
    "UPLOAD_DIR is missing. Set it in .env.production and start with NODE_ENV=production."
  );
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default uploadDir;
