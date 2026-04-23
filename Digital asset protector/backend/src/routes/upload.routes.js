const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth.middleware.js");
const runPython = require("../utils/runpython.js");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", auth, upload.single("file"), async (req, res) => {
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

module.exports = router;