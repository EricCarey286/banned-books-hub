const https = require("https");
import fs from "fs";
import cors from "cors";
import express from "express";
const app = express();
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import booksRouter from "./routes/bookRouter";
import { PORT } from './utils/config';
import { AppError } from "./utils/helper";

import { Request, Response, NextFunction } from 'express';

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

//express-rate-limit for overload prevention
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

const corsOptions = {
  origin: "http://localhost:3000", //TODO: update to frontend domain (for production)
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(limiter);
app.use(helmet()); //helmet for security middleware
app.use(cors()); //TODO: switch to (corsOptions)


app.get("/", (req: Request, res: Response) => {
  res.json({ message: "success" });
});

app.use("/books", booksRouter);

/* Error handler middleware */
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });
  return;
});

// HTTPS Server Configuration
const sslOptions = {
  key: fs.readFileSync("certs/server.key"), // Path to private key
  cert: fs.readFileSync("certs/server.cert"), // Path to certificate
};

// Start HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Secure server is running at https://localhost:${PORT}`);
});