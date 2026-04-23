import dotenv from "dotenv";
import { app } from "./app.js";
import { connectDB } from "./config/database.js";

// Environment variables ko load kr rhe h .env file se
dotenv.config({
    path: ".env"
});

const PORT = process.env.PORT || 8000;
// PORT ko env se le rhe h ya default 8000 use kr rhe h

// Database ko connect krke server ko start kr rhe h
connectDB()
    .then(() => {
        // agr database connect ho gaya to server ko start kr do
        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            // success message console me print kr rhe h
        });
    })
    .catch((error) => {
        // agr database connect nhi hota to error print krke process ko terminate kr do
        console.error("❌ Failed to start server:", error);
        process.exit(1);
        // process.exit(1) - error code 1 ke saath process ko terminate kro
    });

// ye approach isliye use kiya taaki server tab hi start ho jab database properly connected ho
// agar database nhi connect h tab server hi nhi chalega bekar

