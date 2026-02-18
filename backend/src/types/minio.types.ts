// server/types/minio.types.ts

/**
 * File upload from multer or similar middleware
 */
export interface FileUpload {
  /** File buffer */
  buffer: Buffer;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimetype: string;
  /** Original filename */
  originalname?: string;
  /** Field name from form */
  fieldname?: string;
  /** File encoding */
  encoding?: string;
}

/**
 * MinIO object metadata
 */
export interface MinioObjectMetadata {
  /** Content type of the object */
  'Content-Type': string;
  /** Cache control header */
  'Cache-Control': string;
  /** Custom metadata key-value pairs */
  [key: string]: string;
}

/**
 * Object stat information
 */
export interface ObjectStat {
  /** Size of the object in bytes */
  size: number;
  /** Last modified date */
  lastModified: Date;
  /** Content type */
  contentType?: string;
  /** ETag of the object */
  etag: string;
}

/**
 * MinIO health check result
 */
export interface MinioHealthCheck {
  /** Whether MinIO is connected */
  connected: boolean;
  /** Whether the bucket exists */
  bucketExists: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
  /** Success status */
  success: boolean;
  /** File path in MinIO */
  path: string;
  /** Pre-signed URL */
  url: string | null;
  /** File size */
  size: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Batch upload result
 */
export interface BatchUploadResult {
  /** Total files attempted */
  total: number;
  /** Successfully uploaded */
  successful: number;
  /** Failed uploads */
  failed: number;
  /** Individual results */
  results: ImageUploadResult[];
}

/**
 * MinIO configuration
 */
export interface MinioConfig {
  /** MinIO endpoint (without protocol) */
  endPoint: string;
  /** MinIO port */
  port: number;
  /** Use SSL/TLS */
  useSSL: boolean;
  /** Access key */
  accessKey: string;
  /** Secret key */
  secretKey: string;
  /** Bucket name */
  bucketName: string;
}

/**
 * Pre-signed URL options
 */
export interface PresignedUrlOptions {
  /** Expiry time in seconds */
  expiry?: number;
  /** Request date */
  requestDate?: Date;
  /** Response headers */
  responseHeaders?: Record<string, string>;
}

/**
 * List objects options
 */
export interface ListObjectsOptions {
  /** Prefix to filter objects */
  prefix?: string;
  /** Recursive listing */
  recursive?: boolean;
  /** Maximum number of objects to return */
  maxKeys?: number;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Quality (1-100) */
  quality?: number;
  /** Output format */
  format?: 'jpeg' | 'png' | 'webp';
  /** Resize strategy */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

/**
 * File path patterns for organizing uploads
 */
export const FILE_PATH_PATTERNS = {
  BOOKS: (bookId: string | number, filename: string) => `books/${bookId}/${filename}`,
  COVERS: (bookId: string | number, filename: string) => `covers/${bookId}/${filename}`,
  THUMBNAILS: (bookId: string | number, filename: string) => `thumbnails/${bookId}/${filename}`,
  TEMP: (filename: string) => `temp/${filename}`,
  ARCHIVE: (filename: string) => `archive/${filename}`,
} as const;