import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js";
import assetRoutes from "./routes/asset.routes.js";
// asset routes ko import kr rhe h
import detectionRoutes from "./routes/detection.routes.js";
// detection routes ko import kr rhe h - detection violations tracking ke liye

import alertRoutes from "./routes/alert.routes.js";
// alert routes ko import kr rhe h - violation alerts aur escalation ke liye

const app = express();

// ========== MIDDLEWARE CONFIGURATION ==========

// CORS middleware - cross-origin requests allow kr rhe h taaki frontend joh different port pr h vo backend se request kr ske
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from localhost on any port (5173, 5174, etc.) in development
        // Or from specific CORS_ORIGIN if configured
        if (!origin || origin.includes('localhost') || origin === process.env.CORS_ORIGIN) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    // origin: joh frontend ka URL h vo specify kiya taaki sirf us URL se requests aaye
}));

// JSON parser - incoming requests ki JSON body ko parse kr rhe h
app.use(express.json({ limit: "10kb" }));
// limit: 10kb lga diya taaki large payloads block ho jaye security ke liye

// URL encoded parser - form data ko parse kr rhe h
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
// extended: true - advanced parsing ke liye

// Static files - public folder se static files serve kr skte h (images, CSS, JS)
app.use(express.static("public"));

// Cookie parser - incoming cookies ko parse kr rhe h request me
app.use(cookieParser());
// ab req.cookies se cookies ko access kr skte h

// ========== ROUTES ==========

// User authentication aur profile routes
app.use("/api/users", userRoutes);
// /api/users ke sare routes userRoutes se import hote h

// Asset management routes
app.use("/api/assets", assetRoutes);
// /api/assets ke sare routes assetRoutes se import hote h

// Detection tracking routes
app.use("/api/detections", detectionRoutes);
// /api/detections ke sare routes detectionRoutes se import hote h
// Detection routes: violation detection kab log hote h, kya status h, etc

// Alert management routes
app.use("/api/alerts", alertRoutes);
// /api/alerts ke sare routes alertRoutes se import hote h
// Alert routes: violations ke liye formal notifications, escalation, DMCA actions

import uploadRoutes from "./routes/upload.routes.js";
app.use("/api/upload", uploadRoutes);


// Health check route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to OptiPrimes Backend API",
        timestamp: new Date().toISOString()
    });
});
// ye route server running h ya nhi ye check krne ke liye h

// ========== ERROR HANDLING MIDDLEWARE ==========

app.use((err, req, res, next) => {
    // ye error handling middleware h jo asyncHandler se errors catch krke idhar aate h
    
    const status = err.statusCode || 500;
    // agr ApiError se statusCode aaye to vo use kr otherwise 500 (internal server error)
    
    const message = err.message || "Internal Server Error";
    // error message use kr rhe h
    
    res.status(status).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
        // development mode me stack trace bhi return kr rhe h debugging ke liye lekin production me nhi
    });
});

export { app };


