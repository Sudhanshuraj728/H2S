#!/usr/bin/env node
/**
 * Database Connection Test Utility
 * Tests MongoDB connection and backend API availability
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const BACKEND_URL = `http://localhost:${process.env.PORT || 8000}`;
const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/optiprimes";

console.log("\n" + "=".repeat(60));
console.log("OptiPrimes Database Connection Test");
console.log("=".repeat(60) + "\n");

// Test 1: Check Backend Server
async function testBackendServer() {
  console.log("Test 1: Checking Backend Server...");
  return new Promise((resolve) => {
    http
      .get(BACKEND_URL, { timeout: 5000 }, (res) => {
        console.log("✅ Backend Server: RUNNING at", BACKEND_URL);
        resolve(true);
      })
      .on("error", (err) => {
        console.log("❌ Backend Server: NOT RUNNING at", BACKEND_URL);
        console.log("   Error:", err.message);
        resolve(false);
      })
      .on("timeout", () => {
        console.log("❌ Backend Server: TIMEOUT");
        resolve(false);
      });
  });
}

// Test 2: Check MongoDB Connection
async function testMongoDBConnection() {
  console.log("\nTest 2: Checking MongoDB Connection...");
  try {
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    const conn = mongoose.connection;
    console.log("✅ MongoDB Connection: SUCCESS");
    console.log("   Host:", conn.host);
    console.log("   Database:", conn.db.databaseName);
    console.log("   Ready State:", conn.readyState === 1 ? "Connected" : "Disconnected");

    // Try to access users collection
    try {
      const count = await conn.collection("users").countDocuments();
      console.log("   Users in DB:", count);
    } catch (err) {
      console.log("   Users collection: Not found yet");
    }

    await mongoose.connection.close();
    return true;
  } catch (err) {
    console.log("❌ MongoDB Connection: FAILED");
    console.log("   Error:", err.message);
    console.log("\n   Make sure MongoDB is running:");
    console.log("   Windows: mongod");
    console.log("   Docker: docker run -d -p 27017:27017 mongo");
    return false;
  }
}

// Main Test Runner
async function runAllTests() {
  const results = [];

  results.push(await testBackendServer());
  results.push(await testMongoDBConnection());

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary:");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\nTests Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log(
      "\n✅ All tests passed! Your setup is ready."
    );
    console.log("\nNext steps:");
    console.log("1. Start the frontend: cd frontend && npm run dev");
    console.log("2. Visit http://localhost:5173");
    console.log("3. Create a test account and verify it appears in MongoDB");
  } else if (passed > 0) {
    console.log("\n⚠️  Some tests failed. Please check the errors above.");
    if (!results[0]) {
      console.log(
        "   - Backend is not running. Start it with: npm run dev"
      );
    }
    if (!results[1]) {
      console.log(
        "   - MongoDB is not running. Check the connection guide."
      );
    }
  } else {
    console.log("\n❌ All tests failed. Please check your setup.");
  }

  console.log("\n" + "=".repeat(60) + "\n");
  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
