import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',       //postgres username
    host: 'localhost',
    database: 'Library',  //database name
    password: 'ask.1023',   // postgres password
    port: 5432,
});

export default pool;
