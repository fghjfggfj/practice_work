// js/applications.js — логика страницы просмотра заявок

let currentAppId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;

    setHeaderUser(user);
    loadApplications();

    // Модалка отзыва
    document.getElementById('closeReviewModal').addEventListener('click', closeReviewModal);
    document.getElementById('cancelReview').addEventListener('click', closeReviewModal);
    document.getElementById('submitReview').addEventListener('click', submitReview);
});

async function loadApplications() {
    const loading = document.getElementById('loadingState');
    const empty   = document.getElementById('emptyState');
    const list    = document.getElementById('applicationsList');

    const { ok, data } = await apiRequest('GET', '/applications');

    loading.style.display = 'none';

    if (!ok || data.applications.length === 0) {
        empty.style.display = 'flex';
        return;
    }

    list.style.display = 'block';
    list.innerHTML = data.applications.map(app => renderApplicationCard(app)).join('');
}

function renderApplicationCard(app) {
    const canReview = app.status === 'Обучение завершено' && !app.review_text;
    const hasReview = !!app.review_text;

    return `
        <div class="app-card">
            <div class="app-card__header">
                <h3 class="app-card__title">${app.course_name}</h3>
                ${statusBadge(app.status)}
            </div>
            <div class="app-card__body">
                <div class="app-card__info">
                    <span class="app-card__label">Дата начала:</span>
                    <span>${formatDate(app.start_date)}</span>
                </div>
                <div class="app-card__info">
                    <span class="app-card__label">Оплата:</span>
                    <span>${paymentLabel(app.payment_method)}</span>
                </div>
                <div class="app-card__info">
                    <span class="app-card__label">Заявка подана:</span>
                    <span>${formatDate(app.created_at)}</span>
                </div>
            </div>
            ${hasReview ? `
                <div class="app-card__review">
                    <p class="app-card__label">Ваш отзыв:</p>
                    <p class="app-card__review-text">${app.review_text}</p>
                </div>
            ` : ''}
            ${canReview ? `
                <div class="app-card__footer">
                    <button class="btn btn--outline btn--sm" onclick="openReviewModal(${app.id})">
                        Оставить отзыв
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function openReviewModal(appId) {
    currentAppId = appId;
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewError').textContent = '';
    document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
    currentAppId = null;
    document.getElementById('reviewModal').style.display = 'none';
}

async function submitReview() {
    const text = document.getElementById('reviewText').value.trim();
    const errorEl = document.getElementById('reviewError');

    if (!text) {
        errorEl.textContent = 'Напишите отзыв перед отправкой';
        return;
    }

    const btn = document.getElementById('submitReview');
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    const { ok, data } = await apiRequest('POST', '/reviews', {
        application_id: currentAppId,
        review_text: text
    });

    btn.disabled = false;
    btn.textContent = 'Отправить отзыв';

    if (ok) {
        closeReviewModal();
        loadApplications();
    } else {
        errorEl.textContent = data.error || 'Ошибка при отправке отзыва';
    }
}
