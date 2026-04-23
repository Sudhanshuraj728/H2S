import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        // MongoDB ko connect kr rhe h MONGODB_URI use krke
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}`,
            {
                useNewUrlParser: true,
                // new URL parser use kr rhe h taaki deprecated parser se issues na aaye
                useUnifiedTopology: true,
                // unified topology use kr rhe h jisse connection pooling better ho
                
                // ========== ATLAS OPTIMIZATION OPTIONS ==========
                maxPoolSize: 50,
                // Maximum connections in the pool (50 handles OLTP workloads well)
                
                minPoolSize: 10,
                // Minimum pre-warmed connections ready for traffic spikes
                
                maxIdleTimeMS: 5 * 60 * 1000,
                // Keep idle connections for 5 minutes before closing
                
                serverSelectionTimeoutMS: 10000,
                // Timeout for server selection - fail fast if unavailable
                
                socketTimeoutMS: 45000,
                // Socket timeout for operations (45 seconds for Atlas OLTP)
                
                connectTimeoutMS: 10000,
                // Initial connection timeout
                
                retryWrites: true,
                // Built into Atlas URI but good to be explicit
                
                w: "majority",
                // Wait for write acknowledgment from majority
                
                retryReads: true,
                // Automatically retry reads on transient errors
                
                appName: "OptiPrimes"
                // Helps identify app in Atlas activity logs
            }
        );

        console.log(
            `✅ MongoDB Connected: ${connectionInstance.connection.host}`
        );
        // successful connection message print kr rhe h host ke saath
        
        return connectionInstance;
        // connection object return kr rhe h agar kisi ko use krni padhe
    } catch (error) {
        // agr database connect me error aaye to catch block me error print ho
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
        // process.exit(1) - kynki database connection error h to server start nhi hona chahiye isliye process ko terminate kr do
    }
};

// ye function index.js se call hota h app.listen se pehle
// taaki database properly connected ho tab server start ho

