import dotenv from "dotenv";
import { app } from "./app.js";
import { connectDB } from "./config/database.js";
import { syncPythonDbToMongo } from "./utils/syncPythonDbToMongo.js";

dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 8000;

connectDB()
    .then(async () => {
        // Merge Python detection DB assets into MongoDB so both are in sync
        await syncPythonDbToMongo();

        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    });

// ye approach isliye use kiya taaki server tab hi start ho jab database properly connected ho
// agar database nhi connect h tab server hi nhi chalega bekar

