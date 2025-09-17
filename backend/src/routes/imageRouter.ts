const expressRouter = require('express');
import { Request, Response, NextFunction } from "express";
import { AppError } from '../utils/helper';
const bookImageRouter = expressRouter.Router();
import multer from "multer";
import { minioClient } from "../utils/config";

import * as fs from 'fs'
import * as path from 'path'

const upload = multer({ storage: multer.memoryStorage() });
const BUCKETNAME = "book-images";

bookImageRouter.post("/upload", upload.single("image"), async function (req: Request, res: Response, next: NextFunction) {

  try {
    const file = req.file;
    console.log('file: ' + file);
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const fileName = req.body.isbn
      ? `${req.body.isbn}${getFileExtension(file.originalname)}`
      : file.originalname;

    console.log('fileName: ' + fileName)

    //ensure bucket exists
    const exists = await minioClient.bucketExists(BUCKETNAME).catch(() => false);
    if (!exists) {
      console.log('Missing bucket');
      await minioClient.makeBucket(BUCKETNAME, "us-east-1");
    }
    try {
      await minioClient.putObject(
        BUCKETNAME,
        fileName,
        file.buffer,
        file.size,
        { "Content-Type": file.mimetype }
      );
    } catch (err) {
      console.error("MinIO upload error:", err);
      return res.status(500).json({ error: "Upload failed", details: err });
    }

    res.json({ message: "Upload successful", fileName });
    return
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
    return
  }
});

bookImageRouter.get("/:imgName", async function (req: Request, res: Response, next: NextFunction) {
  const imgName = req.params.imgName;
  let size = 0
  try {
    const dataStream = await minioClient.getObject(BUCKETNAME, imgName)
    res.setHeader('Content-Type', 'image/jpeg')
    dataStream.pipe(res)

    dataStream.on('end', function () {
      console.log('End. Total size = ' + size)
    })

  } catch (err) {
    console.log("Image not found:", err);

    res.status(204).end();
  }
});

function getFileExtension(filename: string) {
  return filename.substring(filename.lastIndexOf("."));
}


export default bookImageRouter;