import { exec } from "child_process";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import path from "path";

export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    const filePath = req.file.path;
    console.log(`[Upload API] Token received from user: ${req.user.email}`);
    console.log(`[Upload API] File saved to: ${filePath}`);

    // Assuming the backend is in c:/Users/praty/Downloads/h2s/Digital asset protector/backend
    // the root (h2s) is ../../.. relative to the backend src path.
    const cwdPath = path.resolve(req.file.destination, "../.."); 
    const pythonPath = path.join(cwdPath, "detection_py/venv/Scripts/python.exe");
    const command = `"${pythonPath}" detection_py/main.py "${filePath}"`;

    console.log(`[Upload API] Executing command: ${command} in cwd: ${cwdPath}`);

    exec(command, { cwd: cwdPath }, (error, stdout, stderr) => {
        console.log(`[Upload API] Python Script Output:`, stdout);
        if (error) {
            console.error(`[Upload API] Execution Error:`, error);
            console.error(`[Upload API] Stderr:`, stderr);
            
            // Fallback: try global python if venv python fails
            console.log("[Upload API] Falling back to global python...");
            const fallbackCommand = `python detection_py/main.py "${filePath}"`;
            exec(fallbackCommand, { cwd: cwdPath }, (error2, stdout2, stderr2) => {
                if (error2) {
                    console.error(`[Upload API] Fallback Error:`, error2);
                    return res.status(500).json({ error: "Detection failed" });
                }
                processOutput(stdout2);
            });
            return;
        }

        processOutput(stdout);

        function processOutput(outStr) {
            try {
                // Look for JSON in the output
                const jsonMatch = outStr.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error("[Upload API] No JSON found in output.");
                    return res.status(500).json({ error: "Detection failed: No valid JSON output" });
                }
                const result = JSON.parse(jsonMatch[0]);
                return res.status(200).json(result);
            } catch (err) {
                console.error("[Upload API] JSON parsing error:", err);
                return res.status(500).json({ error: "Detection failed to parse result" });
            }
        }
    });
});
