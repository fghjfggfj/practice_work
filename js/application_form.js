// js/application_form.js — логика страницы подачи заявки

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;

    setHeaderUser(user);
    initDateMask('start_date');

    const form = document.getElementById('applicationForm');
    form.addEventListener('submit', handleSubmit);

    // Снимаем ошибки при вводе
    document.getElementById('course_name').addEventListener('change', () => {
        clearFieldError('course_name');
    });
    document.getElementById('start_date').addEventListener('input', () => {
        clearFieldError('start_date');
    });
    document.querySelectorAll('input[name="payment_method"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('paymentError').textContent = '';
        });
    });
});

function validateForm(data) {
    let valid = true;

    if (!data.course_name) {
        showFieldError('course_name', 'Выберите курс');
        valid = false;
    }

    // Проверка даты ДД.ММ.ГГГГ
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(data.start_date)) {
        showFieldError('start_date', 'Введите дату в формате ДД.ММ.ГГГГ');
        valid = false;
    } else {
        const [dd, mm, yyyy] = data.start_date.split('.').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        if (date < new Date()) {
            showFieldError('start_date', 'Дата не может быть в прошлом');
            valid = false;
        }
    }

    if (!data.payment_method) {
        document.getElementById('paymentError').textContent = 'Выберите способ оплаты';
        valid = false;
    }

    return valid;
}

async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();

    const course_name    = document.getElementById('course_name').value;
    const start_date_raw = document.getElementById('start_date').value.trim();
    const payment_method = document.querySelector('input[name="payment_method"]:checked')?.value || '';

    const data = { course_name, start_date: start_date_raw, payment_method };

    if (!validateForm(data)) return;

    // Конвертируем дату из ДД.ММ.ГГГГ в ГГГГ-ММ-ДД для MySQL
    const [dd, mm, yyyy] = start_date_raw.split('.');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    const { ok, data: res } = await apiRequest('POST', '/applications', {
        course_name,
        start_date: isoDate,
        payment_method
    });

    btn.disabled = false;
    btn.textContent = 'Отправить';

    if (ok) {
        showAlert('Заявка успешно отправлена! Перенаправляем...', 'success');
        setTimeout(() => { window.location.href = 'applications.html'; }, 1500);
    } else {
        showAlert(res.error || 'Ошибка при отправке заявки');
    }
}
