================================================
   OPTIPRIMES - API TESTING GUIDE (POSTMAN)
================================================

Base URL: http://localhost:8000

================================================
PART 1: USER AUTHENTICATION (6 Endpoints)
================================================

1️⃣  REGISTER NEW USER
----
Method: POST
URL: http://localhost:8000/api/users/register
Headers: 
  Content-Type: application/json

Body (JSON):
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+919876543210",
  "company": "Digital Corp"
}

Expected Response: 201
{
  "statusCode": 201,
  "data": {
    "user": {...},
    "accessToken": "token_here",
    "refreshToken": "token_here"
  },
  "message": "User registered successfully"
}

⚠️ SAVE: accessToken, refreshToken (for next requests)


2️⃣  LOGIN USER
----
Method: POST
URL: http://localhost:8000/api/users/login
Headers: 
  Content-Type: application/json

Body (JSON):
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "user": {...},
    "accessToken": "token_here",
    "refreshToken": "token_here"
  },
  "message": "Login successful"
}

⚠️ SAVE: New accessToken and refreshToken


3️⃣  GET CURRENT USER (Protected)
----
Method: GET
URL: http://localhost:8000/api/users/me
Headers:
  Authorization: Bearer <accessToken>
  (OR Cookie: accessToken=<token>)

Expected Response: 200
{
  "statusCode": 200,
  "data": { user details },
  "message": "Current user retrieved"
}


4️⃣  UPDATE USER PROFILE (Protected)
----
Method: PUT
URL: http://localhost:8000/api/users/profile
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "company": "New Company"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated user },
  "message": "Profile updated successfully"
}


5️⃣  REFRESH ACCESS TOKEN
----
Method: POST
URL: http://localhost:8000/api/users/refresh-token
Headers:
  Content-Type: application/json

Body (JSON):
{
  "refreshToken": "<your_refresh_token>"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "accessToken": "new_token",
    "refreshToken": "new_token"
  },
  "message": "Tokens refreshed"
}


6️⃣  LOGOUT USER (Protected)
----
Method: POST
URL: http://localhost:8000/api/users/logout
Headers:
  Authorization: Bearer <accessToken>

Expected Response: 200
{
  "statusCode": 200,
  "message": "Logout successful"
}


================================================
PART 2: ASSET MANAGEMENT (8 Endpoints)
================================================

⚠️ All Asset endpoints REQUIRE: Authorization: Bearer <accessToken>

1️⃣  CREATE ASSET (Protected)
----
Method: POST
URL: http://localhost:8000/api/assets
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "title": "My Logo Design",
  "description": "Original logo design for my brand",
  "fileUrl": "https://res.cloudinary.com/example/image/upload/v1234/logo.png",
  "fileHash": "abc123def456ghi789jkl012",
  "fileType": "image/png",
  "fileSize": 256000,
  "platforms": ["instagram", "facebook"],
  "metadata": {
    "createdDate": "2024-01-15",
    "resolution": "1920x1080",
    "colorSpace": "RGB"
  }
}

Expected Response: 201
{
  "statusCode": 201,
  "data": { asset object },
  "message": "Asset uploaded successfully"
}

⚠️ SAVE: assetId from response


2️⃣  GET ALL ASSETS (Protected)
----
Method: GET
URL: http://localhost:8000/api/assets?page=1&limit=10&status=active

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "assets": [ {...}, {...} ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  },
  "message": "Assets retrieved successfully"
}


3️⃣  GET ASSET BY ID (Protected)
----
Method: GET
URL: http://localhost:8000/api/assets/:assetId
(Replace :assetId with actual ID)

Expected Response: 200
{
  "statusCode": 200,
  "data": { asset details },
  "message": "Asset retrieved successfully"
}


4️⃣  UPDATE ASSET (Protected)
----
Method: PUT
URL: http://localhost:8000/api/assets/:assetId
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "title": "Updated Logo",
  "description": "Updated description",
  "platforms": ["instagram", "facebook", "twitter"],
  "status": "active"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated asset },
  "message": "Asset updated successfully"
}


5️⃣  GET ASSET BY FILE HASH (Protected)
----
Method: GET
URL: http://localhost:8000/api/assets/by-hash/abc123def456ghi789jkl012

Expected Response: 200
{
  "statusCode": 200,
  "data": { asset object },
  "message": "Asset retrieved successfully"
}


6️⃣  FLAG ASSET (Protected)
----
Method: POST
URL: http://localhost:8000/api/assets/:assetId/flag
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "reason": "Found unauthorized copy on YouTube"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated asset with status: "flagged" },
  "message": "Asset flagged successfully"
}


7️⃣  GET ASSET STATISTICS (Protected)
----
Method: GET
URL: http://localhost:8000/api/assets/stats

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "statistics": {
      "totalAssets": 2,
      "protectedAssets": 1,
      "flaggedAssets": 1,
      "totalDetections": 0
    }
  },
  "message": "Statistics retrieved successfully"
}


8️⃣  DELETE ASSET (Protected)
----
Method: DELETE
URL: http://localhost:8000/api/assets/:assetId

Expected Response: 200
{
  "statusCode": 200,
  "message": "Asset deleted successfully"
}


================================================
PART 3: DETECTION TRACKING (9 Endpoints)
================================================

⚠️ All Detection endpoints REQUIRE: Authorization: Bearer <accessToken>

1️⃣  CREATE DETECTION (Protected)
----
Method: POST
URL: http://localhost:8000/api/detections
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "assetId": "<asset_id>",
  "platform": "youtube",
  "detectedUrl": "https://www.youtube.com/watch?v=xyz123",
  "confidence": 95,
  "matchScore": 92,
  "thumbnailUrl": "https://img.youtube.com/vi/xyz123/0.jpg"
}

Expected Response: 201
{
  "statusCode": 201,
  "data": { detection object },
  "message": "Detection recorded successfully"
}

⚠️ SAVE: detectionId


2️⃣  GET ALL DETECTIONS (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections?page=1&limit=10&status=pending&platform=youtube

Query Params:
  page: 1
  limit: 10
  status: pending (options: pending, reported, resolved, false_positive)
  platform: youtube (optional)
  assetId: (optional)

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "detections": [...],
    "pagination": {...}
  },
  "message": "Detections retrieved successfully"
}


3️⃣  GET DETECTION BY ID (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections/:detectionId

Expected Response: 200
{
  "statusCode": 200,
  "data": { detection details },
  "message": "Detection retrieved successfully"
}


4️⃣  GET DETECTIONS BY ASSET (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections/asset/:assetId?page=1&limit=10

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "asset": { asset info },
    "detections": [...],
    "pagination": {...}
  },
  "message": "Asset detections retrieved successfully"
}


5️⃣  GET DETECTIONS BY PLATFORM (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections/platform/youtube

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "stats": {
      "platform": "youtube",
      "totalDetections": 1,
      "resolved": 0,
      "pending": 1,
      "reported": 0
    },
    "detections": [...]
  },
  "message": "Detections from youtube retrieved successfully"
}


6️⃣  GET DETECTION STATISTICS (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections/stats

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "summary": {
      "totalDetections": 1,
      "pending": 1,
      "resolved": 0,
      "reported": 0,
      "falsePositives": 0
    },
    "byPlatform": [...],
    "byStatus": [...]
  },
  "message": "Statistics retrieved"
}


7️⃣  GET RECENT DETECTIONS (Protected)
----
Method: GET
URL: http://localhost:8000/api/detections/recent?limit=10

Expected Response: 200
{
  "statusCode": 200,
  "data": [ recent detections ],
  "message": "Recent detections retrieved successfully"
}


8️⃣  UPDATE DETECTION STATUS (Protected)
----
Method: PUT
URL: http://localhost:8000/api/detections/:detectionId/status
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "status": "reported",
  "reportDetails": {
    "reportType": "DMCA",
    "reportedTo": "YouTube",
    "reportDate": "2024-04-19"
  },
  "notes": "DMCA sent to platform"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated detection },
  "message": "Detection status updated successfully"
}


9️⃣  MARK AS FALSE POSITIVE (Protected)
----
Method: POST
URL: http://localhost:8000/api/detections/:detectionId/false-positive
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "reason": "Not actually our content, different artwork"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { detection with false_positive status },
  "message": "Detection marked as false positive"
}


================================================
PART 4: ALERT MANAGEMENT (10 Endpoints)
================================================

⚠️ All Alert endpoints REQUIRE: Authorization: Bearer <accessToken>

1️⃣  CREATE ALERT (Protected)
----
Method: POST
URL: http://localhost:8000/api/alerts
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "assetId": "<asset_id>",
  "detectionId": "<detection_id>",
  "title": "YouTube Copyright Violation",
  "description": "Your logo found on unauthorized channel with 100K views",
  "violationType": "copyright",
  "severity": "high"
}

Expected Response: 201
{
  "statusCode": 201,
  "data": { alert object },
  "message": "Alert created successfully"
}

⚠️ SAVE: alertId


2️⃣  GET ALL ALERTS (Protected)
----
Method: GET
URL: http://localhost:8000/api/alerts?page=1&limit=10&status=open&severity=high

Query Params:
  page: 1
  limit: 10
  status: open (options: open, acknowledged, in_progress, resolved, closed)
  severity: high (options: low, medium, high, critical)
  violationType: copyright (optional)
  assetId: (optional)

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "alerts": [...],
    "pagination": {...}
  },
  "message": "Alerts retrieved successfully"
}


3️⃣  GET ALERT BY ID (Protected)
----
Method: GET
URL: http://localhost:8000/api/alerts/:alertId

Expected Response: 200
{
  "statusCode": 200,
  "data": { alert details },
  "message": "Alert retrieved successfully"
}


4️⃣  GET OPEN ALERTS (Dashboard Widget) (Protected)
----
Method: GET
URL: http://localhost:8000/api/alerts/open?limit=10

Expected Response: 200
{
  "statusCode": 200,
  "data": [ open/unresolved alerts ],
  "message": "Open alerts retrieved successfully"
}


5️⃣  GET ALERT STATISTICS (Protected)
----
Method: GET
URL: http://localhost:8000/api/alerts/stats

Expected Response: 200
{
  "statusCode": 200,
  "data": {
    "summary": {
      "totalAlerts": 1,
      "open": 1,
      "resolved": 0,
      "closed": 0
    },
    "bySeverity": [...],
    "byViolationType": [...],
    "byStatus": [...]
  },
  "message": "Statistics retrieved"
}


6️⃣  UPDATE ALERT STATUS (Protected)
----
Method: PUT
URL: http://localhost:8000/api/alerts/:alertId/status
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "status": "in_progress",
  "notes": "Contacting platform support"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated alert },
  "message": "Alert status updated from open to in_progress"
}


7️⃣  ASSIGN ALERT (Protected)
----
Method: POST
URL: http://localhost:8000/api/alerts/:alertId/assign
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "assignedToId": "<admin_user_id>"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated alert with assignedTo field },
  "message": "Alert assigned successfully"
}


8️⃣  RECORD DMCA ACTION (Protected)
----
Method: POST
URL: http://localhost:8000/api/alerts/:alertId/dmca
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "dmcaSent": true,
  "copyrightReportFiled": true,
  "contentRemoved": false,
  "actionDetails": "DMCA notice sent to YouTube on 2024-04-19"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated alert with actionTaken details },
  "message": "DMCA action recorded successfully"
}


9️⃣  ESCALATE ALERT (Protected)
----
Method: POST
URL: http://localhost:8000/api/alerts/:alertId/escalate
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "reason": "Content still not removed after 48 hours",
  "escalationLevel": 2
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { updated alert with escalation history },
  "message": "Alert escalated successfully"
}


🔟  CLOSE ALERT (Protected)
----
Method: POST
URL: http://localhost:8000/api/alerts/:alertId/close
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Body (JSON):
{
  "closureReason": "Content removed, violation resolved"
}

Expected Response: 200
{
  "statusCode": 200,
  "data": { closed alert },
  "message": "Alert closed successfully"
}


================================================
TESTING WORKFLOW
================================================

Step 1: Register New User
  POST /api/users/register
  Save: accessToken, refreshToken

Step 2: Create Asset
  POST /api/assets
  Save: assetId

Step 3: Create Detection
  POST /api/detections
  with assetId from step 2
  Save: detectionId

Step 4: Create Alert
  POST /api/alerts
  with assetId and detectionId from previous steps
  Save: alertId

Step 5: Update Detection Status
  PUT /api/detections/:detectionId/status
  status: "reported"

Step 6: Record DMCA Action
  POST /api/alerts/:alertId/dmca
  Mark dmcaSent: true

Step 7: Get Statistics
  GET /api/assets/stats
  GET /api/detections/stats
  GET /api/alerts/stats

Step 8: Close Alert
  POST /api/alerts/:alertId/close

================================================
ERROR HANDLING TESTS
================================================

Test 1: Missing Required Fields
  POST /api/assets
  (send empty body)
  Expected: 400 Bad Request

Test 2: Unauthorized Access
  GET /api/users/me
  (without accessToken)
  Expected: 401 Unauthorized

Test 3: Invalid Asset ID
  GET /api/assets/invalid_id
  Expected: 404 Not Found

Test 4: Duplicate Email
  POST /api/users/register
  with email that already exists
  Expected: 409 Conflict

Test 5: Wrong Password
  POST /api/users/login
  with incorrect password
  Expected: 401 Unauthorized

================================================
