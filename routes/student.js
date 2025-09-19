import express from 'express';
import db from '../models/db.js'; // ✅ added db import
import { getAllBooks, decrementBookCopy, getFeaturedBooks, getSearchBooks } from '../models/bookModel.js';
import { getStudentLoans, createLoan, getStudentSearchLoans, countCurrentlyBorrowedBooks } from '../models/loanModel.js';

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.redirect('/auth/login');
  }
  next();
});

// Student dashboard
router.get("/dashboard", async (req, res) => {
  const featuredBooks = await getFeaturedBooks();
  res.render("student/dashboard", {
    user: req.session.user,
    featuredBooks
  });
});

// View all books
router.get('/books', async (req, res) => {
  const { search } = req.query;
  let books;
  if (search) {
    books = await getSearchBooks(search);
  } else {
    books = await getAllBooks();
  }
  const borrowed = await countCurrentlyBorrowedBooks(req.session.user.id);
  res.render('student/books', { user: req.session.user, books, borrowed });
});

router.get('/mybooks', async (req, res) => {
  const { search } = req.query;
  let loans;
  if (search) {
    loans = await getStudentSearchLoans(search, req.session.user.id);
  } else {
    loans = await getStudentLoans(req.session.user.id);
  }

  const currentLoans = loans.filter(l => l.status === 'issued' || l.status === 'overdue');
  const pastLoans = loans.filter(l => l.status === 'returned');
  const borrowed = await countCurrentlyBorrowedBooks(req.session.user.id);

  res.render('student/mybooks', { 
    user: req.session.user, 
    currentLoans, 
    pastLoans,
    borrowed 
  });
});

router.post("/borrow-request", async (req, res) => {
  const { bookId } = req.body;
  const studentId = req.session.user.id; // <-- use correct ID

  try {
    await db.query(
      `INSERT INTO borrow_requests (student_id, book_id, status, requested_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [studentId, bookId]
    );

    res.redirect("/student/mybooks?msg=Request%20sent");
  } catch (err) {
    console.error(err);
    res.send("Error sending borrow request");
  }
});



export default router;
