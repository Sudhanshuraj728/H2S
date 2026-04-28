import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the Python detection engine against a file.
 * @param {string} filePath    - path to the uploaded file
 * @param {Array}  mongoAssets - MongoDB asset documents sent to Python via stdin.
 *                               Python uses these instead of assets.json, so MongoDB
 *                               is always the single source of truth.
 */
const runPython = (filePath, mongoAssets = []) => {
  return new Promise((resolve, reject) => {
    const projectRoot = path.resolve(__dirname, "../..");
    const logicDir = path.resolve(projectRoot, "../logic/detection_engine");
    const scriptPath = path.join(logicDir, "run_compare.py");
    const venvPython = path.resolve(projectRoot, "../logic/venv/Scripts/python.exe");
    const pythonExecutable = fs.existsSync(venvPython) ? venvPython : "python";
    const resolvedFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(projectRoot, filePath);

    const child = spawn(pythonExecutable, [scriptPath, resolvedFilePath], {
      cwd: logicDir,
    });

    let data = "";
    let stderrData = "";

    // Send MongoDB assets via stdin so Python has the live database
    if (mongoAssets && mongoAssets.length > 0) {
      child.stdin.write(JSON.stringify(mongoAssets));
    }
    child.stdin.end();

    child.on("error", (err) => {
      reject(new Error(`Python process failed to start: ${err.message}`));
    });

    child.stdout.on("data", (chunk) => { data += chunk.toString(); });
    child.stderr.on("data", (err) => { stderrData += err.toString(); });

    child.on("close", (code) => {
      if (code !== 0) {
        const trimmed = data.trim();
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed?.error) { reject(new Error(parsed.error)); return; }
        } catch { /* fall through */ }
        reject(new Error(stderrData || "Python comparison process failed"));
        return;
      }
      try {
        const trimmed = data.trim();
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
          reject(new Error("Invalid Python response"));
          return;
        }
        resolve(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        reject(new Error("Invalid Python response"));
      }
    });
  });
};

export default runPython;