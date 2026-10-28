import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import { minioClient, BUCKET_NAME } from '../utils/config';
import { detectImageType } from '../utils/imageSignature';

const bookImageRouter = Router();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });
const uploadSingleImage = upload.single('image');

// Maps an oversized file to 413 instead of a generic server error
function receiveImage(req: Request, res: Response, next: NextFunction): void {
  uploadSingleImage(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'File is too large (limit 5 MB)' });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

bookImageRouter.post('/upload', authenticate, receiveImage, async function(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Check the file's contents, not the browser-declared type (FR-023 to FR-025)
    const imageType = detectImageType(file.buffer);
    if (!imageType) {
      res.status(400).json({ error: 'File content is not a supported image type' });
      return;
    }

    const fileName = req.body.isbn
      ? `${req.body.isbn}${getFileExtension(file.originalname)}`
      : file.originalname;

    const exists = await minioClient.bucketExists(BUCKET_NAME).catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
    }

    try {
      await minioClient.putObject(
        BUCKET_NAME,
        fileName,
        file.buffer,
        file.size,
        { 'Content-Type': imageType }
      );
    } catch (err) {
      // Full detail goes to the log only; the client gets a generic message (FR-028)
      console.error('MinIO upload error:', err);
      res.status(500).json({ message: 'Upload failed' });
      return;
    }

    res.json({ message: 'Upload successful', fileName });
    return;
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
    return;
  }
});

bookImageRouter.get('/:imgName', async function(req: Request, res: Response, next: NextFunction) {
  const imgName = req.params.imgName;
  try {
    const dataStream = await minioClient.getObject(BUCKET_NAME, imgName);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', 'image/jpeg');
    dataStream.pipe(res);
  } catch (err) {
    console.error('Image not found:', err);
    res.status(404).json({ error: 'Image not found' });
  }
});

function getFileExtension(filename: string) {
  return filename.substring(filename.lastIndexOf('.'));
}

export default bookImageRouter;
