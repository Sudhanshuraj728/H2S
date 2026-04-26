import express from "express";
import multer from "multer";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { uploadFile } from "../controllers/upload.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", verifyJWT, upload.single("file"), uploadFile);

export default router;