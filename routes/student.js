import express from 'express';
import { getAllBooks, decrementBookCopy,getFeaturedBooks,getSearchBooks } from '../models/bookModel.js';
import { getStudentLoans, createLoan,getStudentSearchLoans,countCurrentlyBorrowedBooks } from '../models/loanModel.js';

const router = express.Router();

router.use((req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/auth/login');
    }
    next();
});

// Student dashboard
router.get("/dashboard", async (req, res) => {
    // Example: latest 4 books
    const featuredBooks = await getFeaturedBooks(); // pg uses rows, mysql2 uses [0]

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

  // Count borrowed books for current student
  const borrowed = await countCurrentlyBorrowedBooks(req.session.user.id);

  res.render('student/books', { 
    user: req.session.user, 
    books, 
    borrowed 
  });
});
router.get('/mybooks', async (req, res) => {
    const {search} = req.query;
    let loans;

    if(search){
       loans = await getStudentSearchLoans(search,req.session.user.id);
    }
    else{
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

// Borrow a book
router.post('/borrow', async (req, res) => {
    const bookId = req.body.book_id;
    const studentId = req.session.user.id;

    const issuedAt = new Date();
    const returnDate = new Date();
    returnDate.setMonth(returnDate.getMonth() + 1);

    await createLoan(studentId, bookId, issuedAt, returnDate);
    await decrementBookCopy(bookId);

    res.redirect('/student/mybooks');
});

export default router;
