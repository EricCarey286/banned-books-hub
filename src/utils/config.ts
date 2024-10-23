
require('dotenv').config();

export const PORT = process.env.PORT;

export const DB_CONFIG = {
    db: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      ssl: {
        rejectUnauthorized: true,
        // Enable automatic retrieval of the server's public key
        publicKeyRetrieval: true,
      },
      connectTimeout: 60000,
      multipleStatements: true,
    },
    listPerPage: 10,
  };