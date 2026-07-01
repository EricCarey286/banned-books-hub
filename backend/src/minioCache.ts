// server/minioCache.ts
import { Client, ClientOptions, CopyConditions } from 'minio';
import { getCache, setCache, deleteCache } from './cache';

// MinIO client configuration
const minioConfig: ClientOptions = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
};

// Initialize MinIO client
const minioClient = new Client(minioConfig);

// Configuration constants
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'books';

// Cache duration for pre-signed URLs (in seconds)
// Set to 23 hours to ensure URL is valid when cached
const PRESIGNED_URL_EXPIRY = 23 * 60 * 60; // 23 hours
const CACHE_TTL = 22 * 60 * 60; // 22 hours (slightly less than URL expiry)

/**
 * File upload metadata
 */
interface FileUpload {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname?: string;
}

/**
 * MinIO object metadata
 */
interface ObjectMetadata {
  'Content-Type': string;
  'Cache-Control': string;
  [key: string]: string;
}

/**
 * Get a cached pre-signed URL or generate a new one
 * @param imagePath - Path to the image in MinIO bucket
 * @returns Pre-signed URL or null if error
 */
export async function getCachedImageUrl(imagePath: string | null | undefined): Promise<string | null> {
  if (!imagePath) return null;

  const cacheKey = `minio:url:${imagePath}`;

  try {
    // Try to get from cache first
    const cachedUrl = await getCache<string>(cacheKey);
    if (cachedUrl) {
      console.log(`📦 Cache HIT: MinIO URL for ${imagePath}`);
      return cachedUrl;
    }

    console.log(`💾 Cache MISS: Generating MinIO URL for ${imagePath}`);

    // Generate new pre-signed URL
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      imagePath,
      PRESIGNED_URL_EXPIRY
    );

    // Cache the URL
    await setCache(cacheKey, url, CACHE_TTL);

    return url;
  } catch (error) {
    console.error(`Error getting MinIO URL for ${imagePath}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get cached URLs for multiple images in batch
 * @param imagePaths - Array of image paths
 * @returns Array of pre-signed URLs (null for failed requests)
 */
export async function getCachedImageUrls(imagePaths: (string | null | undefined)[]): Promise<(string | null)[]> {
  if (!imagePaths || imagePaths.length === 0) return [];

  const urlPromises = imagePaths.map(path => getCachedImageUrl(path));
  return Promise.all(urlPromises);
}

/**
 * Upload image to MinIO and return cached URL
 * @param file - File object with buffer and metadata
 * @param fileName - Desired filename in MinIO
 * @returns Pre-signed URL of uploaded file
 */
export async function uploadImageWithCache(file: FileUpload, fileName: string): Promise<string | null> {
  try {
    const metadata: ObjectMetadata = {
      'Content-Type': file.mimetype,
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    };

    await minioClient.putObject(
      BUCKET_NAME,
      fileName,
      file.buffer,
      file.size,
      metadata
    );

    console.log(`✅ Uploaded ${fileName} to MinIO`);

    // Get cached URL for the newly uploaded image
    return getCachedImageUrl(fileName);
  } catch (error) {
    console.error(`Error uploading ${fileName} to MinIO:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Delete image from MinIO and clear cache
 * @param imagePath - Path to the image in MinIO bucket
 * @returns Success boolean
 */
export async function deleteImageWithCache(imagePath: string): Promise<boolean> {
  try {
    await minioClient.removeObject(BUCKET_NAME, imagePath);
    console.log(`🗑️  Deleted ${imagePath} from MinIO`);
    
    // Clear cache
    const cacheKey = `minio:url:${imagePath}`;
    await deleteCache(cacheKey);
    console.log(`🗑️  Cleared cache for ${imagePath}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting ${imagePath} from MinIO:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Check if an object exists in MinIO
 * @param imagePath - Path to the image in MinIO bucket
 * @returns True if object exists
 */
export async function objectExists(imagePath: string): Promise<boolean> {
  try {
    await minioClient.statObject(BUCKET_NAME, imagePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get object metadata from MinIO
 * @param imagePath - Path to the image in MinIO bucket
 * @returns Object metadata or null if error
 */
export async function getObjectMetadata(imagePath: string): Promise<any | null> {
  try {
    const stat = await minioClient.statObject(BUCKET_NAME, imagePath);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      contentType: stat.metaData?.['content-type'],
      etag: stat.etag,
    };
  } catch (error) {
    console.error(`Error getting metadata for ${imagePath}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * List all objects in a bucket with optional prefix
 * @param prefix - Optional prefix to filter objects
 * @returns Array of object names
 */
export async function listObjects(prefix?: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const objectNames: string[] = [];
    const stream = minioClient.listObjects(BUCKET_NAME, prefix, true);

    stream.on('data', (obj) => {
      if (obj.name) {
        objectNames.push(obj.name);
      }
    });

    stream.on('error', (err) => {
      console.error('Error listing objects:', err);
      reject(err);
    });

    stream.on('end', () => {
      resolve(objectNames);
    });
  });
}

/**
 * Copy object within MinIO
 * @param sourcePath - Source object path
 * @param destPath - Destination object path
 * @returns Success boolean
 */
export async function copyObject(sourcePath: string, destPath: string): Promise<boolean> {
  try {
    // Use the simplified modern API
    const sourceObject = `${BUCKET_NAME}/${sourcePath}`;
    
    await minioClient.copyObject(
      BUCKET_NAME,
      destPath,
      sourceObject,
      new CopyConditions()
    );
    
    console.log(`📋 Copied ${sourcePath} to ${destPath}`);
    return true;
  } catch (error) {
    console.error(`Error copying ${sourcePath} to ${destPath}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Initialize MinIO bucket if it doesn't exist
 * @returns Success boolean
 */
export async function initializeBucket(): Promise<boolean> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ Created MinIO bucket: ${BUCKET_NAME}`);
      
      // Set bucket policy to allow public read access (optional)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`✅ Set public read policy for bucket: ${BUCKET_NAME}`);
    } else {
      console.log(`✅ MinIO bucket already exists: ${BUCKET_NAME}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing MinIO bucket:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get direct MinIO client for advanced operations
 * @returns MinIO client instance
 */
export function getMinioClient(): Client {
  return minioClient;
}

/**
 * Health check for MinIO connection
 * @returns Health status object
 */
export async function checkMinioHealth(): Promise<{ connected: boolean; bucketExists: boolean; error?: string }> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    return {
      connected: true,
      bucketExists: exists,
    };
  } catch (error) {
    return {
      connected: false,
      bucketExists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { minioClient, BUCKET_NAME };