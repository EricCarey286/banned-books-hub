# Banned Books Hub

**Banned Books Hub** is a private API designed to document books that have been banned in the United States. This application allows users to view, search, add, update, and delete banned books while providing information about why and where they were banned.

---

## Features

- **RESTful API**: Access and manage the banned books database via a secure API.
- **CRUD Operations**:
  - Create new book entries.
  - Read and search for books by title, author, or description.
  - Update existing book details.
  - Delete books by ID.
- **MySQL/MariaDB Integration**: Uses stored procedures to optimize database operations.
- **Pagination Support**: Fetch books in pages to optimize performance.
- **Optional Updates**: Update only specific fields in a book entry.

---

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MariaDB with stored procedures
- **ORM/Query Layer**: `mysql2` (promise-based)
- **Environment Management**: `dotenv` for environment variables

---

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- MariaDB (v10.5 or higher)
- npm (or yarn)
  
### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/banned-books-hub.git
cd banned-books-hub
```

### 3. Install Dependecies
Run the following command to install the required dependencies:

```bash 
npm install
```

This will install all the dependencies listed in the package.json file, including express, mysql2, dotenv, and others.

### 4. Environment Configuration

Create a .env file in the root directory of the project. This file will store the environment variables required to run the application.

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=db_bannedBooks
DB_PORT=3306
PORT=3000
LIST_PER_PAGE=10
```

- DB_HOST: The hostname or IP address of your MariaDB server.
- DB_USER: Your MariaDB username.
- DB_PASSWORD: Your MariaDB password.
- DB_NAME: The name of the database (e.g., db_bannedBooks).
- DB_PORT: The port on which MariaDB is running (default: 3306).
- PORT: The port for your application to run (default: 3000).
- LIST_PER_PAGE: The number of records returned per page for paginated endpoints.

Save the .env file in the root directory. This will ensure the application can connect to the database and configure the server correctly.

### 5. Run The Application

Start the server:

```bash
npm run dev
```

The server will run at http://localhost:3000.

---

## API Documentation

### Base URL

http://localhost:3000/api/books

### Endpoints

1. Get All Books

- GET /
- Query Parameters:
    - page (optional): Page number (default is 1).

2. Search for a Book

- GET /search/:term
- Query Parameters:
    - term: Search term for title, author, or description, etc.

3. Add Book(s)

- POST /
- Request Body:
```json
[
  {
    "isbn": "1234567890",
    "title": "Book Title",
    "author": "Author Name",
    "description": "Book description",
    "ban_reason": "Reason for ban",
    "banned_by": "State or institution"
  }
]
```

4. Update a Book

- POST /:id
- Request Body:
```json
{
  "title": "Updated Title",
  "author": "Updated Author",
  "description": "Updated description"
}
```

5. Delete a Book

- DELETE /:id

---

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Author

Eric Carey
[GitHub](https://www.github.com/ericcarey286) | [LinkedIn](https://www.linkedin.com/in/ericcarey1)