import { Client } from "minio";

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

export const minioClient = new Client({
  ...parseMinioUrl(process.env.MINIO_URL!),
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});