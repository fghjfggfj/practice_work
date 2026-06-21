// js/admin.js — логика панели администратора

const ITEMS_PER_PAGE = 10;
let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
let selectedAppId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAdmin();
    if (!user) return;

    setHeaderUser(user);
    loadAllApplications();

    // Фильтры
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterSearch').addEventListener('input', applyFilters);

    // Модалка смены статуса
    document.getElementById('closeStatusModal').addEventListener('click', closeStatusModal);
    document.getElementById('cancelStatus').addEventListener('click', closeStatusModal);
    document.getElementById('confirmStatus').addEventListener('click', confirmStatusChange);
});

async function loadAllApplications() {
    const loading = document.getElementById('loadingState');
    const empty   = document.getElementById('emptyState');
    const table   = document.getElementById('tableWrapper');

    const { ok, data } = await apiRequest('GET', '/admin/applications');

    loading.style.display = 'none';

    if (!ok) {
        showToast('Ошибка загрузки заявок', 'error');
        return;
    }

    allApplications = data.applications;
    applyFilters();
}

function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();

    filteredApplications = allApplications.filter(app => {
        const matchStatus = !status || app.status === status;
        const matchSearch = !search ||
            app.full_name.toLowerCase().includes(search) ||
            app.login.toLowerCase().includes(search);
        return matchStatus && matchSearch;
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const empty   = document.getElementById('emptyState');
    const table   = document.getElementById('tableWrapper');
    const pagination = document.getElementById('pagination');
    const countEl = document.getElementById('totalCount');

    countEl.textContent = `Всего заявок: ${filteredApplications.length}`;

    if (filteredApplications.length === 0) {
        empty.style.display = 'flex';
        table.style.display = 'none';
        pagination.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'block';

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredApplications.slice(start, start + ITEMS_PER_PAGE);

    document.getElementById('applicationsBody').innerHTML = pageItems.map((app, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td>
                <strong>${app.full_name}</strong><br>
                <small class="text-muted">${app.login} | ${app.phone}</small>
            </td>
            <td>${app.course_name}</td>
            <td>${formatDate(app.start_date)}</td>
            <td>${paymentLabel(app.payment_method)}</td>
            <td>${statusBadge(app.status)}</td>
            <td>
                <button class="btn btn--outline btn--sm" onclick="openStatusModal(${app.id}, '${app.status}', '${app.full_name}')">
                    Изменить
                </button>
            </td>
        </tr>
    `).join('');

    renderPagination();
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    let html = '';

    html += `<button class="pagination__btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">Назад</button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination__btn ${i === currentPage ? 'pagination__btn--active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    html += `<button class="pagination__btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Вперед</button>`;

    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
}

function openStatusModal(appId, currentStatus, fullName) {
    selectedAppId = appId;
    document.getElementById('modalAppInfo').textContent = `Пользователь: ${fullName}`;
    document.getElementById('newStatus').value = currentStatus;
    document.getElementById('statusModal').style.display = 'flex';
}

function closeStatusModal() {
    selectedAppId = null;
    document.getElementById('statusModal').style.display = 'none';
}

async function confirmStatusChange() {
    const newStatus = document.getElementById('newStatus').value;

    const btn = document.getElementById('confirmStatus');
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    const { ok, data } = await apiRequest('PATCH', `/admin/applications/${selectedAppId}`, { status: newStatus });

    btn.disabled = false;
    btn.textContent = 'Сохранить';

    if (ok) {
        closeStatusModal();
        showToast('Статус успешно обновлён');
        // Обновляем локально без перезагрузки
        const app = allApplications.find(a => a.id === selectedAppId);
        if (app) app.status = newStatus;
        applyFilters();
    } else {
        showToast(data.error || 'Ошибка при обновлении статуса', 'error');
    }
}
