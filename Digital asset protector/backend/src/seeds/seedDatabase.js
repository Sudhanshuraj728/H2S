import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import { User } from "../models/user.model.js";
import { Asset } from "../models/asset.model.js";
import { Detection } from "../models/detection.model.js";

// ========== SAMPLE DATA ==========
const cricketPlayers = [
    { name: "Virat Kohli", images: ["kohli_1.jpg"], actions: ["cover drive", "pull shot", "defensive"] },
    { name: "MS Dhoni", images: ["MS.jpg"], actions: ["helicopter shot", "stumping", "keeping"] },
    { name: "Rohit Sharma", images: ["Rohit.jpg"], actions: ["drive", "pull shot"] },
    { name: "Bumrah", images: ["Bumrah.jpg"], actions: ["bowling", "yorker"] },
    { name: "KL Rahul", images: ["KL.jpg"], actions: ["cover drive", "defense"] },
    { name: "Pandya", images: ["Pandya.jpg"], actions: ["batting", "bowling"] },
    { name: "Bhuvi", images: ["Bhuvi.jpg"], actions: ["bowling", "pace bowling"] },
    { name: "Gayle", images: ["Gayle.jpg"], actions: ["power batting", "six"] },
    { name: "Ben Stokes", images: ["Ben_Stokes.jpg"], actions: ["batting", "bowling"] },
    { name: "Steve Smith", images: ["Steve_Smith.jpg"], actions: ["batting", "fielding"] },
    { name: "AB de Villiers", images: ["AB_de_Villiers.jpg"], actions: ["batting", "wicket keeping"] }
];

const sources = ["duckduckgo", "google images", "unsplash", "pexels", "cricket.com", "bcci.tv"];
const platforms = ["youtube", "instagram", "twitter", "facebook", "tiktok", "dailymotion"];

// ========== SEED FUNCTION ==========
const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 25,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: "majority"
        });

        console.log("✅ Connected to MongoDB");

        // Clear existing data (optional - comment out to keep data)
        // await User.deleteMany({});
        // await Asset.deleteMany({});
        // await Detection.deleteMany({});
        // console.log("🗑️ Cleared existing data");

        // Create a test user
        let testUser = await User.findOne({ email: "testuser@optiprimes.com" });
        
        if (!testUser) {
            testUser = await User.create({
                firstName: "Test",
                lastName: "User",
                email: "testuser@optiprimes.com",
                password: "Test@123456",
                phone: "+91-9876543210",
                company: "OptiPrimes",
                role: "user",
                isActive: true
            });
            console.log("👤 Created test user:", testUser.email);
        } else {
            console.log("👤 Test user already exists:", testUser.email);
        }

        // Create sample assets for each cricket player
        let assetsCreated = 0;
        
        for (const player of cricketPlayers) {
            for (const image of player.images) {
                // Check if asset already exists
                const existingAsset = await Asset.findOne({ 
                    title: `${player.name} - ${image}`
                });

                if (!existingAsset) {
                    const action = player.actions[Math.floor(Math.random() * player.actions.length)];
                    const source = sources[Math.floor(Math.random() * sources.length)];
                    
                    const asset = await Asset.create({
                        // Basic Information
                        title: `${player.name} - ${image}`,
                        description: `Cricket image of ${player.name} performing ${action}`,
                        
                        // File Information
                        fileUrl: `https://placeholder.com/400x300?text=${player.name}`,
                        fileHash: `hash_${player.name.replace(/\s+/g, '_')}_${image.replace(/\./g, '_')}`,
                        fileType: "image",
                        fileSize: 1024000 + Math.random() * 5000000, // Random size between 1MB-6MB
                        
                        // Asset-specific metadata
                        filename: image,
                        player: player.name,
                        action: action,
                        source: source,
                        path: `images/${player.name.replace(/\s+/g, '_')}/${image}`,
                        uploadedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
                        
                        // Ownership
                        owner: testUser._id,
                        
                        // Status
                        status: "active"
                    });

                    console.log(`📸 Created asset: ${player.name} - ${image}`);
                    assetsCreated++;

                    // Create sample detections for some assets
                    if (Math.random() > 0.4) {
                        const platformIndex = Math.floor(Math.random() * platforms.length);
                        const platform = platforms[platformIndex];
                        
                        const detection = await Detection.create({
                            assetId: asset._id,
                            userId: testUser._id,
                            detectedUrl: `https://${platform}.com/watch?v=${Math.random().toString(36).substr(2, 9)}`,
                            platform: platform,
                            confidence: 85 + Math.random() * 15,
                            matchScore: 80 + Math.random() * 20,
                            thumbnailUrl: `https://placeholder.com/150x150?text=Detection`,
                            status: ["pending", "reported", "resolved"][Math.floor(Math.random() * 3)],
                            detectionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                        });

                        // Add detection to asset
                        asset.detections.push(detection._id);
                        await asset.save();
                        
                        console.log(`  ↳ Detection created on ${platform}`);
                    }
                }
            }
        }

        console.log(`\n✨ Seeding complete!`);
        console.log(`📊 Assets created: ${assetsCreated}`);
        console.log(`👤 Test user: testuser@optiprimes.com`);

        // Display sample asset data structure
        console.log("\n📋 Sample Asset Schema:");
        const sampleAsset = await Asset.findOne().populate('owner', 'firstName lastName email');
        if (sampleAsset) {
            console.log(JSON.stringify(sampleAsset, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

// Run seeding function
seedDatabase();
