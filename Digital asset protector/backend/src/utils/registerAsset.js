import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registers a newly protected asset into the Python detection database.
 * This ensures future uploads of the same (or similar/cropped) image
 * are detected as duplicates instead of being treated as new assets.
 *
 * @param {string} filePath - absolute path to the image file
 * @param {string} assetId  - the MongoDB asset ID (used as Python DB key)
 * @param {string} originalFilename - the original filename
 * @returns {Promise<object>} - registration result from Python
 */
const registerAsset = (filePath, assetId, originalFilename) => {
  return new Promise((resolve) => {
    const projectRoot = path.resolve(__dirname, "../..");
    const logicDir = path.resolve(projectRoot, "../logic/detection_engine");
    const scriptPath = path.join(logicDir, "register_asset.py");
    const venvPython = path.resolve(projectRoot, "../logic/venv/Scripts/python.exe");
    const pythonExecutable = fs.existsSync(venvPython) ? venvPython : "python";

    const resolvedFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(projectRoot, filePath);

    const args = [scriptPath, resolvedFilePath];
    if (assetId) args.push(String(assetId));
    if (originalFilename) args.push(originalFilename);

    const child = spawn(pythonExecutable, args, { cwd: logicDir });

    let data = "";
    let stderrData = "";

    child.stdout.on("data", (chunk) => { data += chunk.toString(); });
    child.stderr.on("data", (err) => { stderrData += err.toString(); });

    child.on("error", (err) => {
      console.error("[registerAsset] spawn error:", err.message);
      resolve({ registered: false, error: err.message });
    });

    child.on("close", () => {
      try {
        const trimmed = data.trim();
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start !== -1 && end > start) {
          resolve(JSON.parse(trimmed.slice(start, end + 1)));
        } else {
          resolve({ registered: false, error: "No JSON output" });
        }
      } catch {
        console.error("[registerAsset] parse error. stderr:", stderrData);
        resolve({ registered: false, error: stderrData || "Parse error" });
      }
    });
  });
};

export default registerAsset;
