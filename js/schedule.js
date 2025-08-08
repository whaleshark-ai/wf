class SchedulePage {
    constructor() {
        this.currentUser = null;
        this.weekStart = this.getStartOfWeek(new Date());
        this.staff = [];
        this.teams = [];
        this.filteredStaff = [];
        this.shifts = {}; // { staffId: [{dateISO, start, end, team}] }
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.bindEvents();
        this.renderFilters();
        this.applyFilters();
        this.renderWeekHeader();
        this.renderTable();
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

    loadData() {
        // Staff
        this.staff = JSON.parse(localStorage.getItem('staff')) || [
            { id: 1, name: 'Alice Wong', contract: 'CON001', role: 'manager', status: 'active', team: 'Team A' },
            { id: 2, name: 'Bob Lee', contract: 'CON002', role: 'staff', status: 'active', team: 'Team B' },
            { id: 3, name: 'Charlie Chan', contract: 'CON001', role: 'system_admin', status: 'active', team: 'Team A' },
            { id: 4, name: 'Donna Ng', contract: 'CON003', role: 'staff', status: 'active', team: 'Team C' }
        ];
        localStorage.setItem('staff', JSON.stringify(this.staff));

        // Teams from staff list
        const uniqueTeams = new Set(this.staff.map(s => s.team).filter(Boolean));
        this.teams = Array.from(uniqueTeams);

        // Shifts
        const stored = JSON.parse(localStorage.getItem('shifts'));
        if (stored) {
            this.shifts = stored;
        } else {
            // Seed some sample shifts for the current week
            const ws = this.weekStart;
            const day = (n) => this.toISO(this.addDays(ws, n));
            this.shifts = {
                1: [ { dateISO: day(0), start: '09:00', end: '17:00' }, { dateISO: day(2), start: '12:00', end: '20:00' } ],
                2: [ { dateISO: day(1), start: '08:00', end: '16:00' }, { dateISO: day(3), start: '10:00', end: '18:00' } ],
                3: [ { dateISO: day(4), start: '09:00', end: '17:00' } ],
                4: [ { dateISO: day(0), start: '07:00', end: '15:00' }, { dateISO: day(6), start: '11:00', end: '19:00' } ]
            };
            localStorage.setItem('shifts', JSON.stringify(this.shifts));
        }

        this.filteredStaff = [...this.staff];
    }

    bindEvents() {
        $(document).on('change', '#teamFilter', () => this.applyFilters());
        $(document).on('input', '#staffSearch', () => this.applyFilters());

        $('#prevWeek').on('click', () => {
            this.weekStart = this.addDays(this.weekStart, -7);
            this.renderWeekHeader();
            this.renderTable();
        });
        $('#nextWeek').on('click', () => {
            this.weekStart = this.addDays(this.weekStart, 7);
            this.renderWeekHeader();
            this.renderTable();
        });
        $('#todayBtn').on('click', () => {
            this.weekStart = this.getStartOfWeek(new Date());
            this.renderWeekHeader();
            this.renderTable();
        });
    }

    renderFilters() {
        const select = $('#teamFilter');
        this.teams.sort().forEach(t => select.append(`<option value="${t}">${t}</option>`));
    }

    applyFilters() {
        const team = $('#teamFilter').val() || 'all';
        const query = ($('#staffSearch').val() || '').toLowerCase().trim();
        this.filteredStaff = this.staff.filter(s => {
            const matchTeam = team === 'all' || (s.team || '') === team;
            const matchName = (s.name || '').toLowerCase().includes(query);
            return matchTeam && matchName;
        });
        this.renderTable();
    }

    renderWeekHeader() {
        const end = this.addDays(this.weekStart, 6);
        const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        $('#weekLabel').text(`${fmt(this.weekStart)} - ${fmt(end)}`);
    }

    renderTable() {
        const tbody = $('#scheduleBody');
        tbody.empty();
        if (this.filteredStaff.length === 0) {
            tbody.append(`<tr><td colspan="8" class="px-6 py-6 text-center text-gray-500">No staff match the current filters.</td></tr>`);
            return;
        }
        const days = [...Array(7).keys()].map(i => this.toISO(this.addDays(this.weekStart, i)));
        this.filteredStaff.forEach(s => {
            const cells = days.map(iso => this.renderShiftCell(s.id, iso)).join('');
            const row = `
                <tr>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>${s.name}</div>
                        <div class="text-xs text-gray-500">${s.team || ''}</div>
                    </td>
                    ${cells}
                </tr>`;
            tbody.append(row);
        });
    }

    renderShiftCell(staffId, dateISO) {
        const items = (this.shifts[staffId] || []).filter(x => x.dateISO === dateISO);
        if (items.length === 0) {
            return `<td class="px-4 py-3 align-top">
                <div class="text-xs text-gray-400">—</div>
            </td>`;
        }
        const blocks = items.map(x => `<div class="mb-1 inline-flex text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">${x.start} - ${x.end}</div>`).join('');
        return `<td class="px-4 py-3 align-top">${blocks}</td>`;
    }

    // Date helpers
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay(); // 0 Sun ... 6 Sat
        const diff = (day === 0 ? -6 : 1) - day; // start week on Monday
        return this.addDays(d, diff);
    }
    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        d.setHours(0,0,0,0);
        return d;
    }
    toISO(date) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d.toISOString().slice(0,10);
    }
}

$(document).ready(() => {
    new SchedulePage();
});


