# Banned Books Hub

**Banned Books Hub** documents books that have been banned in the United States: who banned them, when, and why. Visitors can browse and search the list, suggest a book, and send a message. Administrators sign in to add, edit, and delete books, upload cover images, and review suggestions and messages.

---

## Features

- **Public browsing**: paginated book list, search, and a featured book.
- **Suggestions and contact**: visitors can suggest a book or send a message. Both require human verification and are rate limited.
- **Admin area**: sign in, then manage books, cover images, suggested books, and contact submissions.
- **Secure admin sessions**: the session lives in an HTTP-only cookie, with CSRF protection on every write.
- **Brute-force protection**: repeated failed logins from one address are blocked for 15 minutes.
- **Safe uploads**: cover images are checked by their contents, not their declared type.
- **Startup checks**: the server refuses to run if a required secret or setting is missing or invalid.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, React Router
- **Backend**: Node.js, Express 4, TypeScript
- **Database**: MariaDB, accessed only through stored procedures (`mysql2`)
- **Cache and rate limits**: Redis
- **Image storage**: MinIO (S3-compatible)
- **Authentication**: JWT in an HTTP-only cookie; bcrypt for the admin password (`bcryptjs`)
- **Human verification**: Cloudflare Turnstile
- **Security middleware**: Helmet, CORS, express-rate-limit
- **Hosting**: Railway, with GitHub Actions for security scanning and database migrations

For how the pieces fit together, see `docs/` and the developer walkthrough.

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18 or higher
- MariaDB 10.5 or higher
- Redis
- A MinIO server (or an S3-compatible bucket) for cover images
- npm

### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/banned-books-hub.git
cd banned-books-hub
```

### 3. Install Dependencies

Install backend and frontend dependencies separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Environment Configuration

Create `backend/.env` from `backend/.env.example` and `frontend/.env` from `frontend/.env.example`. The full list, with values for each environment, is in [`docs/env-vars.md`](docs/env-vars.md).

**Backend** (`backend/.env`) — the server will not start unless the required settings are present and valid. The error message names each problem.

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MariaDB connection |
| `PORT` | Port the API listens on (local example: `3001`) |
| `FRONTEND_URL` | Frontend hostname, without protocol (local example: `localhost:5173`) |
| `URL_PREFIX` | `http` locally, `https` when deployed |
| `ADMIN_USERNAME` | Admin username |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password (see step 5) |
| `JWT_SECRET` | Random string of at least 32 characters, unique per environment |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key. Local testing can use Cloudflare's test secret `1x0000000000000000000000000000000AA` |
| `MINIO_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | MinIO connection (`MINIO_URL` includes the protocol) |
| `MINIO_BUCKET_NAME` | Bucket that holds the cover images |
| `REDIS_URL` | Redis connection (for example `redis://localhost:6379`) |
| `NODE_ENV` | Set to `development` to include error detail in API responses |

**Frontend** (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API host, without protocol (local example: `localhost:3001`) |
| `VITE_URL_PREFIX` | `http` locally, `https` when deployed |
| `VITE_TURNSTILE_SITE_KEY` | Public Turnstile site key (local testing can use `1x00000000000000000000AA`) |

Generate the two secrets like this:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
cd backend && npm run hash-password                                         # ADMIN_PASSWORD_HASH
```

`npm run hash-password` prompts for the password with input hidden. Passwords must be at least 12 characters. You can also pipe the password in, which keeps it out of shell history:

```bash
printf '%s' "$ADMIN_PASSWORD" | npm run hash-password
```

Copy the printed hash (it starts with `$2b$12$`) into `ADMIN_PASSWORD_HASH`. The plain password is never stored.

### 5. Run the Application

Start the backend and the frontend in separate terminals:

```bash
cd backend && npm run dev     # API at http://localhost:3001
cd frontend && npm run dev    # site at http://localhost:5173
```

Make sure MariaDB, Redis, and MinIO are running first. For a fresh database, see the setup guide.

---

## Security

| Area | How it works |
|---|---|
| **Secrets** | Passwords and keys live only in environment variables. The admin password is stored as a bcrypt hash. |
| **Startup checks** | The server refuses to start without a `JWT_SECRET` of at least 32 characters, a valid `ADMIN_PASSWORD_HASH`, and the other required settings. |
| **Admin session** | Set as an HTTP-only, Secure, `SameSite=Strict` cookie for 24 hours. Page scripts cannot read it. |
| **CSRF** | Every write to a protected route needs an `X-CSRF-Token` header. The token is returned on login and on session check, and kept in memory only. |
| **Login limits** | Five failed attempts from one address within 15 minutes block further attempts, including with the correct password. |
| **Human verification** | The suggest and contact forms require a Cloudflare Turnstile token. |
| **Submission limits** | Each address may make 10 accepted suggestions or messages per hour, per form. |
| **Single-entry requests** | The suggest and contact endpoints accept exactly one entry per request. |
| **Uploads** | Limited to 5 MB. The file's contents must be JPEG, PNG, WebP, or GIF; the declared type is ignored. |
| **Errors** | Visitors see generic messages for server errors. Full detail is written to the server log. |
| **Transport and headers** | Helmet sets security headers. CORS allows only the configured frontend origin. Railway terminates TLS. |
| **Rate limiting** | A global limit of 100 requests per 15 minutes per IP applies to all routes. |
| **Database** | Queries use parameters and stored procedures only. |

The frontend and API must be served from subdomains of the same domain for the admin cookie to be sent. See [`docs/railway-setup.md`](docs/railway-setup.md) for the custom domain and Turnstile setup.

---

## API Documentation

Base URL (local): `http://localhost:3001`

**Public** routes need no login. **Admin** routes need the `admin_session` cookie, which the login response sets. Writes on admin routes also need the `X-CSRF-Token` header. **Verified** routes also need `X-Turnstile-Token`.

### Authentication

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/admin/login` | Public (rate limited) | Body `{ "username", "password" }`. Sets the session cookie and returns `csrfToken`. |
| POST | `/api/admin/logout` | Admin | Clears the session cookie. |
| GET | `/api/admin/validate` | Admin | Confirms the session and returns `csrfToken`. |
| GET | `/api/admin` | Admin | Welcome message for the admin area. |

### Books

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/books?page=N` | Public | Paginated list, 15 per page. |
| GET | `/books/search?term=...` | Public | Search by title, author, description, and more. |
| GET | `/books/featured` | Public | The featured book. |
| POST | `/books` | Admin | Add one or more books. Body is an array of book objects. |
| PUT | `/books/:id` | Admin | Update a book. |
| DELETE | `/books/:id` | Admin | Delete a book. |
| DELETE | `/books` | Admin | Delete several books. Body `{ "ids": [1, 2] }`. |

Example book object for `POST /books`:

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

### Suggested Books

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/suggested_books` | Public, verified, limited | Suggest one book. Body is an array with exactly one entry. |
| GET | `/suggested_books?page=N` | Admin | Review suggestions. |
| DELETE | `/suggested_books/:id` | Admin | Remove a suggestion. |
| DELETE | `/suggested_books` | Admin | Remove several suggestions. Body `{ "ids": [...] }`. |

### Contact Form

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/contact_form` | Public, verified, limited | Send one message. Body is an array with exactly one entry. |
| GET | `/contact_form?page=N` | Admin | Read submissions. |

### Images

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/book-image/upload` | Admin | Upload a cover image. Multipart field `image`, optional `isbn`. JPEG, PNG, WebP, or GIF only; 5 MB limit. |
| GET | `/book-image/:imgName` | Public | Serve a stored image. |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Basic status. |
| GET | `/health/cache` | Redis connection check. |
| GET | `/health/cache/stats` | Cache statistics. |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/local-setup.md`](docs/local-setup.md) | Step-by-step guide to run the app locally from a fresh clone |
| [`docs/railway-setup.md`](docs/railway-setup.md) | How to configure Railway development and production environments, custom domains, and Turnstile |
| [`docs/env-vars.md`](docs/env-vars.md) | Complete environment variable reference — purpose, per-environment values, examples |
| [`docs/workflow.md`](docs/workflow.md) | Branching workflow, merge policy, and environment promotion checklist |

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
