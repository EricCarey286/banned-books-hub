import { Client } from "minio";
import { MINIO_URL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME } from "./env";

export const PORT = process.env.PORT;

export const DB_CONFIG = {
    db: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 8080,
    },
    listPerPage: 15,
};

// MINIO_URL is required and validated at startup (utils/env.ts)
function parseMinioUrl(raw: string) {
  const withProto = raw.includes('://') ? raw : `https://${raw}`;
  const parsed = new URL(withProto);
  const useSSL = parsed.protocol === 'https:';
  const defaultPort = useSSL ? 443 : 80;
  return {
    endPoint: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : defaultPort,
    useSSL,
  };
}

// The one object-storage client for the whole backend (uploads, image proxy, presigned links)
export const minioClient = new Client({
  ...parseMinioUrl(MINIO_URL),
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// The one bucket name for the whole backend
export const BUCKET_NAME = MINIO_BUCKET_NAME;
