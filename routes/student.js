import express from 'express';
import db from '../models/db.js';
import {
  getAllBooks,
  decrementBookCopy,
  getFeaturedBooks,
  getSearchBooks
} from '../models/bookModel.js';
import {
  getStudentLoans,
  createLoan,
  getStudentSearchLoans,
  countCurrentlyBorrowedBooks
} from '../models/loanModel.js';

const router = express.Router();

/* ---------- Helper ---------- */
const isApiRequest = (req) => {
  return req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api');
};

/* ---------- Student Auth Middleware ---------- */
router.use((req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'student') {
    if (isApiRequest(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/auth/login');
  }
  next();
});

/* ---------- Student Dashboard ---------- */
router.get('/dashboard', async (req, res) => {
  try {
    const featuredBooks = await getFeaturedBooks();

    if (isApiRequest(req)) {
      return res.json({
        success: true,
        user: req.session.user,
        featuredBooks
      });
    }

    res.render('student/dashboard', {
      user: req.session.user,
      featuredBooks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Dashboard error' });
  }
});

/* ---------- View All Books ---------- */
router.get('/books', async (req, res) => {
  try {
    const { search } = req.query;
    const books = search ? await getSearchBooks(search) : await getAllBooks();
    const borrowed = await countCurrentlyBorrowedBooks(req.session.user.id);

    if (isApiRequest(req)) {
      return res.json({
        success: true,
        books,
        borrowed
      });
    }

    res.render('student/books', {
      user: req.session.user,
      books,
      borrowed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Books load failed' });
  }
});

/* ---------- My Books ---------- */
router.get('/mybooks', async (req, res) => {
  try {
    const { search } = req.query;
    const loans = search
      ? await getStudentSearchLoans(search, req.session.user.id)
      : await getStudentLoans(req.session.user.id);

    const currentLoans = loans.filter(
      l => l.status === 'issued' || l.status === 'overdue'
    );
    const pastLoans = loans.filter(l => l.status === 'returned');
    const borrowed = await countCurrentlyBorrowedBooks(req.session.user.id);

    if (isApiRequest(req)) {
      return res.json({
        success: true,
        currentLoans,
        pastLoans,
        borrowed
      });
    }

    res.render('student/mybooks', {
      user: req.session.user,
      currentLoans,
      pastLoans,
      borrowed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'My books load failed' });
  }
});

/* ---------- Borrow Request ---------- */
router.post('/borrow-request', async (req, res) => {
  const { bookId } = req.body;
  const studentId = req.session.user.id;

  try {
    await db.query(
      `
      INSERT INTO borrow_requests (student_id, book_id, status, requested_at)
      VALUES ($1, $2, 'pending', NOW())
      `,
      [studentId, bookId]
    );

    if (isApiRequest(req)) {
      return res.status(201).json({
        success: true,
        message: 'Borrow request sent'
      });
    }

    res.redirect('/student/mybooks?msg=Request%20sent');
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Error sending borrow request'
    });
  }
});

export default router;
