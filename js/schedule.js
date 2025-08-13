class SchedulePage {
    constructor() {
        this.currentUser = null;
        this.weekStart = this.getStartOfWeek(new Date());
        this.staff = [];
        this.teams = [];
        this.filteredStaff = [];
        this.shifts = {}; // { staffId: [{dateISO, start, end, team}] }
        this.shiftTemplates = []; // [{id, type, start, end, zone, status}]
        this.locationZones = []; // from task settings
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('schedule');
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
        // Staff
        this.staff = JSON.parse(localStorage.getItem('staff')) || [];

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

        // Location zones
        this.locationZones = JSON.parse(localStorage.getItem('locationZones')) || [
            { id: 1, name: 'Zone 1' },
            { id: 2, name: 'Zone 2' }
        ];

        // Shift templates
        this.shiftTemplates = JSON.parse(localStorage.getItem('shiftTemplates')) || [
            { id: 1, name: 'Day Shift', type: 'work', start: '09:00', end: '17:00', zoneId: 1, status: 'active' },
            { id: 2, name: 'Annual Leave', type: 'on_leave', start: '00:00', end: '23:59', zoneId: null, status: 'active' }
        ];
        localStorage.setItem('shiftTemplates', JSON.stringify(this.shiftTemplates));
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

        // Templates modal open/close
        $('#addShiftTemplateBtn').on('click', () => this.openTemplateModal());
        $(document).on('click', '.close-template-modal', () => this.hideTemplateModal());
        $('#saveShiftTemplateBtn').on('click', () => this.saveShiftTemplate());

        // Bulk assign modal
        $('#bulkAssignBtn').on('click', () => this.openBulkAssignModal());
        $(document).on('click', '.close-bulk-modal', () => this.hideBulkModal());
        $('#applyBulkAssignBtn').on('click', () => this.applyBulkAssign());
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
            const nameMatch = (s.name || '').toLowerCase().includes(query);
            const idMatch = (String(s.employeeId || '')).toLowerCase().includes(query);
            const matchQuery = !query || nameMatch || idMatch;
            return matchTeam && matchQuery;
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

    // Templates modal helpers
    openTemplateModal() {
        // populate zones
        const zoneOptions = this.locationZones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        $('#tplLocationZone').html('<option value="">Select zone...</option>' + zoneOptions);
        $('#templateModalTitle').text('Add Shift Template');
        $('#shiftTemplateForm')[0].reset();
        $('#shiftTemplateModal').removeClass('hidden').show();
    }
    hideTemplateModal() { $('#shiftTemplateModal').addClass('hidden').hide(); }
    saveShiftTemplate() {
        const name = $('#tplName').val().trim();
        const type = $('#tplShiftType').val();
        const start = $('#tplStart').val();
        const end = $('#tplEnd').val();
        const zoneId = $('#tplLocationZone').val() ? parseInt($('#tplLocationZone').val(),10) : null;
        const status = $('#tplStatus').val();
        if (!name || !type || !start || !end) { alert('Please fill in Name, Shift Type, Start and End.'); return; }
        const tpl = { id: Date.now(), name, type, start, end, zoneId, status };
        this.shiftTemplates.push(tpl);
        localStorage.setItem('shiftTemplates', JSON.stringify(this.shiftTemplates));
        this.hideTemplateModal();
        alert('Template saved.');
    }

    // Bulk assign helpers
    openBulkAssignModal() {
        // template select
        const tplOptions = this.shiftTemplates.filter(t => t.status === 'active').map(t => {
            const label = `${t.name} (${t.type === 'work' ? 'Work' : 'On leave'} ${t.start}-${t.end})`;
            return `<option value="${t.id}">${label}</option>`;
        }).join('');
        $('#bulkTemplateSelect').html(tplOptions);
        // staff list
        const staffBoxes = this.staff.map(s => `
            <label class="inline-flex items-center"><input type="checkbox" value="${s.id}" class="mr-2">${s.name} <span class="text-xs text-gray-500 ml-1">(${s.team || ''})</span></label>
        `).join('');
        $('#bulkStaffList').html(staffBoxes);
        // clear days and end date
        $('#bulkDays input[type="checkbox"]').prop('checked', false);
        $('#bulkRepeatEndDate').val('');
        $('#bulkAssignModal').removeClass('hidden').show();
    }
    hideBulkModal() { $('#bulkAssignModal').addClass('hidden').hide(); }
    applyBulkAssign() {
        const tplId = parseInt($('#bulkTemplateSelect').val(), 10);
        const tpl = this.shiftTemplates.find(t => t.id === tplId);
        if (!tpl) { alert('Select a shift template'); return; }
        const selectedDays = $('#bulkDays input:checked').map(function(){ return parseInt($(this).val(),10); }).get();
        if (selectedDays.length === 0) { alert('Select at least one day'); return; }
        const staffIds = $('#bulkStaffList input:checked').map(function(){ return parseInt($(this).val(),10); }).get();
        if (staffIds.length === 0) { alert('Select at least one staff'); return; }
        
        const endDateStr = $('#bulkRepeatEndDate').val();
        let endDate = null;
        if (endDateStr) {
            endDate = new Date(endDateStr);
            // Validate end date is not before current week
            if (endDate < this.weekStart) {
                alert('End date cannot be before the current week start date');
                return;
            }
        }

        // Calculate how many weeks to apply based on end date
        let weeksToApply = 1; // Default to current week only
        if (endDate) {
            const daysDiff = Math.floor((endDate - this.weekStart) / (1000 * 60 * 60 * 24));
            weeksToApply = Math.floor(daysDiff / 7) + 1; // +1 to include the week containing the end date
            weeksToApply = Math.max(1, weeksToApply); // Ensure at least 1 week
        }

        let assignedCount = 0;
        for (let w = 0; w < weeksToApply; w++) {
            const base = this.addDays(this.weekStart, w * 7);
            
            staffIds.forEach(staffId => {
                selectedDays.forEach(dow => {
                    const date = this.addDays(base, dow);
                    
                    // If we have an end date, check if this date is within range
                    if (endDate && date > endDate) {
                        return; // Skip this date as it's beyond the end date
                    }
                    
                    const dateISO = this.toISO(date);
                    if (!this.shifts[staffId]) this.shifts[staffId] = [];
                    this.shifts[staffId].push({ dateISO, start: tpl.start, end: tpl.end, zoneId: tpl.zoneId, type: tpl.type });
                    assignedCount++;
                });
            });
        }
        
        localStorage.setItem('shifts', JSON.stringify(this.shifts));
        this.renderTable();
        this.hideBulkModal();
        
        const endDateMsg = endDate ? ` until ${endDate.toLocaleDateString()}` : ' for current week only';
        alert(`${assignedCount} shifts assigned successfully${endDateMsg}.`);
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


