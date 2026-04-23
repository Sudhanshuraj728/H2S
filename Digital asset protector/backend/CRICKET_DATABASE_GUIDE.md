# OptiPrimes Cricket Assets Database - Quick Reference

## 🎯 Project Overview
OptiPrimes is a **Digital Asset Protector** system that tracks and monitors cricket player images across the internet to detect copyright violations and unauthorized use.

## 📊 Database Structure

### Core Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| **users** | User accounts & authentication | email, password, role, company |
| **assets** | Uploaded cricket images | player, action, filename, status |
| **detections** | Detected copyright violations | platform, confidence, status |
| **alerts** | Critical notifications | alertType, message, actionTaken |

---

## 🎮 Asset Fields Explained

### Cricket-Specific Fields

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `player` | String | "Virat Kohli" | Identify which cricket player |
| `action` | String | "cover drive" | What the player is doing |
| `filename` | String | "kohli_1.jpg" | Original file name |
| `source` | String | "duckduckgo" | Where image came from |
| `path` | String | "images/Virat_Kohli/kohli_1.jpg" | Local storage path |
| `uploadedAt` | Date | 2026-04-19 | When image was uploaded |
| `status` | String | "active" | Processing state |

### File Management Fields

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `fileUrl` | String | cloudinary.com/... | Public access URL |
| `fileHash` | String | "hash_virat_kohli_..." | Unique fingerprint |
| `fileType` | String | "image" | MIME type |
| `fileSize` | Number | 2048576 | Size in bytes |
| `metadata` | Object | {width: 1920, height: 1080} | Image specs |

### Protection Fields

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `isProtected` | Boolean | true | Under copyright protection |
| `status` | String | "active" | Current state |
| `detectionCount` | Number | 3 | Times found elsewhere |
| `lastDetectedAt` | Date | 2026-04-18 | Last violation found |
| `platforms` | Array | ["youtube", "instagram"] | Where to monitor |

---

## 🗂️ Sample Cricket Players Data

### Pre-seeded Players:
1. **Virat Kohli** - Actions: cover drive, pull shot, defensive
2. **MS Dhoni** - Actions: helicopter shot, stumping, keeping
3. **Rohit Sharma** - Actions: drive, pull shot
4. **Bumrah** - Actions: bowling, yorker
5. **KL Rahul** - Actions: cover drive, defense
6. **Pandya** - Actions: batting, bowling
7. **Bhuvi** - Actions: bowling, pace bowling
8. **Chris Gayle** - Actions: power batting, six
9. **Ben Stokes** - Actions: batting, bowling
10. **Steve Smith** - Actions: batting, fielding
11. **AB de Villiers** - Actions: batting, wicket keeping

---

## 🔍 Search & Filter Examples

### Query Examples:

```javascript
// Find all Virat Kohli assets
db.assets.find({ player: "Virat Kohli" })

// Find all cover drives
db.assets.find({ action: "cover drive" })

// Find active assets
db.assets.find({ status: "active" })

// Find all cricket category assets
db.assets.find({ category: "cricket" })

// Find assets from specific player with detection
db.assets.aggregate([
  { $match: { player: "Virat Kohli", status: "active" } },
  { $lookup: { from: "detections", localField: "_id", foreignField: "assetId", as: "detections" } }
])

// Find most recently detected violations
db.detections.find({ status: "pending" }).sort({ detectionDate: -1 })

// Find assets with multiple detections
db.assets.aggregate([
  { $match: { detectionCount: { $gt: 2 } } },
  { $sort: { detectionCount: -1 } }
])
```

---

## 📈 Detection Workflow

```
1. Asset Upload
   └─> User uploads cricket image
   └─> File hashed and stored
   └─> Stored in 'assets' collection

2. Monitoring
   └─> System scans selected platforms
   └─> Searches for matching hashes
   └─> Creates 'detection' records if found

3. Alert Generation
   └─> Detection confidence > threshold
   └─> Creates 'alert' record
   └─> Notifies user

4. Action
   └─> User files DMCA takedown
   └─> Platforms remove content
   └─> Status updated to 'resolved'
```

---

## 🎬 Detection Platforms

The system monitors these platforms:
- YouTube
- Instagram
- Twitter/X
- Facebook
- TikTok
- Dailymotion
- Custom platforms

---

## 🔐 Data Security

### Protection Mechanisms:
- ✅ **Passwords** - Hashed with bcryptjs
- ✅ **File Hashes** - Cryptographic SHA-256 or similar
- ✅ **Unique Constraints** - No duplicate fileHash entries
- ✅ **Ownership** - Each asset linked to specific user
- ✅ **Status Tracking** - Clear audit trail of changes

---

## 📋 Asset Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| `active` | Actively monitored | Monitor across platforms |
| `flagged` | Violation found | Review and take action |
| `archived` | Stored but not monitored | Can reactivate later |
| `deleted` | Removed by user | Soft delete for recovery |

---

## 🚀 Quick Commands

### Seed the database:
```bash
npm run seed
```

### Start development server:
```bash
npm run dev
```

### Connect to MongoDB:
```bash
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/optiprimes"
```

### Check collection counts:
```bash
db.assets.countDocuments()
db.detections.countDocuments()
db.users.countDocuments()
```

---

## 📝 Sample API Response (Asset)

```json
{
  "_id": "ObjectId",
  "title": "Virat Kohli - kohli_1.jpg",
  "description": "Cricket image of Virat Kohli performing cover drive",
  "filename": "kohli_1.jpg",
  "player": "Virat Kohli",
  "action": "cover drive",
  "source": "duckduckgo",
  "path": "images/Virat_Kohli/kohli_1.jpg",
  "fileUrl": "https://cloudinary.example.com/virat_kohli.jpg",
  "fileHash": "hash_Virat_Kohli_kohli_1_jpg",
  "fileType": "image",
  "fileSize": 2048576,
  "status": "active",
  "category": "cricket",
  "uploadedAt": "2026-04-19T10:30:00Z",
  "detectionCount": 2,
  "lastDetectedAt": "2026-04-18T15:45:00Z",
  "owner": "ObjectId(user_id)",
  "tags": ["cricket", "batting", "virat", "kohli"],
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "resolution": "1920x1080",
    "colorSpace": "RGB",
    "bitDepth": 8
  },
  "platforms": ["youtube", "instagram", "twitter", "facebook", "tiktok"],
  "createdAt": "2026-04-19T10:30:00Z",
  "updatedAt": "2026-04-19T10:30:00Z"
}
```

---

## 🔗 Relationships Diagram

```
User (1) ─────────── Assets (Many)
  |                    |
  |                    └─── Detections (Many) ─── Platform URLs
  |
  └─────────────────── Alerts (Many)
```

---

## ⚡ Performance Optimization

### Indexed Fields:
- `owner + status` - Fast user asset filtering
- `player` - Player search
- `fileHash` - Duplicate detection
- `createdAt` - Timeline queries
- `uploadedAt` - Recent uploads
- `category + status` - Category filtering

### Query Optimization Tips:
1. Always filter by `owner` when querying user-specific assets
2. Use `fileHash` for duplicate detection
3. Leverage `player` index for cricket player lookups
4. Sort by `createdAt` for pagination

---

## 📞 Support Information

For issues or questions:
- Check [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed setup
- Review seed script at `src/seeds/seedDatabase.js`
- Check model files in `src/models/`

