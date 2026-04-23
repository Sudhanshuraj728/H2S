# MongoDB Setup Guide for OptiPrimes

## Database Name
**optiprimes**

## Collections & Schema Overview

### 1. **users** Collection
Stores user account information with authentication.

**Schema:**
```javascript
{
  firstName: String,          // User's first name
  lastName: String,           // User's last name
  email: String,              // Unique email (indexed)
  password: String,           // Hashed password
  phone: String,              // Optional phone number
  company: String,            // Optional company name
  role: String,               // "user" or "admin" (enum)
  isActive: Boolean,          // Account active status
  profileImage: String,       // Profile picture URL
  createdAt: Date,            // Auto-generated timestamp
  updatedAt: Date             // Auto-generated timestamp
}
```

### 2. **assets** Collection
Stores digital assets (images, videos) uploaded by users for protection.

**Schema:**
```javascript
{
  // Basic Information
  title: String,              // Asset title (required, indexed)
  description: String,        // Optional description
  category: String,           // "cricket", "sports", "digital-art", "brand", etc.
  
  // File Information
  fileUrl: String,            // Cloudinary or CDN URL
  fileHash: String,           // Unique cryptographic hash (required, unique, indexed)
  fileType: String,           // "image", "video", "document", "audio"
  fileSize: Number,           // File size in bytes
  
  // Cricket-Specific Metadata
  filename: String,           // Original filename (e.g., "kohli_1.jpg")
  player: String,             // Player name (indexed, e.g., "Virat Kohli")
  action: String,             // Action performed (e.g., "cover drive", "bowling")
  source: String,             // Image source (e.g., "duckduckgo", "cricket.com")
  path: String,               // Local file system path
  hash: String,               // Additional hash for duplicate detection
  uploadedAt: Date,           // Upload timestamp
  
  // Detailed Metadata
  metadata: {
    width: Number,            // Image width in pixels
    height: Number,           // Image height in pixels
    duration: Number,         // Video duration in seconds
    format: String,           // File format (png, jpg, mp4, etc.)
    resolution: String,       // "1920x1080", "4K", etc.
    colorSpace: String,       // RGB, CMYK, etc.
    bitDepth: Number          // 8-bit, 16-bit, 32-bit
  },
  
  // Tags & Organization
  tags: [String],             // Custom tags for filtering
  
  // Ownership & Relationships
  owner: ObjectId,            // Reference to User (required, indexed)
  detections: [ObjectId],     // Array of Detection references
  alerts: [ObjectId],         // Array of Alert references
  
  // Protection & Status
  status: String,             // "active", "flagged", "archived", "deleted"
  isProtected: Boolean,       // Protection status
  
  // Platform Information
  platforms: [String],        // Platforms to scan (youtube, instagram, etc.)
  
  // Detection Tracking
  detectionCount: Number,     // Number of times detected elsewhere
  lastDetectedAt: Date,       // Last detection timestamp
  
  // Timestamps
  uploadDate: Date,           // Upload date
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

### 3. **detections** Collection
Records instances where assets are detected on other platforms.

**Schema:**
```javascript
{
  // Detection Target
  assetId: ObjectId,          // Reference to Asset (required, indexed)
  userId: ObjectId,           // Reference to User (required, indexed)
  
  // Detection Location
  detectedUrl: String,        // Full URL where detected
  platform: String,           // "youtube", "instagram", "twitter", "facebook", etc.
  
  // Detection Details
  confidence: Number,         // 0-100, match percentage
  matchScore: Number,         // 0-100, fingerprint similarity
  thumbnailUrl: String,       // Thumbnail of detected content
  
  // Status
  status: String,             // "pending", "reported", "resolved", "false_positive"
  
  // Timestamps
  detectionDate: Date,        // When detected (auto-generated)
  reportedAt: Date,           // When reported
  resolvedAt: Date,           // When resolved
  
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

### 4. **alerts** Collection
Critical notifications for copyright violations.

**Schema:**
```javascript
{
  userId: ObjectId,           // Reference to User
  assetId: ObjectId,          // Reference to Asset
  detectionId: ObjectId,      // Reference to Detection
  
  alertType: String,          // "critical", "warning", "info"
  message: String,            // Alert message
  status: String,             // "new", "acknowledged", "resolved"
  
  actionTaken: String,        // "dmca_filed", "takedown_requested", "none"
  
  createdAt: Date,
  updatedAt: Date
}
```

## Sample Data

### User Example:
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "testuser@optiprimes.com",
  "password": "hashed_password_here",
  "phone": "+91-9876543210",
  "company": "OptiPrimes",
  "role": "user",
  "isActive": true,
  "createdAt": "2026-04-19T10:00:00Z"
}
```

### Asset Example:
```json
{
  "filename": "kohli_1.jpg",
  "player": "Virat Kohli",
  "action": "cover drive",
  "source": "duckduckgo",
  "path": "images/Virat_Kohli/kohli_1.jpg",
  "title": "Virat Kohli - kohli_1.jpg",
  "description": "Cricket image of Virat Kohli performing cover drive",
  "fileUrl": "https://cloudinary.com/virat_kohli.jpg",
  "fileHash": "hash_Virat_Kohli_kohli_1_jpg",
  "fileType": "image",
  "fileSize": 2048576,
  "uploadedAt": "2026-04-19T10:30:00Z",
  "status": "active",
  "category": "cricket",
  "owner": "ObjectId(user_id)",
  "tags": ["cricket", "batting", "virat", "kohli"],
  "detectionCount": 0,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "resolution": "1920x1080",
    "colorSpace": "RGB",
    "bitDepth": 8
  },
  "createdAt": "2026-04-19T10:30:00Z"
}
```

### Detection Example:
```json
{
  "assetId": "ObjectId(asset_id)",
  "userId": "ObjectId(user_id)",
  "detectedUrl": "https://www.youtube.com/watch?v=xyz123abc",
  "platform": "youtube",
  "confidence": 92,
  "matchScore": 88,
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "status": "pending",
  "detectionDate": "2026-04-18T15:45:00Z"
}
```

## Indexes Created

The Asset model has the following indexes for optimization:
- `owner + status` - Quick filtering by user and status
- `fileHash` - Fast duplicate detection
- `createdAt` (descending) - Recent assets first
- `player` - Player name search
- `player + action` - Combined player and action filtering
- `category + status` - Category-based filtering
- `uploadedAt` (descending) - Recently uploaded first

## Setup Instructions

### 1. Create MongoDB Cluster (MongoDB Atlas)
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a new cluster
- Create a database user and get the connection string
- Update `.env` file with MongoDB URI

### 2. Run Seed Script
```bash
# Install dependencies first
npm install

# Run seed script to populate sample data
node src/seeds/seedDatabase.js
```

### 3. Verify Database
```bash
# Connect to MongoDB and check collections
mongo "mongodb+srv://username:password@cluster.mongodb.net/optiprimes"

# List all collections
show collections

# Check documents in assets collection
db.assets.find().pretty()
```

## Connection String Format
```
mongodb+srv://username:password@cluster-name.mongodb.net/optiprimes?retryWrites=true&w=majority
```

Replace:
- `username` - Your MongoDB user
- `password` - Your MongoDB password
- `cluster-name` - Your cluster name from Atlas

## Best Practices

1. **Always create indexes** - Predefined indexes improve query performance
2. **Use schema validation** - Validate documents on insert/update
3. **Encrypt sensitive data** - Passwords, API keys should be hashed
4. **Monitor database usage** - Check Atlas metrics regularly
5. **Backup regularly** - Enable Atlas backup
6. **Use transactions** - For operations spanning multiple documents
7. **Optimize queries** - Use appropriate indexes for frequently used queries

## Troubleshooting

### Connection Issues
- Check MONGODB_URI in .env
- Verify IP whitelist in MongoDB Atlas
- Ensure credentials are correct

### Duplicate Key Error
- fileHash field has unique constraint
- Ensure no duplicate files are being inserted
- Use `db.assets.deleteOne()` to remove duplicates

### Slow Queries
- Check if appropriate indexes exist
- Review query patterns
- Use `explain()` to analyze query performance
