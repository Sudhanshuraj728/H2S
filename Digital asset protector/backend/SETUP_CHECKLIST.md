# ✅ OptiPrimes MongoDB Database Setup - Checklist

## Pre-Setup Requirements
- [ ] MongoDB Atlas account created
- [ ] Cluster created and running
- [ ] Database user created with credentials
- [ ] IP whitelist configured (allow your IP)
- [ ] Node.js and npm installed locally

---

## Installation & Setup

### Step 1: Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Add MongoDB URI: `MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/optiprimes`
- [ ] Add JWT Secret
- [ ] Add other optional settings (Cloudinary, email, etc.)

### Step 2: Dependencies
- [ ] Run `npm install`
- [ ] Verify no installation errors
- [ ] Check `node_modules` exists

### Step 3: Database Connection
- [ ] Test connection with `npm run seed` (first time will create/seed)
- [ ] See success message: "✅ Connected to MongoDB"
- [ ] See: "✨ Seeding complete!"

### Step 4: Verify Database
- [ ] Connect to MongoDB Atlas dashboard
- [ ] Open `optiprimes` database
- [ ] Confirm 4 collections exist:
  - [ ] users
  - [ ] assets
  - [ ] detections
  - [ ] alerts

---

## Data Verification

### Users Collection
- [ ] 1 document created (testuser@optiprimes.com)
- [ ] Field: firstName = "Test"
- [ ] Field: lastName = "User"
- [ ] Field: role = "user"
- [ ] Password is hashed (not readable)

### Assets Collection
- [ ] 11+ documents created
- [ ] Each has a cricket player name
- [ ] Each has an action (cover drive, bowling, etc.)
- [ ] Each has unique fileHash
- [ ] Each has status = "active"
- [ ] All have owner reference
- [ ] Some have detections (randomly populated)

### Sample Assets Check
- [ ] Virat Kohli asset exists
- [ ] MS Dhoni asset exists
- [ ] Rohit Sharma asset exists
- [ ] All have metadata.width and height
- [ ] All have platforms array populated
- [ ] All have tags array

### Detections Collection
- [ ] Multiple documents exist (40% of assets)
- [ ] Each references an asset
- [ ] Each has a platform (youtube, instagram, etc.)
- [ ] Each has confidence score
- [ ] Each has status (pending/reported/resolved)

---

## Database Indexes
- [ ] Index on `owner + status` exists
- [ ] Index on `fileHash` exists
- [ ] Index on `player` exists
- [ ] Index on `uploadedAt` exists
- [ ] No duplicate indexes

---

## Document Structure Validation

### Test Asset Document
```javascript
db.assets.findOne({ player: "Virat Kohli" })
```
Returns document with:
- [ ] _id
- [ ] player ✓
- [ ] action ✓
- [ ] filename ✓
- [ ] source ✓
- [ ] path ✓
- [ ] fileUrl ✓
- [ ] fileHash ✓
- [ ] fileType ✓
- [ ] fileSize ✓
- [ ] owner ✓
- [ ] status ✓
- [ ] metadata ✓
- [ ] tags ✓
- [ ] createdAt ✓
- [ ] updatedAt ✓

---

## Query Testing

### Basic Queries
- [ ] `db.assets.countDocuments()` returns > 10
- [ ] `db.users.countDocuments()` returns 1
- [ ] `db.detections.countDocuments()` returns > 0

### Search Queries
- [ ] `db.assets.find({ player: "Virat Kohli" })` returns results
- [ ] `db.assets.find({ action: "cover drive" })` returns results
- [ ] `db.assets.find({ status: "active" })` returns results

### Aggregation
- [ ] Can run: `db.assets.find({ owner: ObjectId("...") })`
- [ ] Can group by player
- [ ] Can count by action

---

## Server Setup

### Start Development Server
- [ ] Run `npm run dev`
- [ ] No connection errors
- [ ] Server logs show MongoDB connected
- [ ] Server ready on port 5000 (or configured port)

### Test API Endpoints (Optional)
- [ ] GET /api/assets returns data
- [ ] GET /api/assets/:id works
- [ ] POST /api/assets accepts new asset
- [ ] Error handling works properly

---

## Performance Verification

### Query Speed
- [ ] Player query returns instantly
- [ ] Status filter is fast
- [ ] Hash lookup is immediate
- [ ] Owner filtering is efficient

### Database Metrics
- [ ] Check MongoDB Atlas metrics
- [ ] No slow queries in logs
- [ ] Connection count is normal
- [ ] Database size is reasonable

---

## Documentation Review

- [ ] Read QUICK_START.md ✓
- [ ] Reviewed DATABASE_SETUP.md ✓
- [ ] Checked CRICKET_DATABASE_GUIDE.md ✓
- [ ] Understood IMPLEMENTATION_SUMMARY.md ✓
- [ ] Reviewed DATABASE_VISUAL_REFERENCE.md ✓

---

## Files Created/Modified

### New Files Created
- [ ] `src/seeds/seedDatabase.js` - Seeding script
- [ ] `DATABASE_SETUP.md` - Technical setup guide
- [ ] `CRICKET_DATABASE_GUIDE.md` - Field reference
- [ ] `IMPLEMENTATION_SUMMARY.md` - Overview
- [ ] `DATABASE_VISUAL_REFERENCE.md` - Visual diagrams
- [ ] `QUICK_START.md` - Quick guide
- [ ] `.env.example` - Environment template
- [ ] This checklist file

### Modified Files
- [ ] `src/models/asset.model.js` - Added cricket fields
- [ ] `package.json` - Added seed script

---

## Backup & Recovery

- [ ] Backup plan in place
- [ ] MongoDB Atlas backup enabled
- [ ] Know how to restore if needed
- [ ] Keep .env file safe (credentials)

---

## Security Checklist

- [ ] Passwords are hashed (bcryptjs)
- [ ] JWT secret is strong and unique
- [ ] CORS origin is configured
- [ ] No credentials in git/code
- [ ] .env file in .gitignore
- [ ] Database user has limited permissions
- [ ] IP whitelist is configured in Atlas

---

## Troubleshooting

### If Connection Fails
- [ ] Check MONGODB_URI format
- [ ] Verify credentials are correct
- [ ] Check IP whitelist in MongoDB Atlas
- [ ] Ensure cluster is running
- [ ] Test connection string in mongosh

### If Seed Fails
- [ ] Check MongoDB connection first
- [ ] Verify database user has write permissions
- [ ] Check disk space on MongoDB
- [ ] Review error logs for specifics
- [ ] Try deleting collections and reseeding

### If Queries Are Slow
- [ ] Verify indexes are created
- [ ] Check MongoDB Atlas metrics
- [ ] Review query patterns
- [ ] Consider adding more specific indexes

---

## Next Steps After Setup

1. **Development**: Start building API endpoints
2. **Testing**: Create unit tests for database operations
3. **Monitoring**: Set up MongoDB Atlas alerts
4. **Scaling**: Plan for production deployment
5. **Documentation**: Update API docs with endpoints

---

## Team Handoff

Before giving to team members:
- [ ] Environment configured
- [ ] Database populated with sample data
- [ ] All documentation read
- [ ] Credentials shared securely
- [ ] Permissions verified
- [ ] Backup procedure documented
- [ ] Support contact information provided

---

## Production Readiness

- [ ] Backup and recovery tested
- [ ] Monitoring alerts configured
- [ ] Connection pooling optimized
- [ ] Indexes verified for production queries
- [ ] Data validation rules enforced
- [ ] Audit logging enabled
- [ ] Performance baseline established

---

## Success Indicators ✨

When all checks are complete, you'll have:

✅ A fully functional MongoDB database with cricket player data
✅ Sample assets with realistic metadata
✅ Detection records tracking copyright violations
✅ Performance-optimized indexes
✅ Comprehensive documentation
✅ Ready-to-use seeding script
✅ Test data for development

**🎉 You're ready to build the OptiPrimes API!**

---

## Contact & Support

- 📖 Check documentation files first
- 🔍 Search MongoDB documentation
- 💬 Ask team members for help
- 🐛 Report issues with specific error messages

---

**Last Updated**: 2026-04-19
**Database Version**: 1.0
**Status**: ✅ Complete
