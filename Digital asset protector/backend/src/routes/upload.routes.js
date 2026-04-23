import express from "express";
import multer from "multer";
import fs from "fs";
import { verifyJWT } from "../middleware/auth.middleware.js";
import runPython from "../utils/runpython.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", verifyJWT, upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const result = await runPython(filePath);

    // DELETE FILE AFTER PROCESSING (IMPORTANT)
    fs.unlinkSync(filePath);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

export default router;