-- =============================================
-- БД: korochki
-- Портал "Корочки.есть"
-- =============================================

CREATE DATABASE IF NOT EXISTS korochki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE korochki;

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заявок
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    payment_method ENUM('cash', 'transfer') NOT NULL,
    status ENUM('Новая', 'Идет обучение', 'Обучение завершено') DEFAULT 'Новая',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    application_id INT NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Администратор по умолчанию (логин: Admin, пароль: KorokNET)
-- Пароль хранится в хешированном виде (bcrypt), здесь placeholder — заменится при первом запуске сервера
INSERT INTO users (login, password, full_name, phone, email, role)
VALUES ('Admin', 'HASH_PLACEHOLDER', 'Администратор', '8(000)000-00-00', 'admin@korochki.ru', 'admin')
ON DUPLICATE KEY UPDATE login = login;
