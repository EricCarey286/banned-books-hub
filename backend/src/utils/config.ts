require('dotenv').config();

export const PORT = process.env.PORT;
console.log('host: '+ process.env.DB_HOST);
console.log('host: '+ process.env.DB_USER);
console.log('host: '+ process.env.DB_PASSWORD);
console.log('host: '+ process.env.DB_NAME);
console.log('host: '+ process.env.DB_PORT);

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