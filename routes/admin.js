import express from 'express';
import { getAllBooks,getSearchBooks, createBook, updateBook, deleteBook } from '../models/bookModel.js';
import { getAllStudents,getSearchStudents} from '../models/userModel.js';
import { getAllLoans,getSearchLoans, issueBook, returnBook,getDashboardStats } from '../models/loanModel.js';


const router = express.Router();

// Middleware to protect admin routes
router.use((req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/auth/login');
    }
    next();
});

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getDashboardStats();
   
    res.render('admin/dashboard', { stats, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});

router.get('/books', async (req, res) => {
    const search = req.query.search || '';
    let books;
    if (search) {
     books = await getSearchBooks(search);
    }
    else
        books = await getAllBooks();
    res.render('admin/books', { books });
});

router.post('/books/add', async (req, res) => {
    const { title, author, total_copies, genre } = req.body; // add genre
    await createBook(title, author, total_copies, genre);    // pass genre
    res.redirect('/admin/books');
});


router.post('/books/update', async (req, res) => {
    const { id, title, author, total_copies, available_copies, genre } = req.body;;

    // Get current book to calculate updated available copies
    const book = (await getAllBooks()).find(b => b.id == id);
    if (!book) return res.redirect('/admin/books');

    // Adjust available copies based on change in total copies
    let adjustedAvailable = book.available_copies + (total_copies - book.total_copies);
    if (adjustedAvailable < 0) adjustedAvailable = 0; // prevent negative

    await updateBook(id, title, author, total_copies, adjustedAvailable, genre);
    res.redirect('/admin/books');
});


router.post('/books/delete', async (req, res) => {
    const { id } = req.body;
    await deleteBook(id);
    res.redirect('/admin/books');
});

router.get('/students', async (req, res) => {
    const search = req.query.search || '';
    let students;
    if (search) {
        students = await getSearchStudents(search);
        return res.render('admin/students', { students });

    }
    students = await getAllStudents();
    res.render('admin/students', { students });
});

router.get('/loans', async (req, res) => {
    const { search } = req.query; // get search query
    let loans;

    if (search) {
        // Use model function to search loans
        loans = await getSearchLoans(search);
    } else {
        // Get all loans
        loans = await getAllLoans();
    }

    res.render('admin/loans', { loans });
});


router.post('/loans/issue', async (req, res) => {
    const { book_id, search } = req.body;
    await issueBook(book_id, search);
    res.redirect('/admin/loans');
});

router.post('/loans/return', async (req, res) => {
    const { loan_id, book_id } = req.body;
    await returnBook(loan_id, book_id);
    res.redirect('/admin/loans');
});

export default router;
