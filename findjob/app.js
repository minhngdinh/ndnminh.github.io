(() => {
    const PAGE_SIZE = 20;
    const state = {
        search: '',
        level: 'all',
        type: 'all',
        district: 'all',
        sort: 'newest',
        page: 1,
        cached: []   // filtered+sorted list, computed once per filter change
    };
    let observer = null;

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Tạo màu logo gradient từ tên công ty
    function colorFromName(name) {
        const palettes = [
            ['#0f766e', '#14b8a6'], ['#7c3aed', '#a78bfa'],
            ['#db2777', '#f472b6'], ['#ea580c', '#fb923c'],
            ['#0369a1', '#38bdf8'], ['#65a30d', '#a3e635'],
            ['#dc2626', '#f87171'], ['#4f46e5', '#818cf8']
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        const [a, b] = palettes[hash % palettes.length];
        return `linear-gradient(135deg, ${a}, ${b})`;
    }

    function initials(name) {
        return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    function formatSalary(s) {
        if (!s) return 'Thoả thuận';
        if (typeof s === 'string') return s;
        return `${s.min}–${s.max} triệu`;
    }

    function daysAgo(dateStr) {
        const today = new Date('2026-05-10');
        const d = new Date(dateStr);
        const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return 'Hôm nay';
        if (diff === 1) return 'Hôm qua';
        if (diff < 7) return `${diff} ngày trước`;
        if (diff < 30) return `${Math.floor(diff / 7)} tuần trước`;
        return `${Math.floor(diff / 30)} tháng trước`;
    }

    function filterJobs(jobs) {
        const q = state.search.trim().toLowerCase();
        return jobs.filter(j => {
            if (q) {
                const haystack = [j.title, j.company, j.district, ...j.tags].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (state.level !== 'all' && j.level !== state.level) return false;
            if (state.type !== 'all' && j.type !== state.type) return false;
            if (state.district !== 'all' && j.district !== state.district) return false;
            return true;
        });
    }

    function sortJobs(jobs) {
        const arr = [...jobs];
        switch (state.sort) {
            case 'salaryDesc': arr.sort((a, b) => (typeof b.salary === 'object' ? b.salary.max : 0) - (typeof a.salary === 'object' ? a.salary.max : 0)); break;
            case 'salaryAsc':  arr.sort((a, b) => (typeof a.salary === 'object' ? a.salary.min : 0) - (typeof b.salary === 'object' ? b.salary.min : 0)); break;
            case 'company':    arr.sort((a, b) => a.company.localeCompare(b.company, 'vi')); break;
            default:           arr.sort((a, b) => new Date(b.posted) - new Date(a.posted));
        }
        return arr;
    }

    function jobCardHTML(job) {
        return `
            <article class="job-card" data-id="${job.id}" tabindex="0" role="button" aria-label="Xem chi tiết ${job.title}">
                <div class="job-card-top">
                    <div class="job-logo" style="background: ${colorFromName(job.company)}">
                        ${initials(job.company)}
                    </div>
                    <div class="job-info">
                        <h3 class="job-title">${job.title}</h3>
                        <p class="job-company">${job.company}</p>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="job-meta-item">📍 ${job.district}</span>
                    <span class="job-meta-item job-salary">💰 ${formatSalary(job.salary)}</span>
                </div>
                <div class="job-tags">
                    <span class="tag tag-level">${job.level}</span>
                    <span class="tag tag-type">${job.type}</span>
                    ${job.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
                <div class="job-card-bottom">
                    <span>🕒 ${daysAgo(job.posted)}</span>
                    <span>Hạn: ${new Date(job.deadline).toLocaleDateString('vi-VN')}</span>
                </div>
            </article>
        `;
    }

    // Recompute filter/sort, reset to page 1, render fresh
    function refresh() {
        state.cached = sortJobs(filterJobs(JOBS));
        state.page = 1;

        const grid = $('#jobsGrid');
        const empty = $('#emptyState');
        const count = $('#jobsCount');

        count.textContent = `${state.cached.length.toLocaleString('vi-VN')} kết quả`;
        grid.innerHTML = '';

        if (state.cached.length === 0) {
            empty.hidden = false;
            $('#loadSentinel').hidden = true;
            return;
        }
        empty.hidden = true;
        appendPage();
    }

    // Append next batch of cards (used by infinite scroll)
    function appendPage() {
        const grid = $('#jobsGrid');
        const sentinel = $('#loadSentinel');

        const start = (state.page - 1) * PAGE_SIZE;
        const end = state.page * PAGE_SIZE;
        const slice = state.cached.slice(start, end);

        // Use DocumentFragment for batched DOM insert (faster for many nodes)
        const tmp = document.createElement('div');
        tmp.innerHTML = slice.map(jobCardHTML).join('');
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        grid.appendChild(frag);

        // Show/hide sentinel
        sentinel.hidden = end >= state.cached.length;
        state.page++;
    }

    function setupInfiniteScroll() {
        if (observer) observer.disconnect();
        const sentinel = $('#loadSentinel');
        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !sentinel.hidden) {
                    appendPage();
                }
            }
        }, { rootMargin: '400px 0px' });   // pre-load before user reaches the bottom
        observer.observe(sentinel);
    }

    function openModal(jobId) {
        const job = JOBS.find(j => j.id === jobId);
        if (!job) return;

        $('#modalBody').innerHTML = `
            <div class="modal-header">
                <div class="modal-logo" style="background: ${colorFromName(job.company)}">
                    ${initials(job.company)}
                </div>
                <div>
                    <h2 class="modal-title" id="modalTitle">${job.title}</h2>
                    <p class="modal-company">${job.company}</p>
                </div>
            </div>

            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Lương</span>
                    <span class="modal-info-value" style="color: var(--primary)">${formatSalary(job.salary)}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Cấp bậc</span>
                    <span class="modal-info-value">${job.level}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Hình thức</span>
                    <span class="modal-info-value">${job.type}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Khu vực</span>
                    <span class="modal-info-value">${job.district}</span>
                </div>
            </div>

            <div class="modal-section">
                <h4>Mô tả công việc</h4>
                <p style="font-size:14px; white-space: pre-wrap;">${job.description}</p>
            </div>

            <div class="modal-section">
                <h4>Yêu cầu</h4>
                <ul class="modal-list">
                    ${job.requirements.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>

            <div class="modal-section">
                <h4>Quyền lợi</h4>
                <ul class="modal-list">
                    ${job.benefits.map(b => `<li>${b}</li>`).join('')}
                </ul>
            </div>

            <div class="modal-section">
                <h4>Địa chỉ</h4>
                <p style="font-size:14px">📍 ${job.address}</p>
            </div>

            <div class="modal-section">
                <h4>Tags</h4>
                <div class="job-tags">
                    ${job.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            </div>

            <a href="${job.applyUrl}" class="btn-apply" target="_blank" rel="noopener">
                Ứng tuyển ngay →
            </a>
        `;

        $('#jobModal').hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        $('#jobModal').hidden = true;
        document.body.style.overflow = '';
    }

    function populateDistricts() {
        const districts = [...new Set(JOBS.map(j => j.district))].sort((a, b) => a.localeCompare(b, 'vi'));
        const select = $('#districtSelect');
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            select.appendChild(opt);
        });
    }

    function renderStats() {
        $('#statTotal').textContent = JOBS.length;
        $('#statCompanies').textContent = new Set(JOBS.map(j => j.company)).size;
        $('#statDistricts').textContent = new Set(JOBS.map(j => j.district)).size;
    }

    function bindEvents() {
        let searchTimer;
        $('#searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const value = e.target.value;
            searchTimer = setTimeout(() => {
                state.search = value;
                refresh();
            }, 200);
        });

        $$('.filter-chips').forEach(group => {
            const filterKey = group.dataset.filter;
            group.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;
                group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state[filterKey] = chip.dataset.value;
                refresh();
            });
        });

        $('#districtSelect').addEventListener('change', (e) => {
            state.district = e.target.value;
            refresh();
        });

        $('#sortSelect').addEventListener('change', (e) => {
            state.sort = e.target.value;
            refresh();
        });

        $('#btnReset').addEventListener('click', () => {
            state.search = '';
            state.level = 'all';
            state.type = 'all';
            state.district = 'all';
            state.sort = 'newest';

            $('#searchInput').value = '';
            $('#districtSelect').value = 'all';
            $('#sortSelect').value = 'newest';
            $$('.filter-chips').forEach(g => {
                g.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                g.querySelector('.chip[data-value="all"]').classList.add('active');
            });
            refresh();
        });

        $('#filterToggle').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const filters = $('#filters');
            const open = filters.classList.toggle('open');
            btn.setAttribute('aria-expanded', String(open));
        });

        $('#jobsGrid').addEventListener('click', (e) => {
            const card = e.target.closest('.job-card');
            if (card) openModal(Number(card.dataset.id));
        });

        $('#jobsGrid').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('.job-card');
                if (card) {
                    e.preventDefault();
                    openModal(Number(card.dataset.id));
                }
            }
        });

        $$('[data-close]').forEach(el => el.addEventListener('click', closeModal));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !$('#jobModal').hidden) closeModal();
        });

        // Theme toggle
        const root = document.documentElement;
        const saved = localStorage.getItem('theme');
        if (saved) root.setAttribute('data-theme', saved);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            root.setAttribute('data-theme', 'dark');
        }

        $('#themeToggle').addEventListener('click', () => {
            const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderStats();
        populateDistricts();
        bindEvents();
        setupInfiniteScroll();
        refresh();
    });
})();
