import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

export const verifyJWT = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ message: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const verifyAdmin = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ message: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Check if user is admin
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};