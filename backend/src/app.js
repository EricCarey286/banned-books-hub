"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const bookRouter_1 = __importDefault(require("./routes/bookRouter"));
const suggestedBookRouter_1 = __importDefault(require("./routes/suggestedBookRouter"));
const config_1 = require("./utils/config");
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({
    extended: true,
}));
//express-rate-limit for overload prevention
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
const corsOptions = {
    origin: "http://localhost:3000", //TODO: update to frontend domain (for production)
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
};
app.use(limiter);
app.use((0, helmet_1.default)()); //helmet for security middleware
app.use((0, cors_1.default)()); //TODO: switch to (corsOptions)
app.get("/", (req, res) => {
    res.json({ message: "success" });
});
app.use("/books", bookRouter_1.default);
app.use("/suggested_books", suggestedBookRouter_1.default);
/* Error handler middleware */
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const errorResponse = {
        message: err.message,
        details: err.details || null,
    };
    console.error("Error details: ", errorResponse);
    res.status(statusCode).json(errorResponse);
    return;
});
// HTTPS Server Configuration
const sslOptions = {
    key: fs_1.default.readFileSync("../certs/localhost.key"), // Path to private key
    cert: fs_1.default.readFileSync("../certs/localhost.crt"), // Path to certificate
};
// Start HTTPS server
https.createServer(sslOptions, app).listen(config_1.PORT, () => {
    console.log(`Secure server is running at https://localhost:${config_1.PORT}`);
});
