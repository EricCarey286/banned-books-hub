
require('dotenv').config();

export const PORT = process.env.PORT;
console.log('Port: ' + PORT);

export const DB_CONFIG = {
    db: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 8080,
    },
    listPerPage: 10,
  };