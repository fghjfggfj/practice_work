// server.js — главный файл сервера Express
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./api/db');

const app = express();
const PORT = 3000;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true  // разрешаем передачу кук (сессий)
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'korochki_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,     // true только при HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24  // 24 часа
    }
}));

// ─── Создание администратора при первом запуске ───────────────
async function createAdmin() {
    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE login = ?', ['Admin']);
        if (rows.length === 0) {
            const hash = await bcrypt.hash('KorokNET', 10);
            await pool.query(
                'INSERT INTO users (login, password, full_name, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)',
                ['Admin', hash, 'Администратор', '8(000)000-00-00', 'admin@korochki.ru', 'admin']
            );
            console.log(' Администратор создан: Admin / KorokNET');
        } else {
            // Обновляем хеш если пароль был placeholder
            const [admin] = await pool.query('SELECT password FROM users WHERE login = ?', ['Admin']);
            if (admin[0].password === 'HASH_PLACEHOLDER') {
                const hash = await bcrypt.hash('KorokNET', 10);
                await pool.query('UPDATE users SET password = ? WHERE login = ?', [hash, 'Admin']);
                console.log(' Пароль администратора обновлён');
            }
        }
    } catch (err) {
        console.error('Ошибка создания администратора:', err.message);
    }
}

// ─── МАРШРУТЫ: Авторизация ────────────────────────────────────

// Регистрация
app.post('/api/register', async (req, res) => {
    const { login, password, full_name, phone, email } = req.body;

    // Валидация логина: латиница + цифры, не менее 6 символов
    if (!/^[a-zA-Z0-9]{6,}$/.test(login)) {
        return res.status(400).json({ error: 'Логин должен содержать только латиницу и цифры, не менее 6 символов' });
    }
    // Валидация пароля: минимум 8 символов
    if (password.length < 8) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
    }
    // Валидация ФИО: только кириллица и пробелы
    if (!/^[а-яёА-ЯЁ\s]+$/.test(full_name)) {
        return res.status(400).json({ error: 'ФИО должно содержать только кириллицу и пробелы' });
    }
    // Валидация телефона: 8(XXX)XXX-XX-XX
    if (!/^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(phone)) {
        return res.status(400).json({ error: 'Телефон должен быть в формате 8(XXX)XXX-XX-XX' });
    }
    // Валидация email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Некорректный формат email' });
    }

    try {
        // Проверка уникальности логина
        const [existing] = await pool.query('SELECT id FROM users WHERE login = ?', [login]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
        }

        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (login, password, full_name, phone, email) VALUES (?, ?, ?, ?, ?)',
            [login, hash, full_name, phone, email]
        );

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Авторизация
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE login = ?', [login]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Сохраняем данные пользователя в сессии
        req.session.user = {
            id: user.id,
            login: user.login,
            full_name: user.full_name,
            role: user.role
        };

        res.json({
            message: 'Успешный вход',
            user: { login: user.login, full_name: user.full_name, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Выход выполнен' });
});

// Проверка сессии (кто сейчас залогинен)
app.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
});

// ─── МАРШРУТЫ: Заявки ─────────────────────────────────────────

// Создать заявку
app.post('/api/applications', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { course_name, start_date, payment_method } = req.body;

    if (!course_name || !start_date || !payment_method) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
        await pool.query(
            'INSERT INTO applications (user_id, course_name, start_date, payment_method) VALUES (?, ?, ?, ?)',
            [req.session.user.id, course_name, start_date, payment_method]
        );
        res.status(201).json({ message: 'Заявка отправлена на рассмотрение' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить заявки текущего пользователя
app.get('/api/applications', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT a.*, r.review_text 
             FROM applications a 
             LEFT JOIN reviews r ON r.application_id = a.id AND r.user_id = ?
             WHERE a.user_id = ? 
             ORDER BY a.created_at DESC`,
            [req.session.user.id, req.session.user.id]
        );
        res.json({ applications: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ─── МАРШРУТЫ: Отзывы ─────────────────────────────────────────

// Оставить отзыв (только если статус "Обучение завершено")
app.post('/api/reviews', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { application_id, review_text } = req.body;

    if (!review_text || review_text.trim() === '') {
        return res.status(400).json({ error: 'Текст отзыва не может быть пустым' });
    }

    try {
        // Проверяем что заявка принадлежит пользователю и статус "Обучение завершено"
        const [rows] = await pool.query(
            'SELECT * FROM applications WHERE id = ? AND user_id = ?',
            [application_id, req.session.user.id]
        );
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Заявка не найдена' });
        }
        if (rows[0].status !== 'Обучение завершено') {
            return res.status(403).json({ error: 'Отзыв можно оставить только после завершения обучения' });
        }

        // Проверяем, не оставлял ли уже отзыв
        const [existing] = await pool.query(
            'SELECT id FROM reviews WHERE application_id = ? AND user_id = ?',
            [application_id, req.session.user.id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Вы уже оставили отзыв по этой заявке' });
        }

        await pool.query(
            'INSERT INTO reviews (user_id, application_id, review_text) VALUES (?, ?, ?)',
            [req.session.user.id, application_id, review_text.trim()]
        );
        res.status(201).json({ message: 'Отзыв успешно добавлен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ─── МАРШРУТЫ: Администратор ──────────────────────────────────

// Middleware проверки роли admin
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    next();
}

// Получить все заявки (для админа)
app.get('/api/admin/applications', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.*, u.login, u.full_name, u.phone, u.email
             FROM applications a
             JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC`
        );
        res.json({ applications: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Изменить статус заявки (для админа)
app.patch('/api/admin/applications/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['Новая', 'Идет обучение', 'Обучение завершено'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }
        res.json({ message: 'Статус обновлён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ─── Запуск сервера ───────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(` Сервер запущен: http://localhost:${PORT}`);
    await createAdmin();
});
