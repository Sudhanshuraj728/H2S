# Database Connection Setup Guide

## Current Configuration
- **Database**: MongoDB (Local)
- **Connection String**: `mongodb://localhost:27017/optiprimes`
- **Database Name**: `optiprimes`

## Prerequisites
Before running the backend, ensure:

1. **MongoDB is installed and running** on `localhost:27017`
   - Windows: Install MongoDB Community Edition or use WSL
   - Mac: `brew install mongodb-community` or Docker
   - Linux: `apt-get install mongodb`

2. **Start MongoDB** (if not running):
   - **Windows (Local)**: 
     ```powershell
     mongod
     ```
   - **Docker** (Alternative):
     ```bash
     docker run -d -p 27017:27017 --name mongodb mongo:latest
     ```

3. **Check MongoDB is running**:
   ```bash
   mongosh
   # or
   mongo
   ```

## Backend Setup

### 1. Install Dependencies
```bash
cd "OptiPrimes/Digital asset protector/backend"
npm install
```

### 2. Environment Variables
The `.env` file is already configured with:
```
MONGODB_URI=mongodb://localhost:27017/optiprimes
PORT=8000
NODE_ENV=development
```

### 3. Start Backend Server
```bash
npm run dev
# or
npm start
```

Expected output:
```
✅ MongoDB Connected: localhost
✅ Server is running on http://localhost:8000
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd "OptiPrimes/Digital asset protector/frontend"
npm install
```

### 2. Environment Configuration
Frontend connects to backend at: `http://localhost:8000/api`
(This is configured in `src/api.js`)

### 3. Start Frontend Development Server
```bash
npm run dev
```

Expected output:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Verification Checklist

- [ ] MongoDB is running and accessible on `localhost:27017`
- [ ] Backend server is running on `http://localhost:8000`
- [ ] Backend shows "✅ MongoDB Connected"
- [ ] Frontend is running on `http://localhost:5173`
- [ ] Browser console shows no connection errors

## Testing User Registration

1. Go to `http://localhost:5173/signup`
2. Fill in the form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: Test123456
   - Company (optional): Test Company
3. Click "Create Your Account"
4. Check MongoDB for the new user:
   ```bash
   mongosh
   > use optiprimes
   > db.users.find()
   ```

## Troubleshooting

### Error: "Cannot connect to MongoDB"
- Check if MongoDB is running: `mongosh`
- Verify port 27017 is open
- Check .env file has correct MONGODB_URI

### Error: "Connect ECONNREFUSED"
- Backend is not running
- Start backend with: `npm run dev`

### Error: "Network Error" on Frontend
- Backend is not running on port 8000
- Check backend terminal for errors
- Verify CORS_ORIGIN in .env (should be `http://localhost:5173`)

### Users created but not in database
- Frontend was using local storage fallback
- Ensure backend is running BEFORE signup/login
- Clear browser localStorage: F12 > Application > Clear Storage
- Try signup again

## API Endpoints

- `POST /api/users/register` - Create new user
- `POST /api/users/login` - Login user
- `GET /api/users/me` - Get current user
- `POST /api/users/logout` - Logout user
- `PUT /api/users/profile` - Update user profile

## Database Schema

### Users Collection
```json
{
  "_id": ObjectId,
  "firstName": String,
  "lastName": String,
  "email": String (unique, lowercase),
  "password": String (hashed with bcrypt),
  "phone": String (optional),
  "company": String (optional),
  "role": String (default: "user"),
  "isActive": Boolean (default: true),
  "profileImage": String (optional),
  "createdAt": Date,
  "updatedAt": Date
}
```
