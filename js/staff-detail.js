class StaffDetailPage {
    constructor() {
        this.currentUser = null;
        this.staffMember = null;
        this.locationHistory = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadStaffMember();
        this.loadLocationHistory();
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
    }

    loadStaffMember() {
        const idStr = localStorage.getItem('selectedStaffId');
        const id = idStr ? parseInt(idStr, 10) : NaN;
        const staffList = JSON.parse(localStorage.getItem('staff')) || [];
        this.staffMember = staffList.find(s => s.id === id) || null;
        if (!this.staffMember) {
            // If not found, go back safely
            window.location.href = 'staff.html';
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Tabs switching
        $(document).on('click', '#tab-profile', (e) => {
            e.preventDefault();
            this.switchTab('profile');
        });
        $(document).on('click', '#tab-location', (e) => {
            e.preventDefault();
            this.switchTab('location');
        });
    }

    render() {
        if (!this.staffMember) return;
        $('#staffNameHeading').text(this.staffMember.name);
        $('#detailName').text(this.staffMember.name);
        $('#detailRole').text(this.formatRole(this.staffMember.role));
        $('#detailContract').text(this.staffMember.contract || '');
        const badge = $('#detailStatus');
        const isActive = this.staffMember.status === 'active';
        badge.text(this.staffMember.status.toUpperCase());
        badge.removeClass().addClass('inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'));

        this.renderLocationHistory();
    }

    formatRole(role) {
        const map = { system_admin: 'System Admin', manager: 'Manager', staff: 'Staff' };
        return map[role] || role;
    }

    switchTab(tabKey) {
        const activeClasses = 'border-blue-600 text-blue-600';
        const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
        if (tabKey === 'profile') {
            $('#tab-profile').removeClass(inactiveClasses).addClass(activeClasses);
            $('#tab-location').removeClass(activeClasses).addClass(inactiveClasses);
            $('#panel-profile').removeClass('hidden');
            $('#panel-location').addClass('hidden');
        } else {
            $('#tab-location').removeClass(inactiveClasses).addClass(activeClasses);
            $('#tab-profile').removeClass(activeClasses).addClass(inactiveClasses);
            $('#panel-location').removeClass('hidden');
            $('#panel-profile').addClass('hidden');
        }
    }

    loadLocationHistory() {
        if (!this.staffMember) return;
        const allHistory = JSON.parse(localStorage.getItem('staffLocationHistory')) || {};
        let history = allHistory[this.staffMember.id];
        if (!history) {
            // Seed with sample data if missing
            const now = Date.now();
            history = [
                { ts: now - 1000 * 60 * 15, locationName: 'Building A - Floor 1', details: 'Clock-in' },
                { ts: now - 1000 * 60 * 10, locationName: 'Building A - Floor 2', details: 'Patrol' },
                { ts: now - 1000 * 60 * 5, locationName: 'Building B - Floor 1', details: 'Break' }
            ];
            allHistory[this.staffMember.id] = history;
            localStorage.setItem('staffLocationHistory', JSON.stringify(allHistory));
        }
        // Sort desc by ts
        this.locationHistory = history.sort((a, b) => b.ts - a.ts);
    }

    renderLocationHistory() {
        const tbody = $('#locationHistoryBody');
        if (!tbody.length) return;
        tbody.empty();
        if (!this.locationHistory || this.locationHistory.length === 0) {
            tbody.append(`<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No location history.</td></tr>`);
            return;
        }
        this.locationHistory.forEach(r => {
            const time = new Date(r.ts).toLocaleString();
            const row = `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${time}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.locationName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.details || ''}</td>
                </tr>`;
            tbody.append(row);
        });
    }
}

$(document).ready(() => {
    new StaffDetailPage();
});


