const expressRouter = require('express');
import { Request, Response, NextFunction } from "express";
const bookImageRouter = expressRouter.Router();
import multer from "multer";
import { minioClient } from "../utils/config";

const upload = multer({ storage: multer.memoryStorage() });

bookImageRouter.post("/upload", upload.single("image"), async function(req: Request, res: Response, next: NextFunction) {
  const bucketName = "book-images";

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

    // ensure bucket exists
    // const exists = await minioClient.bucketExists(bucketName).catch(() => false);
    // if (!exists) {
    //   console.log('Missing bucket');
    //   await minioClient.makeBucket(bucketName, "us-east-1");
    // }
    try {
      await minioClient.putObject(
        bucketName,
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

function getFileExtension(filename: string) {
  return filename.substring(filename.lastIndexOf("."));
}

export default bookImageRouter;