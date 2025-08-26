import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
const http = require("http");
const app = express();
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import booksRouter from "./routes/bookRouter";
import suggestedbookRouter from "./routes/suggestedBookRouter";
import contactFormRouter from "./routes/contactFormRouter";
import bookImageRouter from "./routes/imageRouter";

import { PORT } from './utils/config';
import { AppError } from "./utils/helper";

import { Request, Response, NextFunction } from 'express';

const FRONTEND_URL = `${process.env.URL_PREFIX}://${process.env.FRONTEND_URL}`;
const BACKEND_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
const JWT_SECRET = process.env.JWT_SECRET || 'missing-key';
const JWT_EXPIRES_IN = '24h';

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

interface AuthRequest extends Request {
  user?: {
    username: string;
    role: string;
  };
}

// Authentication Middleware using JWT
/**
 * Authenticates a user request by verifying the JWT token.
 *
 * This function extracts the JWT token from the Authorization header,
 * verifies its authenticity using the secret key, and attaches the decoded
 * payload to the request object if verification is successful. If the token
 * is missing, invalid, or expired, it responds with an appropriate error status
 * and message.
 */
const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: "Authorization token required" });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string, role: string };
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

//express-rate-limit for overload prevention
app.set('trust proxy', 1); // or true
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

const allowedOrigins = [FRONTEND_URL].filter((origin): origin is string => Boolean(origin));

const corsOptions = {
  origin: allowedOrigins, 
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(limiter);
app.use(helmet()); //helmet for security middleware
app.use(cors(corsOptions));

app.post("/api/admin/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
      success: true, 
      message: "Logged in successfully",
      token
    });
    return;
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// Protected Admin Route
app.get("/api/admin", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    message: "Welcome to the admin panel", 
    user: req.user 
  });
});

// Token validation endpoint
app.get("/api/admin/validate", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "success" });
});

//Route to each table
app.use("/books", booksRouter);
app.use("/suggested_books", suggestedbookRouter);
app.use("/contact_form", contactFormRouter);
app.use("/book-image", bookImageRouter);

//Error handler middleware
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  const errorResponse = {
    message: err.message,
    details: err.details || null,
  };

  console.error("Error details: ", errorResponse);
  res.status(statusCode).json(errorResponse);
  return;
});

// Start HTTPS server
http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`Secure server is running at ${BACKEND_URL}:${PORT}`);
});