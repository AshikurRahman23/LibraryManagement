import pool from './db.js';

export const issueBook = async (book_id, student_id) => {
    // Insert a proper issued loan
    await pool.query(
        `INSERT INTO loans (book_id, student_id, status, issued_at) 
         VALUES ($1, $2, 'issued', NOW())`,
        [book_id, student_id]
    );

    // Decrease available copies (but not below 0)
    await pool.query(
        `UPDATE books 
         SET available_copies = GREATEST(available_copies - 1, 0) 
         WHERE id = $1`,
        [book_id]
    );
};

export const returnBook = async (loan_id, book_id) => {
    // Mark loan as returned
    await pool.query(
        `UPDATE loans 
         SET returned_at = NOW(), status = 'returned' 
         WHERE id = $1`,
        [loan_id]
    );

    // Increase available copies, but not exceeding total_copies
    await pool.query(
        `UPDATE books 
         SET available_copies = LEAST(available_copies + 1, total_copies) 
         WHERE id = $1`,
        [book_id]
    );
};


export const getAllLoans = async () => {
    const res = await pool.query(
        `SELECT 
            l.id,
            l.book_id,
            l.status,
            l.issued_at,
            l.returned_at,
            b.title,
            b.author,
            b.genre,
            u.name AS student_name,
            u.student_id
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN users u ON l.student_id = u.id
        ORDER BY l.returned_at DESC, l.issued_at DESC`
    );
    return res.rows;
};


export async function getSearchLoans(search) {
    search = `%${search}%`;
    const resLoans = await pool.query(
        `SELECT 
            l.id, 
            b.title, 
            b.author,
            b.genre,
            u.name as student, 
            u.student_id, 
            l.status, 
            l.issued_at, 
            l.returned_at,
            l.book_id
         FROM loans l
         JOIN books b ON l.book_id = b.id
         JOIN users u ON l.student_id = u.id
         WHERE 
            u.student_id ILIKE $1 OR
            u.name ILIKE $1 OR
            l.status ILIKE $1 OR
            b.title ILIKE $1 OR
            b.author ILIKE $1 OR
            b.genre ILIKE $1
         ORDER BY l.returned_at DESC, l.issued_at DESC`,
        [search] 
    );
    return resLoans.rows;
}


export const getStudentLoans = async (student_id) => {
    const res = await pool.query(
        `SELECT l.id, l.book_id, b.title, l.status, l.issued_at, l.return_date, l.returned_at
         FROM loans l
         JOIN books b ON l.book_id=b.id
         WHERE l.student_id=$1
         ORDER BY l.returned_at DESC, l.issued_at DESC`,
        [student_id]
    );
    return res.rows;
};

export async function getStudentSearchLoans(search, student_id) {
    search = `%${search}%`;
    const resLoans = await pool.query(
        `SELECT l.*, b.*, b.genre  -- ensure genre included
         FROM loans l
         JOIN books b ON l.book_id=b.id
         WHERE (b.title ILIKE $1 OR b.author ILIKE $1 OR b.genre ILIKE $1)
         AND l.student_id=$2
         ORDER BY l.returned_at DESC, l.issued_at DESC`,
        [search, student_id]
    );
    return resLoans.rows;
}
        
export const getDashboardStats = async () => {
  // Total books
  const totalBooksRes = await pool.query('SELECT COUNT(*) FROM books');
  const totalBooks = parseInt(totalBooksRes.rows[0].count);

  //Total copies of all books
  const totalCopiesRes = await pool.query('SELECT SUM(total_copies) FROM books');
  const totalCopies = parseInt(totalCopiesRes.rows[0].sum);

  // Total students
  const totalStudentsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role='student'");
  const totalStudents = parseInt(totalStudentsRes.rows[0].count);

  // Books currently loaned (status = 'issued')
  const booksLoanedRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status='issued'");
  const booksLoaned = parseInt(booksLoanedRes.rows[0].count);

  // Books returned (status = 'returned')
  const booksReturnedRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status='returned'");
  const booksReturned = parseInt(booksReturnedRes.rows[0].count);

  // Overdue books (status = 'issued' and return_date < now())
  const overdueBooksRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status='issued' AND return_date < NOW()");
  const overdueBooks = parseInt(overdueBooksRes.rows[0].count);

  return {
    totalBooks,
    totalCopies,
    totalStudents,
    booksLoaned,
    booksReturned,
    overdueBooks
  };
};


export async function createLoan(studentId, bookId, issuedAt, returnDate) {
    const result = await pool.query(
        `INSERT INTO loans (student_id, book_id, status, issued_at, return_date) 
         VALUES ($1, $2, 'issued', $3, $4) RETURNING *`,
        [studentId, bookId, issuedAt, returnDate]
    );
    return result.rows[0];
}

export const countCurrentlyBorrowedBooks = async (student_id) => {
  const res = await pool.query(
    `SELECT COUNT(*) AS currently_borrowed 
     FROM loans 
     WHERE student_id = $1 AND status = 'issued'`,
    [student_id]
  );
  const borrow =  parseInt(res.rows[0].currently_borrowed, 10);
    return borrow;
};