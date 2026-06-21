// js/login.js — логика страницы авторизации

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', handleLogin);

    ['login', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearFieldError(id));
    });
});

async function handleLogin(e) {
    e.preventDefault();
    hideAlert();

    const login    = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value;

    if (!login) {
        showFieldError('login', 'Введите логин');
        return;
    }
    if (!password) {
        showFieldError('password', 'Введите пароль');
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Вход...';

    const { ok, data } = await apiRequest('POST', '/login', { login, password });

    btn.disabled = false;
    btn.textContent = 'Войти';

    if (ok) {
        // Редирект в зависимости от роли
        if (data.user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'applications.html';
        }
    } else {
        showAlert(data.error || 'Неверный логин или пароль');
    }
}
