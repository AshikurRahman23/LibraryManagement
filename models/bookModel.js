import pool from './db.js';

export const getAllBooks = async () => {
    const res = await pool.query('SELECT * FROM books');
    return res.rows;
};

export const getFeaturedBooks = async () => {
    const res = await pool.query('SELECT * FROM books ORDER BY RANDOM() LIMIT 6');
    return res.rows;
};

export async function getSearchBooks(search){
    search = `%${search}%`;
    const res = await pool.query(
        'SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 OR genre ILIKE $1 ORDER BY id',
        [search]
    );
    return res.rows;
};

export const createBook = async (title, author, total_copies, genre) => {
    const res = await pool.query(
        'INSERT INTO books (title, author, total_copies, available_copies, genre) VALUES ($1,$2,$3,$3,$4) RETURNING *',
        [title, author, total_copies, genre]
    );
    return res.rows[0];
};

export const updateBook = async (id, title, author, total_copies, available_copies, genre) => {
    const res = await pool.query(
        'UPDATE books SET title=$1, author=$2, total_copies=$3, available_copies=$4, genre=$5 WHERE id=$6 RETURNING *',
        [title, author, total_copies, available_copies, genre, id]
    );
    return res.rows[0];
};


export const deleteBook = async (id) => {
    await pool.query('DELETE FROM books WHERE id=$1', [id]);
};

export async function decrementBookCopy(bookId) {
    await pool.query(
        `UPDATE books SET available_copies = available_copies - 1 
         WHERE id = $1 AND available_copies > 0`,
        [bookId]
    );
}
export async function incrementBookCopy(bookId) {
    await pool.query(
        `UPDATE books SET available_copies = LEAST(available_copies + 1, total_copies) 
         WHERE id = $1`,
        [bookId]
    );
}