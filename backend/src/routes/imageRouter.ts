import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/helper';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import { minioClient } from '../utils/config';

const bookImageRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const BUCKETNAME = 'book-images';

bookImageRouter.post('/upload', authenticate, upload.single('image'), async function(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ error: 'Only image files are permitted' });
      return;
    }

    const fileName = req.body.isbn
      ? `${req.body.isbn}${getFileExtension(file.originalname)}`
      : file.originalname;

    const exists = await minioClient.bucketExists(BUCKETNAME).catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(BUCKETNAME, 'us-east-1');
    }

    try {
      await minioClient.putObject(
        BUCKETNAME,
        fileName,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );
    } catch (err) {
      console.error('MinIO upload error:', err);
      res.status(500).json({ error: 'Upload failed', details: err });
      return;
    }

    res.json({ message: 'Upload successful', fileName });
    return;
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
    return;
  }
});

bookImageRouter.get('/:imgName', async function(req: Request, res: Response, next: NextFunction) {
  const imgName = req.params.imgName;
  try {
    const dataStream = await minioClient.getObject(BUCKETNAME, imgName);
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
