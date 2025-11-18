import path from "path";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";
const uploadDir = isProduction
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default uploadDir;