/**
 * syncPythonDbToMongo.js
 *
 * Merges the Python detection engine's assets.json into MongoDB so both
 * databases are identical. Run once on every startup — safe to call repeatedly
 * because it does hash-based upserts (skips anything already in Mongo).
 *
 * Why: MongoDB is the app's source of truth. The Python DB (assets.json) may
 * have seeded/historical assets that were never registered via the web UI.
 * After this sync both paths produce the same comparison results.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Asset } from "../models/asset.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python detection engine's asset store
const ASSETS_JSON = path.resolve(
    __dirname,
    "../../../logic/detection_engine/data/assets.json"
);

// Placeholder ObjectId for assets that have no real owner (seeded/system assets)
const SYSTEM_OWNER_ID = "000000000000000000000000";

/**
 * Convert Python tile_hashes list → Mongoose tileHashes format.
 * Python: [{ ahash, phash, dhash, row?, col? }, ...]
 * Mongo : [{ ahash, phash, dhash, row, col }, ...]
 */
const convertTileHashes = (pyTiles = []) =>
    pyTiles
        .filter(t => t && typeof t === "object")
        .map(t => ({
            ahash: t.ahash || "",
            phash: t.phash || "",
            dhash: t.dhash || "",
            row: t.row ?? 0,
            col: t.col ?? 0,
        }));

export const syncPythonDbToMongo = async () => {
    try {
        if (!fs.existsSync(ASSETS_JSON)) {
            console.log("[sync] assets.json not found — skipping Python→MongoDB sync");
            return;
        }

        const raw = JSON.parse(fs.readFileSync(ASSETS_JSON, "utf-8"));
        const pyAssets = Array.isArray(raw.assets) ? raw.assets : [];

        if (pyAssets.length === 0) {
            console.log("[sync] assets.json is empty — nothing to sync");
            return;
        }

        let added = 0, updated = 0, skipped = 0;

        for (const pa of pyAssets) {
            // Skip assets without the 3 required perceptual hashes
            if (!pa.ahash || !pa.phash || !pa.dhash) { skipped++; continue; }

            // Look for an existing Mongo record with the same hash fingerprint
            const existing = await Asset.findOne({
                ahash: pa.ahash,
                phash: pa.phash,
                dhash: pa.dhash,
            });

            if (existing) {
                // Fill in missing tileHashes if the existing record doesn't have them
                if (!existing.tileHashes || existing.tileHashes.length === 0) {
                    const tiles = convertTileHashes(pa.tile_hashes);
                    if (tiles.length > 0) {
                        existing.tileHashes = tiles;
                        await existing.save();
                        updated++;
                        continue;
                    }
                }
                skipped++;
                continue;
            }

            // Create new MongoDB record for this Python-only asset
            const fakeFileHash = `pydb-sync-${pa.id || pa.ahash}-${pa.phash}`;
            try {
                await Asset.create({
                    title: pa.filename || `asset-${pa.id?.slice(0, 8) || "unknown"}`,
                    description: "Synced from Python detection database",
                    fileUrl: `pydb://${pa.filename || pa.id}`,
                    fileHash: fakeFileHash,
                    fileType: "image",
                    fileSize: 0,
                    owner: SYSTEM_OWNER_ID,
                    status: "active",
                    isProtected: true,
                    platforms: ["other"],
                    filename: pa.filename || "",
                    source: "python-db-sync",
                    ahash: pa.ahash,
                    phash: pa.phash,
                    dhash: pa.dhash,
                    colorhash: pa.colorhash || "",
                    tileHashes: convertTileHashes(pa.tile_hashes),
                });
                added++;
            } catch (createErr) {
                // fileHash unique-key collision → already exists under a different hash match
                skipped++;
            }
        }

        console.log(
            `[sync] Python DB → MongoDB complete: ` +
            `+${added} added, ~${updated} tile-hash-updated, ${skipped} already in sync`
        );
    } catch (err) {
        // Never crash the server because of a sync failure
        console.error("[sync] Python→MongoDB sync failed (non-fatal):", err.message);
    }
};
