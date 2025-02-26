require('dotenv').config();

export const PORT = process.env.PORT;

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

export const TEST_CONFIG = {
  test_db: {
    host: process.env.TEST_HOST,
    user: process.env.TEST_USER,
    password: process.env.TEST_PASSWORD,
    database: process.env.TEST_NAME,
    port: process.env.TEST_DBPORT ? parseInt(process.env.TEST_DBPORT) : 3306,
  },
  listPerPage: 10,
};