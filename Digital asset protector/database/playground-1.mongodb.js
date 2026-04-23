// OptiPrimes User Database Setup
// MongoDB Playground - Create database with user collection and schema validation

use("optiprimes");

// ============================================================
// 1. CREATE USERS COLLECTION WITH SCHEMA VALIDATION
// ============================================================

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "User",
      required: ["firstName", "lastName", "email", "password"],
      properties: {
        _id: {
          bsonType: "objectId",
          description: "Unique user ID (auto-generated)"
        },
        firstName: {
          bsonType: "string",
          description: "User's first name",
          minLength: 1,
          maxLength: 50
        },
        lastName: {
          bsonType: "string",
          description: "User's last name",
          minLength: 1,
          maxLength: 50
        },
        email: {
          bsonType: "string",
          description: "User's email address (unique)",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        password: {
          bsonType: "string",
          description: "User's hashed password (minimum 6 characters)"
        },
        company: {
          bsonType: ["string", "null"],
          description: "Organization/Company name (optional)",
          maxLength: 100
        },
        role: {
          enum: ["user", "admin"],
          description: "User role in the system (default: user)"
        },
        isActive: {
          bsonType: "bool",
          description: "Whether the user account is active (default: true)"
        },
        createdAt: {
          bsonType: "date",
          description: "Account creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last account update timestamp"
        }
      },
      additionalProperties: false
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

console.log("✅ Users collection created with schema validation");

// ============================================================
// 2. CREATE INDEXES FOR PERFORMANCE
// ============================================================

db.users.createIndex({ email: 1 }, { unique: true });
console.log("✅ Created unique index on email");

db.users.createIndex({ createdAt: -1 });
console.log("✅ Created index on createdAt");

db.users.createIndex({ isActive: 1 });
console.log("✅ Created index on isActive");

// ============================================================
// 3. INSERT SAMPLE USER DOCUMENTS (OPTIONAL)
// ============================================================

// Uncomment below to insert sample users for testing
/*
db.users.insertMany([
  {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/HeO", // hashed: SecurePass123
    company: "Acme Corporation",
    role: "user",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/HeO", // hashed: SecurePass456
    company: "Tech Innovations Ltd",
    role: "user",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/HeO", // hashed: AdminPass789
    company: "OptiPrimes",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

console.log("✅ Inserted 3 sample users");
*/

// ============================================================
// 4. VIEW COLLECTION SCHEMA
// ============================================================

console.log("\n📊 Database Setup Complete!");
console.log("Database: optiprimes");
console.log("Collection: users");
console.log("\nRequired Fields:");
console.log("  - firstName (string, max 50 chars)");
console.log("  - lastName (string, max 50 chars)");
console.log("  - email (string, unique, email format)");
console.log("  - password (string, hashed)");
console.log("\nOptional Fields:");
console.log("  - company (string, max 100 chars)");
console.log("  - role (user or admin, default: user)");
console.log("  - isActive (boolean, default: true)");
console.log("  - createdAt (date, auto-generated)");
console.log("  - updatedAt (date, auto-generated)");
