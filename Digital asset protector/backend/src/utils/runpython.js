import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runPython = (filePath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../detection_py/main.py");

    const child = spawn("python", [scriptPath, filePath]);

    let data = "";

    child.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    child.stderr.on("data", (err) => {
      console.error("PYTHON ERROR:", err.toString());
    });

    child.on("close", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject("Invalid Python response");
      }
    });
  });
};

export default runPython;