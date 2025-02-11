"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const expressRouter = require('express');
const router = expressRouter.Router();
const books = __importStar(require("../services/books"));
const helper_1 = require("../utils/helper");
//get all books
router.get('/', async function (req, res, next) {
    try {
        res.json(await books.getMultiple(Number(req.query.page)));
    }
    catch (err) {
        console.error(`Error while getting books `, err.message);
        next(err);
    }
});
//get specific book based on a search term
router.get('/search', async function (req, res, next) {
    try {
        const searchTerm = req.query.term;
        // Check if term is not a string or empty or null
        if (typeof searchTerm !== 'string' || searchTerm == '' || searchTerm == null) {
            throw new helper_1.AppError('Invalid search term: must be a string', 400); // Throw an error with a 400 status code
        }
        res.json(await books.getBook(searchTerm));
    }
    catch (err) {
        console.error(`Error while searching for book(s) containing: ${req.query.term} `, err.message);
        next(err);
    }
});
//create a book entry
router.post('/', async function (req, res, next) {
    const booksArray = req.body;
    const results = []; // To collect results for all books
    try {
        //check if body has data
        if (booksArray.length < 1) {
            throw new helper_1.AppError('Invalid create: request must contain 1 or more books', 400);
        }
        for (const book of booksArray) {
            const result = await books.create(book);
            results.push(result); // Collect the result for each book
        }
        res.status(200).json({
            message: 'Books inserted successfully',
            results,
        });
    }
    catch (err) {
        console.error(`Error while creating a new book entry`, err.message);
        next(err);
    }
});
//update an existing book entry
router.put('/:id', async function (req, res, next) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
        }
        res.json(await books.update(Number(req.params.id), req.body));
    }
    catch (err) {
        console.error(`Error while updating book with id: ${req.params.id}`, err.message);
        next(err);
    }
});
//delete an existing book entry
router.delete('/:id', async function (req, res, next) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
        }
        res.json(await books.remove(Number(req.params.id)));
    }
    catch (err) {
        console.error(`Error while deleting book with id: ${req.params.id}`, err.message);
        next(err);
    }
});
exports.default = router;
