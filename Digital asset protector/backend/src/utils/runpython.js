const { spawn } = require("child_process");
const path = require("path");

const runPython = (filePath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../detection_py/main.py");

    const process = spawn("python", [scriptPath, filePath]);

    let data = "";

    process.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    process.stderr.on("data", (err) => {
      console.error("PYTHON ERROR:", err.toString());
    });

    process.on("close", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject("Invalid Python response");
      }
    });
  });
};

module.exports = runPython;