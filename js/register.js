// js/register.js — логика страницы регистрации

document.addEventListener('DOMContentLoaded', () => {
    initPhoneMask('phone');

    const form = document.getElementById('registerForm');
    form.addEventListener('submit', handleRegister);

    // Снимаем ошибку при вводе
    ['login', 'password', 'full_name', 'phone', 'email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearFieldError(id));
    });
});

function validateRegisterForm(data) {
    let valid = true;

    if (!/^[a-zA-Z0-9]{6,}$/.test(data.login)) {
        showFieldError('login', 'Только латиница и цифры, не менее 6 символов');
        valid = false;
    }
    if (data.password.length < 8) {
        showFieldError('password', 'Минимум 8 символов');
        valid = false;
    }
    if (!/^[а-яёА-ЯЁ\s]+$/.test(data.full_name)) {
        showFieldError('full_name', 'Только кириллица и пробелы');
        valid = false;
    }
    if (!/^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(data.phone)) {
        showFieldError('phone', 'Формат: 8(XXX)XXX-XX-XX');
        valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        showFieldError('email', 'Некорректный формат email');
        valid = false;
    }

    return valid;
}

async function handleRegister(e) {
    e.preventDefault();
    hideAlert();

    const data = {
        login:     document.getElementById('login').value.trim(),
        password:  document.getElementById('password').value,
        full_name: document.getElementById('full_name').value.trim(),
        phone:     document.getElementById('phone').value.trim(),
        email:     document.getElementById('email').value.trim()
    };

    if (!validateRegisterForm(data)) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Создание...';

    const { ok, data: res } = await apiRequest('POST', '/register', data);

    btn.disabled = false;
    btn.textContent = 'Создать пользователя';

    if (ok) {
        showAlert('Аккаунт успешно создан! Перенаправляем...', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
        showAlert(res.error || 'Ошибка при регистрации');
    }
}
