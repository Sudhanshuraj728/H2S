import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import { User } from "../models/user.model.js";
import { Asset } from "../models/asset.model.js";

// ========== HELPER FUNCTIONS ==========

// Calculate file hash from file path
const calculateFileHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
};

// Get file size in bytes
const getFileSize = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.size;
};

// Parse player name and action from folder name
const parsePlayerInfo = (folderName) => {
    // Handle all folder names like "Virat", "MS", "Ben_Stokes", etc.
    const playerMap = {
        "Virat": { name: "Virat Kohli", action: "cover drive" },
        "MS": { name: "MS Dhoni", action: "helicopter shot" },
        "Rohit": { name: "Rohit Sharma", action: "pull shot" },
        "Bumrah": { name: "Jasprit Bumrah", action: "bowling" },
        "KL": { name: "KL Rahul", action: "defense" },
        "Pandya": { name: "Hardik Pandya", action: "batting" },
        "Bhuvi": { name: "Bhuvneshwar Kumar", action: "bowling" },
        "Gayle": { name: "Chris Gayle", action: "power batting" },
        "Ben_Stokes": { name: "Ben Stokes", action: "batting" },
        "Steve_Smith": { name: "Steve Smith", action: "batting" },
        "AB_de_Villiers": { name: "AB de Villiers", action: "batting" }
    };
    
    return playerMap[folderName] || { name: folderName, action: "cricket" };
};

// ========== SEED FUNCTION ==========
const seedImagesFromFolder = async () => {
    let assetsCreated = 0;
    let assetsFailed = 0;
    
    try {
        // Connect to MongoDB with Atlas optimizations
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

        console.log("✅ Connected to MongoDB\n");

        // Get or create a default user for assets
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
            console.log("👤 Created test user:", testUser.email, "\n");
        } else {
            console.log("👤 Using existing test user:", testUser.email, "\n");
        }

        // Base path to images folder
        const imagesBasePath = path.join(__dirname, "../../../database/images");

        // Check if images folder exists
        if (!fs.existsSync(imagesBasePath)) {
            throw new Error(`Images folder not found at: ${imagesBasePath}`);
        }

        // Get all player folders
        const playerFolders = fs.readdirSync(imagesBasePath).filter(file => {
            const fullPath = path.join(imagesBasePath, file);
            return fs.statSync(fullPath).isDirectory();
        });

        console.log(`📁 Found ${playerFolders.length} player folders\n`);

        // Process each player folder
        for (const playerFolder of playerFolders) {
            const playerFolderPath = path.join(imagesBasePath, playerFolder);
            const playerInfo = parsePlayerInfo(playerFolder);
            
            console.log(`\n🏏 Processing: ${playerInfo.name} (${playerFolder}/)`);

            // Get all image files in the player folder
            const imageFiles = fs.readdirSync(playerFolderPath).filter(file => {
                const ext = path.extname(file).toLowerCase();
                return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
            });

            console.log(`   📸 Found ${imageFiles.length} images`);

            // Process each image file
            for (const imageFile of imageFiles) {
                try {
                    const imagePath = path.join(playerFolderPath, imageFile);
                    
                    // Calculate file hash
                    const fileHash = calculateFileHash(imagePath);
                    
                    // Check if asset with this hash already exists
                    const existingAsset = await Asset.findOne({ fileHash });
                    
                    if (existingAsset) {
                        console.log(`   ⏭️  Skipped (already exists): ${imageFile}`);
                        continue;
                    }

                    // Get file size
                    const fileSize = getFileSize(imagePath);
                    
                    // Extract action from filename if available
                    let action = playerInfo.action;
                    const fileNameParts = imageFile.split("_");
                    if (fileNameParts.length > 2) {
                        action = fileNameParts.slice(2, -1).join(" ");
                    }

                    // Create asset in database
                    const asset = await Asset.create({
                        // Basic Information
                        title: `${playerInfo.name} - ${imageFile}`,
                        description: `Cricket image of ${playerInfo.name} - ${action}`,
                        
                        // File Information
                        fileUrl: `./database/images/${playerFolder}/${imageFile}`, // Local file path
                        fileHash: fileHash,
                        fileType: "image",
                        fileSize: fileSize,
                        
                        // Asset-specific metadata
                        filename: imageFile,
                        player: playerInfo.name,
                        action: action,
                        source: "local-database",
                        path: `images/${playerFolder}/${imageFile}`,
                        uploadedAt: new Date(),
                        
                        // Ownership
                        owner: testUser._id,
                        
                        // Status
                        status: "active"
                    });

                    console.log(`   ✅ Added: ${imageFile} (${(fileSize / 1024).toFixed(2)} KB)`);
                    assetsCreated++;

                } catch (error) {
                    console.log(`   ❌ Failed to add ${imageFile}: ${error.message}`);
                    assetsFailed++;
                }
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log(`\n✨ Image Import Complete!`);
        console.log(`✅ Assets created: ${assetsCreated}`);
        console.log(`❌ Assets failed: ${assetsFailed}`);
        console.log(`👤 Owner: ${testUser.email}`);
        console.log(`\n📊 Total assets in database: ${await Asset.countDocuments()}`);

        // Show sample of imported assets
        const sampleAssets = await Asset.find({ owner: testUser._id }).limit(5);
        console.log(`\n📋 Sample imported assets:`);
        sampleAssets.forEach((asset, index) => {
            console.log(`   ${index + 1}. ${asset.title}`);
        });

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

    } catch (error) {
        console.error("❌ Error during image import:", error.message);
        process.exit(1);
    }
};

// ========== RUN SEED FUNCTION ==========
seedImagesFromFolder().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
