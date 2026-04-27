import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Asset } from './src/models/asset.model.js';

// Replicate the exact logic from upload.controller.js
const hexHammingSimilarity = (hex1, hex2) => {
    if (!hex1 || !hex2 || hex1.length !== hex2.length) return 0.0;
    let diffBits = 0;
    for (let i = 0; i < hex1.length; i++) {
        const v1 = parseInt(hex1[i], 16);
        const v2 = parseInt(hex2[i], 16);
        if (isNaN(v1) || isNaN(v2)) return 0.0;
        let xor = v1 ^ v2;
        while (xor) { diffBits += xor & 1; xor >>= 1; }
    }
    const totalBits = hex1.length * 4;
    const threshold = totalBits / 2.0;
    const sim = 1.0 - (diffBits / threshold);
    return Math.max(0.0, sim);
};

const computeMongoSimilarity = (sourceHashes, dbAsset) => {
    const sa = hexHammingSimilarity(sourceHashes.ahash, dbAsset.ahash);
    const sp = hexHammingSimilarity(sourceHashes.phash, dbAsset.phash);
    const sd = hexHammingSimilarity(sourceHashes.dhash, dbAsset.dhash);
    const globalCombined = (sa * 0.20) + (sp * 0.50) + (sd * 0.30);

    let colorSim = 0.0;
    if (sourceHashes.colorhash && dbAsset.colorhash) {
        colorSim = hexHammingSimilarity(sourceHashes.colorhash, dbAsset.colorhash);
    }

    const finalSim = (globalCombined * 0.70) + (colorSim * 0.30);
    const score = finalSim * 20.0;

    let matchType = "Transformed";
    if (sa >= 0.95 && sp >= 0.95 && sd >= 0.95) matchType = "Original";
    else if (globalCombined >= 0.85 && colorSim >= 0.70) matchType = "Original";
    else if (globalCombined < 0.65 && (sa >= 0.40 || sp >= 0.40 || sd >= 0.40)) matchType = "Cropped";

    return { similarity: finalSim, score, matchType, ahashSim: sa, phashSim: sp, dhashSim: sd, colorSim, globalCombined };
};

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate: test with CRIC.jpeg hashes (already in DB)
    const cricAsset = await Asset.findOne({ 
        filename: /CRIC/i,
        ahash: { $ne: null }
    }).lean();
    
    if (!cricAsset) {
        console.log("ERROR: CRIC.jpeg not found with hashes in DB!");
        await mongoose.disconnect();
        return;
    }
    
    console.log("Testing with CRIC.jpeg hashes:");
    console.log("  ahash:", cricAsset.ahash);
    console.log("  phash:", cricAsset.phash);
    console.log("  dhash:", cricAsset.dhash);
    
    // Now scan all assets for a match (simulating findBestMatchInMongoDB)
    const sourceHashes = {
        ahash: cricAsset.ahash,
        phash: cricAsset.phash,
        dhash: cricAsset.dhash,
        colorhash: cricAsset.colorhash || "",
    };
    
    const allAssets = await Asset.find({
        ahash: { $nin: [null, "", undefined] },
        phash: { $nin: [null, "", undefined] },
        dhash: { $nin: [null, "", undefined] },
    }).select('title filename ahash phash dhash colorhash owner source').lean();
    
    console.log(`\nScanning ${allAssets.length} assets...`);
    
    let matches = [];
    for (const asset of allAssets) {
        if (!asset.ahash || !asset.phash || !asset.dhash) continue;
        const result = computeMongoSimilarity(sourceHashes, asset);
        if (result.score >= 12) {
            matches.push({ filename: asset.filename || asset.title, ...result });
        }
    }
    
    matches.sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) {
        console.log("NO MATCHES FOUND! This is the bug.");
    } else {
        console.log(`\nFound ${matches.length} matches:`);
        matches.forEach((m, i) => {
            console.log(`  ${i+1}. ${m.filename} | sim=${(m.similarity * 100).toFixed(1)}% | score=${m.score.toFixed(1)}/20 | type=${m.matchType} | globalCombined=${m.globalCombined.toFixed(4)}`);
        });
    }
    
    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
