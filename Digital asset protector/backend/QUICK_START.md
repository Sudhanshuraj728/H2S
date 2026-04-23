# 🚀 OptiPrimes MongoDB Database - Quick Start Guide

## TL;DR - Get Running in 5 Minutes

### 1. Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your MongoDB URI
# Example: MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/optiprimes
```

### 2. Seed Database
```bash
npm install
npm run seed
```

### 3. Start Server
```bash
npm run dev
```

### 4. Done! 🎉
Your MongoDB database is now populated with:
- ✅ Test user (testuser@optiprimes.com)
- ✅ 11 cricket players
- ✅ 20+ sample assets
- ✅ Random detections

---

## 📋 What's in Your Database?

### Sample Asset:
```json
{
  "filename": "kohli_1.jpg",
  "player": "Virat Kohli",
  "action": "cover drive",
  "source": "duckduckgo",
  "path": "images/Virat_Kohli/kohli_1.jpg",
  "uploadedAt": "2026-04-19",
  "status": "active",
  "detectionCount": 0
}
```

### Available Players:
Virat Kohli, MS Dhoni, Rohit Sharma, Bumrah, KL Rahul, Pandya, Bhuvi, Gayle, Ben Stokes, Steve Smith, AB de Villiers

---

## 🔍 Quick Test Queries

### MongoDB Shell
```bash
mongosh "mongodb+srv://user:password@cluster.mongodb.net/optiprimes"
```

### Find all Virat Kohli images:
```javascript
db.assets.find({ player: "Virat Kohli" })
```

### Find all cover drives:
```javascript
db.assets.find({ action: "cover drive" })
```

### Count total assets:
```javascript
db.assets.countDocuments()
```

### Find detections:
```javascript
db.detections.find()
```

---

## 📊 Schema Overview

### Asset Fields:
```javascript
{
  // Cricket-specific
  player: "Virat Kohli",
  action: "cover drive",
  filename: "kohli_1.jpg",
  source: "duckduckgo",
  path: "images/Virat_Kohli/kohli_1.jpg",
  uploadedAt: Date,
  
  // File info
  fileUrl: String,
  fileHash: String (unique),
  fileType: String,
  fileSize: Number,
  
  // Status
  status: String, // "active", "flagged", "archived", "deleted"
  
  // Relationships
  owner: ObjectId (User),
  detections: [ObjectId] (Detections),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🆘 Troubleshooting

### MongoDB Connection Failed
- Check MONGODB_URI in .env
- Verify IP whitelist in MongoDB Atlas
- Ensure credentials are correct

### Duplicate Key Error
- Database already seeded
- Solution: `db.assets.deleteMany({})` then reseed

### Slow Queries
- Indexes are already created
- Check MongoDB Atlas metrics

---

## 📚 Learn More

| Document | Purpose |
|----------|---------|
| `DATABASE_SETUP.md` | Complete technical setup |
| `CRICKET_DATABASE_GUIDE.md` | Detailed field reference |
| `IMPLEMENTATION_SUMMARY.md` | What was created |

---

## ✨ Features

- ✅ Cricket player image tracking
- ✅ Copyright violation detection
- ✅ Platform monitoring (YouTube, Instagram, etc.)
- ✅ Duplicate file detection via hashing
- ✅ Detection status tracking
- ✅ Performance optimized with indexes

---

## 🎯 API Endpoints (Examples)

Once server is running:

```bash
# Get all assets
GET /api/assets

# Get user's assets
GET /api/assets?owner=userId

# Create new asset
POST /api/assets
Body: {
  "player": "Virat Kohli",
  "action": "cover drive",
  ...
}

# Get detections for asset
GET /api/detections?assetId=assetId
```

---

## 💾 Database Name
```
optiprimes
```

## 🗂️ Collections
- users
- assets
- detections
- alerts

---

## 📝 Test User Credentials
```
Email: testuser@optiprimes.com
Password: Test@123456
```

---

## 🔄 Re-seed Database

To clear and reseed:
```bash
# In MongoDB shell
db.users.deleteMany({})
db.assets.deleteMany({})
db.detections.deleteMany({})
db.alerts.deleteMany({})

# Then run
npm run seed
```

---

## 🎓 Learning Path

1. **Start Here**: This file
2. **Setup**: DATABASE_SETUP.md
3. **Reference**: CRICKET_DATABASE_GUIDE.md
4. **Code**: src/models/asset.model.js

---

## 🚨 Important Notes

⚠️ **Unique Constraint**: fileHash field is unique - no duplicates allowed
⚠️ **Owner Required**: Each asset must be owned by a user
⚠️ **Status Enum**: Only "active", "flagged", "archived", "deleted" allowed

---

## ✅ Checklist

- [ ] MongoDB URI configured in .env
- [ ] Dependencies installed (`npm install`)
- [ ] Database seeded (`npm run seed`)
- [ ] Server running (`npm run dev`)
- [ ] Can connect to MongoDB
- [ ] Documents visible in MongoDB Atlas

---

**Ready to build something amazing? Let's go! 🚀**
