// api/db.js — подключение к MySQL
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',        // ← замени на своего пользователя MySQL
    password: '',        // ← замени на свой пароль MySQL
    database: 'korochki',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

module.exports = pool;
