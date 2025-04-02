import cors from "cors";
import express from "express";
const http = require("http");
const app = express();
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session"
import booksRouter from "./routes/bookRouter";
import suggestedbookRouter from "./routes/suggestedBookRouter";
import contactFormRouter from "./routes/contactFormRouter";

import { PORT } from './utils/config';
import { AppError } from "./utils/helper";

import { Request, Response, NextFunction } from 'express';

const FRONTEND_URL = `${process.env.URL_PREFIX}://${process.env.FRONTEND_URL}`;
const BACKEND_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);

declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
  }
}

// Authentication Middleware
const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session.isAuthenticated) {
    next();
    return;
  }
  
  res.status(401).json({ message: "Unauthorized" });
  return; 
};

//express-rate-limit for overload prevention
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

const allowedOrigins = [FRONTEND_URL].filter((origin): origin is string => Boolean(origin));;

const corsOptions = {
  origin: allowedOrigins, 
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(limiter);
app.use(helmet()); //helmet for security middleware
app.use(cors(corsOptions));

// Login Route
app.post("/api/admin/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAuthenticated = true;
    res.json({ success: true, message: "Logged in successfully" });
    return;
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// Protected Admin Route
app.get("/api/admin", authenticate, (req: Request, res: Response) => {
  res.json({ message: "Welcome to the admin panel" });
});

// Logout Route
app.post("/api/admin/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully" });
  });
});


app.get("/", (req: Request, res: Response) => {
  res.json({ message: "success" });
});

//Route to each table
app.use("/books", booksRouter);
app.use("/suggested_books", suggestedbookRouter);
app.use("/contact_form", contactFormRouter);

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