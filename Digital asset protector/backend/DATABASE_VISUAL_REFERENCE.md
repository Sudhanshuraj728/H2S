# 🗄️ OptiPrimes MongoDB Database - Visual Reference

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                  │
├─────────────────────────────────────────────────────────────────┤
│ • _id (ObjectId)                                                │
│ • firstName, lastName                                           │
│ • email (unique)                                                │
│ • password (hashed)                                             │
│ • phone, company                                                │
│ • role: "user" | "admin"                                        │
│ • isActive: Boolean                                             │
│ • createdAt, updatedAt                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ owns (1:many)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ASSETS                                  │
├─────────────────────────────────────────────────────────────────┤
│ CRICKET METADATA:                                               │
│ • player: "Virat Kohli"                                         │
│ • action: "cover drive"                                         │
│ • filename: "kohli_1.jpg"                                       │
│ • source: "duckduckgo"                                          │
│ • path: "images/Virat_Kohli/kohli_1.jpg"                        │
│                                                                 │
│ FILE INFORMATION:                                               │
│ • fileUrl, fileHash (unique), fileType, fileSize               │
│                                                                 │
│ PROTECTION:                                                     │
│ • status: active | flagged | archived | deleted                │
│ • isProtected: Boolean                                          │
│ • detectionCount, lastDetectedAt                               │
│ • platforms: [youtube, instagram, twitter, ...]                │
│                                                                 │
│ TIMESTAMPS:                                                     │
│ • uploadedAt, createdAt, updatedAt                             │
│                                                                 │
│ ORGANIZATION:                                                   │
│ • category: cricket | sports | digital-art | ...              │
│ • tags: ["cricket", "batting", "virat", ...]                  │
│                                                                 │
│ RELATIONSHIPS:                                                  │
│ • owner: ObjectId → USERS                                       │
│ • detections: [ObjectId] → DETECTIONS                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ has detections (1:many)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DETECTIONS                                 │
├─────────────────────────────────────────────────────────────────┤
│ • assetId: ObjectId → ASSETS                                    │
│ • userId: ObjectId → USERS                                      │
│ • detectedUrl: "https://youtube.com/watch?v=..."               │
│ • platform: youtube | instagram | twitter | facebook | tiktok  │
│ • confidence: 0-100 (match percentage)                          │
│ • matchScore: 0-100 (fingerprint similarity)                    │
│ • thumbnailUrl: String                                          │
│ • status: pending | reported | resolved | false_positive       │
│ • detectionDate, createdAt, updatedAt                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ triggers
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ALERTS                                   │
├─────────────────────────────────────────────────────────────────┤
│ • userId: ObjectId → USERS                                      │
│ • assetId: ObjectId → ASSETS                                    │
│ • detectionId: ObjectId → DETECTIONS                            │
│ • alertType: critical | warning | info                          │
│ • message: String                                               │
│ • status: new | acknowledged | resolved                         │
│ • actionTaken: dmca_filed | takedown_requested | none          │
│ • createdAt, updatedAt                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER UPLOADS CRICKET IMAGE                                          │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1️⃣ CREATE ASSET                                                     │
│    • Generate fileHash                                              │
│    • Store in ASSETS collection                                     │
│    • Link to User (owner)                                           │
│    Status: "active"                                                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2️⃣ MONITOR PLATFORMS                                                │
│    • Scan YouTube, Instagram, Twitter, etc.                         │
│    • Match against fileHash                                         │
│    • Search for visual similarity                                   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    NO MATCH              MATCH FOUND
         │                       │
         │                       └──────────────────┐
         │                                          │
         │                    ┌─────────────────────┴──────────┐
         │                    │                                │
         │                    ▼                                │
         │            ┌──────────────────────┐                │
         │            │ 3️⃣ CREATE DETECTION │                │
         │            │ • Store platform     │                │
         │            │ • Store confidence   │                │
         │            │ • Store URL          │                │
         │            │ Status: "pending"    │                │
         │            └──────────┬───────────┘                │
         │                       │                            │
         │          ┌────────────┴──────────┐                │
         │          │                       │                │
         │  Confidence   Confidence > 85%   │
         │   < 85%       │                  │
         │    │          ▼                  │
         │    │    ┌──────────────────┐    │
         │    │    │ 4️⃣ CREATE ALERT │    │
         │    │    │ Type: critical   │    │
         │    │    │ Notify user      │    │
         │    │    └────────┬─────────┘    │
         │    │             │              │
         │    │             ▼              │
         │    │    ┌──────────────────┐    │
         │    │    │ 5️⃣ USER ACTION  │    │
         │    │    │ • File DMCA      │    │
         │    │    │ • Request       │    │
         │    │    │   takedown      │    │
         │    │    │ • Mark resolved │    │
         │    │    └────────┬─────────┘    │
         │    │             │              │
         │    └─────────────┴──────────────┘
         │
         ▼
    Continue monitoring
```

---

## Sample Data Structure

### 📸 Asset Example:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  
  // Cricket Metadata
  player: "Virat Kohli",
  action: "cover drive",
  filename: "kohli_1.jpg",
  source: "duckduckgo",
  path: "images/Virat_Kohli/kohli_1.jpg",
  
  // File Info
  title: "Virat Kohli - kohli_1.jpg",
  description: "Cricket image of Virat Kohli performing cover drive",
  fileUrl: "https://cloudinary.com/virat_kohli.jpg",
  fileHash: "hash_Virat_Kohli_kohli_1_jpg",
  fileType: "image",
  fileSize: 2048576,
  
  // Protection
  status: "active",
  isProtected: true,
  detectionCount: 2,
  lastDetectedAt: ISODate("2026-04-18T15:45:00.000Z"),
  
  // Platform Monitoring
  platforms: ["youtube", "instagram", "twitter", "facebook", "tiktok"],
  
  // Organization
  category: "cricket",
  tags: ["cricket", "batting", "virat", "kohli"],
  
  // Relationships
  owner: ObjectId("507f1f77bcf86cd799439012"),
  detections: [
    ObjectId("507f1f77bcf86cd799439013"),
    ObjectId("507f1f77bcf86cd799439014")
  ],
  
  // Metadata
  metadata: {
    width: 1920,
    height: 1080,
    format: "jpg",
    resolution: "1920x1080",
    colorSpace: "RGB",
    bitDepth: 8
  },
  
  // Timestamps
  uploadedAt: ISODate("2026-04-19T10:30:00.000Z"),
  createdAt: ISODate("2026-04-19T10:30:00.000Z"),
  updatedAt: ISODate("2026-04-19T10:30:00.000Z")
}
```

### 🔍 Detection Example:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  assetId: ObjectId("507f1f77bcf86cd799439011"),
  userId: ObjectId("507f1f77bcf86cd799439012"),
  detectedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  platform: "youtube",
  confidence: 92,
  matchScore: 88,
  thumbnailUrl: "https://cdn.example.com/thumb.jpg",
  status: "pending",
  detectionDate: ISODate("2026-04-18T15:45:00.000Z"),
  createdAt: ISODate("2026-04-18T15:45:00.000Z"),
  updatedAt: ISODate("2026-04-18T15:45:00.000Z")
}
```

---

## Status Workflows

### Asset Status Lifecycle:
```
┌──────────┐    Upload    ┌────────┐    Violation    ┌─────────┐
│ Creation │─────────────▶│ Active │───detected────▶│ Flagged │
└──────────┘              └────────┘                 └────┬────┘
                             ▲                             │
                             │                             │
                             └──────────────┬──────────────┘
                                    Action Taken
                                (Removed/Resolved)

                    User Chooses Not to Monitor
                             │
                             ▼
                          ┌──────────┐
                          │ Archived │
                          └──────────┘
                             │
                   User Wants to Delete
                             │
                             ▼
                          ┌─────────┐
                          │ Deleted │ (Soft delete)
                          └─────────┘
```

### Detection Status Lifecycle:
```
┌─────────┐     System      ┌────────┐     User        ┌──────────┐
│ Created │────detects────▶│ Pending │──reports────────▶│ Reported │
└─────────┘                 └────────┘                  └────┬─────┘
                                                             │
                                              Platform Removes Content
                                                             │
                                                             ▼
                                                        ┌──────────┐
                                                        │ Resolved │
                                                        └──────────┘

                   Not Actually a Violation
                             │
                             ▼
                        ┌───────────────┐
                        │ False_Positive│
                        └───────────────┘
```

---

## Index Strategy

```
┌──────────────────────────────────────────────────────────────┐
│ INDEX NAME              │ FIELDS              │ PURPOSE       │
├──────────────────────────────────────────────────────────────┤
│ owner_status            │ owner, status       │ User filtering│
│ fileHash                │ fileHash            │ Duplicates    │
│ createdAt_desc          │ createdAt: -1       │ Timeline      │
│ player                  │ player              │ Player search │
│ player_action           │ player, action      │ Combined      │
│ category_status         │ category, status    │ Category view │
│ uploadedAt_desc         │ uploadedAt: -1      │ Recent assets │
└──────────────────────────────────────────────────────────────┘
```

---

## Search Examples

```
Find Virat Kohli's cover drives:
db.assets.find({ player: "Virat Kohli", action: "cover drive" })

Find all detected assets:
db.assets.find({ detectionCount: { $gt: 0 } })

Find pending detections:
db.detections.find({ status: "pending" })

Most detected assets:
db.assets.find().sort({ detectionCount: -1 }).limit(10)

Assets from last 30 days:
db.assets.find({ uploadedAt: { $gte: ISODate("2026-03-20") } })

User's protected cricket assets:
db.assets.find({ owner: userId, category: "cricket", isProtected: true })
```

---

## Cricket Players Included

```
👤 Virat Kohli          → cover drive, pull shot, defensive
👤 MS Dhoni             → helicopter shot, stumping, keeping
👤 Rohit Sharma         → drive, pull shot
👤 Bumrah               → bowling, yorker
👤 KL Rahul             → cover drive, defense
👤 Pandya               → batting, bowling
👤 Bhuvi                → bowling, pace bowling
👤 Chris Gayle          → power batting, six
👤 Ben Stokes           → batting, bowling
👤 Steve Smith          → batting, fielding
👤 AB de Villiers       → batting, wicket keeping
```

---

## Quick Statistics

| Metric | Value |
|--------|-------|
| Collections | 4 (users, assets, detections, alerts) |
| Cricket Players | 11 pre-seeded |
| Sample Assets | ~20+ per run |
| Indexes | 7 performance indexes |
| Test User Email | testuser@optiprimes.com |
| Default Status | "active" |
| Platform Count | 7+ monitored |

---

This is your MongoDB database structure! 🚀
