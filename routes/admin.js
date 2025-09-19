import express from 'express';
import db from '../models/db.js'; // ✅ added db import
import { 
  getAllBooks, getSearchBooks, createBook, updateBook, deleteBook 
} from '../models/bookModel.js';
import { getAllStudents, getSearchStudents } from '../models/userModel.js';
import { 
  getAllLoans, getSearchLoans, issueBook, returnBook, getDashboardStats 
} from '../models/loanModel.js';

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
  } else {
    books = await getAllBooks();
  }
  res.render('admin/books', { books });
});

// Show all borrow requests to admin
router.get('/requests', async (req, res) => {
  try {
    const { rows: requests } = await db.query(`
      SELECT br.id, 
             br.student_id, 
             u.name AS student_name,
             u.student_id, 
             br.book_id, 
             b.title AS book_title, 
             br.status, 
             br.requested_at
      FROM borrow_requests br
      JOIN users u ON br.student_id = u.id
      JOIN books b ON br.book_id = b.id
      ORDER BY br.id DESC
    `);

    res.render('admin/requests', { requests, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.send("Error loading borrow requests");
  }
});



router.post('/books/add', async (req, res) => {
  const { title, author, total_copies, genre } = req.body;
  await createBook(title, author, total_copies, genre);
  res.redirect('/admin/books');
});

router.post('/books/update', async (req, res) => {
  const { id, title, author, total_copies, available_copies, genre } = req.body;
  const book = (await getAllBooks()).find(b => b.id == id);
  if (!book) return res.redirect('/admin/books');

  let adjustedAvailable = book.available_copies + (total_copies - book.total_copies);
  if (adjustedAvailable < 0) adjustedAvailable = 0;

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
  const { search } = req.query;
  let loans;
  if (search) {
    loans = await getSearchLoans(search);
  } else {
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


// Approve request → create loan + decrease copies
router.post("/requests/:id/approve", async (req, res) => {
  const { id } = req.params;

  try {
    // Update request status
    await db.query(
      "UPDATE borrow_requests SET status = 'approved' WHERE id = $1",
      [id]
    );

    // Insert into loans table
    await db.query(
      `
      INSERT INTO loans (student_id, book_id, issued_at,return_date)
      SELECT student_id, book_id, NOW(),NOW()+INTERVAL'1 month'
      FROM borrow_requests WHERE id = $1
      `,
      [id]
    );

   // Decrease book copies
await db.query(
  `
  UPDATE books SET available_copies = available_copies - 1
  WHERE id = (SELECT book_id FROM borrow_requests WHERE id = $1)
  `,
  [id]
);


    res.redirect("/admin/requests");
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).send("Error approving request");
  }
});

// Reject request
router.post("/requests/:id/reject", async (req, res) => {
  try {
    await db.query(
      "UPDATE borrow_requests SET status = 'rejected' WHERE id = $1",
      [req.params.id]
    );
    res.redirect("/admin/requests");
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).send("Error rejecting request");
  }
});


export default router;
