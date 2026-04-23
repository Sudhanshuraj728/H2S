import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || "mongodb://localhost:27017/optiprimes";
const ATLAS_URI = process.env.ATLAS_MONGODB_URI || process.env.MONGODB_URI;

const isAtlasUri = (uri = "") => uri.startsWith("mongodb+srv://") || uri.includes("mongodb.net");

const copyCollectionData = async (sourceDb, targetDb, collectionName) => {
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = targetDb.collection(collectionName);

    const totalDocs = await sourceCollection.countDocuments();
    if (totalDocs === 0) {
        console.log(`   ⏭️  ${collectionName}: empty collection, skipped`);
        return 0;
    }

    await targetCollection.deleteMany({});

    const cursor = sourceCollection.find({});
    const batchSize = 500;
    let batch = [];
    let insertedCount = 0;

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= batchSize) {
            await targetCollection.insertMany(batch, { ordered: true });
            insertedCount += batch.length;
            batch = [];
        }
    }

    if (batch.length > 0) {
        await targetCollection.insertMany(batch, { ordered: true });
        insertedCount += batch.length;
    }

    console.log(`   ✅ ${collectionName}: ${insertedCount} documents copied`);
    return insertedCount;
};

const copyIndexes = async (sourceDb, targetDb, collectionName) => {
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = targetDb.collection(collectionName);

    const indexes = await sourceCollection.indexes();
    const nonDefaultIndexes = indexes.filter((idx) => idx.name !== "_id_");

    if (nonDefaultIndexes.length === 0) {
        return;
    }

    for (const idx of nonDefaultIndexes) {
        const { key, name, ...rest } = idx;
        await targetCollection.createIndex(key, { name, ...rest });
    }

    console.log(`   ✅ ${collectionName}: ${nonDefaultIndexes.length} indexes copied`);
};

const migrateLocalToAtlas = async () => {
    let sourceConn;
    let targetConn;

    try {
        if (!ATLAS_URI) {
            throw new Error("ATLAS_MONGODB_URI (or MONGODB_URI) is missing in environment variables");
        }

        if (!isAtlasUri(ATLAS_URI)) {
            throw new Error("Target URI does not look like an Atlas connection string");
        }

        console.log("\n🚀 Starting migration from Local MongoDB to Atlas...");
        console.log(`📍 Source (Local): ${LOCAL_URI}`);
        console.log("📍 Target (Atlas): [secured]");

        sourceConn = await mongoose.createConnection(LOCAL_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000
        }).asPromise();

        targetConn = await mongoose.createConnection(ATLAS_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 25,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: "majority"
        }).asPromise();

        const sourceDb = sourceConn.db;
        const targetDb = targetConn.db;

        const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
        const collectionNames = collections
            .map((c) => c.name)
            .filter((name) => !name.startsWith("system."));

        if (collectionNames.length === 0) {
            console.log("⚠️  No collections found in local database.");
            return;
        }

        console.log(`\n📦 Collections to migrate: ${collectionNames.length}`);

        let totalCopied = 0;

        for (const collectionName of collectionNames) {
            console.log(`\n🔄 Migrating collection: ${collectionName}`);
            const copied = await copyCollectionData(sourceDb, targetDb, collectionName);
            await copyIndexes(sourceDb, targetDb, collectionName);
            totalCopied += copied;
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ Migration completed successfully");
        console.log(`📦 Collections migrated: ${collectionNames.length}`);
        console.log(`📄 Total documents copied: ${totalCopied}`);
        console.log("=".repeat(60) + "\n");
    } catch (error) {
        console.error("\n❌ Migration failed:", error.message);
        process.exitCode = 1;
    } finally {
        if (sourceConn) {
            await sourceConn.close();
        }
        if (targetConn) {
            await targetConn.close();
        }
    }
};

migrateLocalToAtlas().catch((error) => {
    console.error("Fatal migration error:", error);
    process.exit(1);
});
