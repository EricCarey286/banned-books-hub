//const https = require("https")
import express from "express";
const app = express();
import helmet from "helmet";
import booksRouter from "./routes/bookRouter";
import { PORT } from './utils/config';

import { Request, Response, NextFunction } from 'express';

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;

      // Maintain proper stack trace
      Error.captureStackTrace(this, this.constructor);
  }
}

//helmet for security middleware
app.use(helmet())

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

app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}`);
});