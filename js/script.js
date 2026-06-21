// js/script.js — общие утилиты для всех страниц

const API = 'http://localhost:3000/api';

// ─── Запрос к API ─────────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // передаём куки сессии
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(API + endpoint, options);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// ─── Проверка авторизации ─────────────────────────────────────
async function requireAuth(redirectTo = 'login.html') {
    const { ok, data } = await apiRequest('GET', '/me');
    if (!ok) {
        window.location.href = redirectTo;
        return null;
    }
    return data.user;
}

async function requireAdmin() {
    const user = await requireAuth();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// ─── Для главной страницы — обновить шапку если залогинен ─────
async function checkAuthForIndex() {
    const { ok, data } = await apiRequest('GET', '/me');
    const nav = document.getElementById('headerNav');
    if (!nav) return;

    if (ok && data.user) {
        if (data.user.role === 'admin') {
            nav.innerHTML = `
                <span class="header__user">Привет, ${data.user.login}</span>
                <a href="admin.html" class="btn btn--outline btn--sm">Панель админа</a>
                <button class="btn btn--ghost btn--sm" onclick="logout()">Выйти</button>
            `;
        } else {
            nav.innerHTML = `
                <span class="header__user">Привет, ${data.user.login}</span>
                <a href="applications.html" class="btn btn--outline btn--sm">Мои заявки</a>
                <a href="application_form.html" class="btn btn--primary btn--sm">Подать заявку</a>
                <button class="btn btn--ghost btn--sm" onclick="logout()">Выйти</button>
            `;
        }
    }
}

// ─── Выход ────────────────────────────────────────────────────
async function logout() {
    await apiRequest('POST', '/logout');
    window.location.href = 'login.html';
}

// ─── Показать ошибку под полем ────────────────────────────────
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (field) field.classList.add('form-input--error');
    if (error) error.textContent = message;
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (field) field.classList.remove('form-input--error');
    if (error) error.textContent = '';
}

// ─── Показать общий алерт формы ───────────────────────────────
function showAlert(message, type = 'error') {
    const alert = document.getElementById('formAlert');
    if (!alert) return;
    alert.textContent = message;
    alert.className = `alert alert--${type}`;
    alert.style.display = 'block';
}

function hideAlert() {
    const alert = document.getElementById('formAlert');
    if (alert) alert.style.display = 'none';
}

// ─── Toast уведомление (для админки) ─────────────────────────
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast--${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ─── Форматирование даты ──────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
}

// ─── Маска телефона ───────────────────────────────────────────
function initPhoneMask(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function () {
        let val = this.value.replace(/\D/g, '');
        if (val.length === 0) { this.value = ''; return; }
        if (val[0] !== '8') val = '8' + val;
        val = val.substring(0, 11);

        let result = '';
        if (val.length >= 1) result = val[0];
        if (val.length >= 2) result += '(' + val.substring(1, 4);
        if (val.length >= 5) result += ')' + val.substring(4, 7);
        if (val.length >= 8) result += '-' + val.substring(7, 9);
        if (val.length >= 10) result += '-' + val.substring(9, 11);
        this.value = result;
    });
}

// ─── Маска даты ДД.ММ.ГГГГ ───────────────────────────────────
function initDateMask(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function () {
        let val = this.value.replace(/\D/g, '');
        val = val.substring(0, 8);
        let result = '';
        if (val.length >= 1) result = val.substring(0, 2);
        if (val.length >= 3) result += '.' + val.substring(2, 4);
        if (val.length >= 5) result += '.' + val.substring(4, 8);
        this.value = result;
    });
}

// ─── Установить имя пользователя в шапке ─────────────────────
function setHeaderUser(user) {
    const el = document.getElementById('headerUser');
    if (el && user) el.textContent = 'Привет, ' + user.login;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// ─── Статус → CSS-класс ───────────────────────────────────────
function statusBadge(status) {
    const map = {
        'Новая': 'badge--warning',
        'Идет обучение': 'badge--info',
        'Обучение завершено': 'badge--success'
    };
    return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

// ─── Оплата → читаемый текст ──────────────────────────────────
function paymentLabel(method) {
    return method === 'cash' ? 'Наличными' : 'Переводом';
}
