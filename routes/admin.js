import express from 'express';
import db from '../models/db.js';
import { 
  getAllBooks, getSearchBooks, createBook, updateBook, deleteBook 
} from '../models/bookModel.js';
import { getAllStudents, getSearchStudents } from '../models/userModel.js';
import { 
  getAllLoans, getSearchLoans, issueBook, returnBook, getDashboardStats 
} from '../models/loanModel.js';

const router = express.Router();

/* ---------- Helper ---------- */
const isApiRequest = (req) => {
  return req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api');
};

/* ---------- Admin Auth Middleware ---------- */
router.use((req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    if (isApiRequest(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/auth/login');
  }
  next();
});

/* ---------- Dashboard ---------- */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getDashboardStats();

    if (isApiRequest(req)) {
      return res.json({ success: true, stats });
    }

    res.render('admin/dashboard', { stats, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error loading dashboard' });
  }
});

/* ---------- Books ---------- */
router.get('/books', async (req, res) => {
  const search = req.query.search || '';
  const books = search ? await getSearchBooks(search) : await getAllBooks();

  if (isApiRequest(req)) {
    return res.json({ success: true, books });
  }

  res.render('admin/books', { books });
});

router.post('/books/add', async (req, res) => {
  const { title, author, total_copies, genre } = req.body;
  await createBook(title, author, total_copies, genre);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Book added' });
  }

  res.redirect('/admin/books');
});

router.post('/books/update', async (req, res) => {
  const { id, title, author, total_copies, available_copies, genre } = req.body;
  const book = (await getAllBooks()).find(b => b.id == id);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  let adjustedAvailable = book.available_copies + (total_copies - book.total_copies);
  if (adjustedAvailable < 0) adjustedAvailable = 0;

  await updateBook(id, title, author, total_copies, adjustedAvailable, genre);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Book updated' });
  }

  res.redirect('/admin/books');
});

router.post('/books/delete', async (req, res) => {
  await deleteBook(req.body.id);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Book deleted' });
  }

  res.redirect('/admin/books');
});

/* ---------- Students ---------- */
router.get('/students', async (req, res) => {
  const search = req.query.search || '';
  const students = search ? await getSearchStudents(search) : await getAllStudents();

  if (isApiRequest(req)) {
    return res.json({ success: true, students });
  }

  res.render('admin/students', { students });
});

/* ---------- Loans ---------- */
router.get('/loans', async (req, res) => {
  const loans = req.query.search
    ? await getSearchLoans(req.query.search)
    : await getAllLoans();

  if (isApiRequest(req)) {
    return res.json({ success: true, loans });
  }

  res.render('admin/loans', { loans });
});

router.post('/loans/issue', async (req, res) => {
  const { book_id, search } = req.body;
  await issueBook(book_id, search);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Book issued' });
  }

  res.redirect('/admin/loans');
});

router.post('/loans/return', async (req, res) => {
  const { loan_id, book_id } = req.body;
  await returnBook(loan_id, book_id);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Book returned' });
  }

  res.redirect('/admin/loans');
});

/* ---------- Borrow Requests ---------- */
router.get('/requests', async (req, res) => {
  const { rows: requests } = await db.query(`
    SELECT br.id, br.student_id, u.name AS student_name, u.student_id,
           br.book_id, b.title AS book_title, br.status, br.requested_at
    FROM borrow_requests br
    JOIN users u ON br.student_id = u.id
    JOIN books b ON br.book_id = b.id
    ORDER BY br.id DESC
  `);

  if (isApiRequest(req)) {
    return res.json({ success: true, requests });
  }

  res.render('admin/requests', { requests, user: req.session.user });
});

/* ---------- Approve Request ---------- */
router.post('/requests/:id/approve', async (req, res) => {
  const { id } = req.params;

  await db.query("UPDATE borrow_requests SET status='approved' WHERE id=$1", [id]);

  await db.query(`
    INSERT INTO loans (student_id, book_id, issued_at, return_date)
    SELECT student_id, book_id, NOW(), NOW() + INTERVAL '1 month'
    FROM borrow_requests WHERE id=$1
  `, [id]);

  await db.query(`
    UPDATE books SET available_copies = available_copies - 1
    WHERE id = (SELECT book_id FROM borrow_requests WHERE id=$1)
  `, [id]);

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Request approved' });
  }

  res.redirect('/admin/requests');
});

/* ---------- Reject Request ---------- */
router.post('/requests/:id/reject', async (req, res) => {
  await db.query(
    "UPDATE borrow_requests SET status='rejected' WHERE id=$1",
    [req.params.id]
  );

  if (isApiRequest(req)) {
    return res.json({ success: true, message: 'Request rejected' });
  }

  res.redirect('/admin/requests');
});

export default router;
