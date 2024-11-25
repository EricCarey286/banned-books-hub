//const https = require("https")
import express from "express";
const app = express();
import helmet from "helmet";
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

//helmet for security middleware
app.use(helmet())

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "success" });
});

app.use("/books", booksRouter);

/* Error handler middleware */
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  const errorResponse = {
    message: err.message,
    details: err.details || null,
    stack: err.stack
  };

  console.error("Error details: ", errorResponse);
  res.status(statusCode).json(errorResponse);
  return;
});

app.listen(PORT, () => {
  console.log(`Listening at https://localhost:${PORT}`);
});