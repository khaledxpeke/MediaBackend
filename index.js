import "./config/loadEnv.js";
import express from "express";
import upload from "./config/multerConfig.js";
import uploadDir from "./utils/uploadPath.js";
import cors from "cors";
import mediaRoutes from "./routes/mediaRoutes.js";

const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
    exposedHeaders: ["Content-Type", "Authorization"],
  })
);

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const baseUrl =
    process.env.BASE_URL ||
    (isProduction
      ? "https://media.yourdomain.com"
      : "http://localhost:4000");

  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});
app.use("/api/media", mediaRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(uploadDir));
  console.log("Serving uploads locally at /uploads");
}

app.listen(4000, () => {
  console.log("📸 Media server running on port 4000");
  console.log(`Uploads directory: ${uploadDir}`);
});
