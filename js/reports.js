class ReportsPage {
    constructor() {
        this.currentUser = null;
        this.activeReport = 'task-summary';
        this.contractNumber = '';
        this.staff = [];
        this.contractToStaff = {};
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('reports');
        this.loadData();
        this.bindEvents();
        this.render();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = JSON.parse(currentUser);
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    applyAccessVisibility(currentPageKey) {
        try {
            const rolesV2 = JSON.parse(localStorage.getItem('userRolesV2')||'[]');
            const pagesV2 = JSON.parse(localStorage.getItem('accessPagesV2')||'{}');
            const roleKey = this.currentUser.role;
            let roleRecord = rolesV2.find(r => r.accessLevel === roleKey || (r.name||'').toLowerCase().replace(/\s+/g,'_') === roleKey);
            if (!roleRecord && roleKey === 'manager_licensee') {
                roleRecord = rolesV2.find(r => r.accessLevel === 'manager');
            }
            const pages = roleRecord ? pagesV2[roleRecord.id] : null;
            if (pages) {
                const map = {
                    dashboard: 'dashboard.html', task: 'task.html', staff: 'staff.html', schedule: 'schedule.html',
                    locate: 'locate.html', documents: 'documents.html', reports: 'reports.html', messages: 'message-center.html', settings: 'settings.html'
                };
                Object.entries(map).forEach(([key, href]) => { if (!pages[key]) { $(`a[href="${href}"]`).hide(); } });
                if (!pages[currentPageKey]) {
                    const order = ['dashboard','task','staff','schedule','locate','documents','reports','messages','settings'];
                    for (const key of order) { if (pages[key]) { window.location.href = map[key]; return; } }
                }
            }
        } catch (e) { /* no-op */ }
    }

    loadData() {
        // Determine contract number: use current user's contract if present, else default to first staff contract
        this.staff = JSON.parse(localStorage.getItem('staff')) || [];
        const userContract = this.currentUser?.contract;
        let contract = userContract || (this.staff[0]?.contract) || 'CON001';
        this.contractNumber = contract;

        // Build contract -> staff list map
        this.contractToStaff = this.staff.reduce((map, s) => {
            const key = s.contract || 'UNASSIGNED';
            if (!map[key]) map[key] = [];
            map[key].push(s);
            return map;
        }, {});
    }

    bindEvents() {
        $(document).on('click', '.report-nav', (e) => {
            const key = $(e.currentTarget).data('report');
            this.activeReport = key;
            this.renderTitle();
        });
        $(document).on('input', '#staffSearch', () => this.filterStaffOptions());
        $('#exportBtn').on('click', () => this.exportCsv());
    }

    render() {
        this.renderTitle();
        $('#contractNumber').val(this.contractNumber);
        this.populateStaffOptions();
        this.setDefaultDates();
    }

    renderTitle() {
        const titles = {
            'task-summary': 'Task Summary Report',
            'patrol-summary': 'Patrol Summary Report',
            'daily-activity': 'Daily Activity Report',
            'task-activity': 'Task Activity Report'
        };
        $('#reportTitle').text(titles[this.activeReport] || 'Report');
    }

    setDefaultDates() {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        $('#startDate').val(start.toISOString().slice(0,10));
        $('#endDate').val(today.toISOString().slice(0,10));
    }

    populateStaffOptions() {
        const select = $('#staffSelect');
        select.empty();
        select.append('<option value="">All Staff</option>');
        const list = this.contractToStaff[this.contractNumber] || [];
        list.forEach(s => select.append(`<option value="${s.id}">${s.name}</option>`));
    }

    filterStaffOptions() {
        const q = ($('#staffSearch').val() || '').toLowerCase().trim();
        const select = $('#staffSelect');
        select.find('option').each(function(idx) {
            if (idx === 0) return; // keep All Staff
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(q));
        });
    }

    exportCsv() {
        // Gather selected filters
        const status = Array.from($('#statusSelect option:selected')).map(o => o.value);
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();
        const staffId = $('#staffSelect').val();

        const rows = [
            ['Report', $('#reportTitle').text()],
            ['Contract', this.contractNumber],
            ['Status', status.join('|') || 'All'],
            ['Start Date', startDate],
            ['End Date', endDate],
            ['Staff', staffId || 'All']
        ];
        const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

$(document).ready(() => {
    new ReportsPage();
});


