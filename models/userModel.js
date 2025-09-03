import pool from './db.js';

export const findUserByEmail = async (email) => {
    const res = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    return res.rows[0];
};

export const createUser = async (name, email, password, role, student_id, mobile_no) => {
    const res = await pool.query(
        `INSERT INTO users (name, email, password, role, student_id, mobile_no) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, email, password, role, student_id, mobile_no]
    );
    return res.rows[0];
};


export const getAllStudents = async () => {
    const res = await pool.query('SELECT * FROM users WHERE role=$1', ['student']);
    return res.rows;
};

export async function getSearchStudents(search) {
    search = `%${search}%`;
    const res = await pool.query(
        `SELECT * FROM users 
         WHERE role=$1 AND (name ILIKE $2 OR email ILIKE $2 OR student_id ILIKE $2)`,
        ['student', search]
    );
    return res.rows;
}