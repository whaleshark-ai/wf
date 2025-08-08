// Access Control Management Page JavaScript
class AccessControlManagementPage {
    constructor() {
        this.currentUser = null;
        this.accessControls = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadAccessData();
        this.bindEvents();
        this.renderAccessTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to access control management
        if (this.currentUser.role !== 'system_admin') {
            alert('Access denied. Only System Admin can manage access control.');
            window.location.href = 'settings.html';
        }
    }

    loadAccessData() {
        // Prefer new matrix storage
        this.accessControls = JSON.parse(localStorage.getItem('accessControlMatrix')) || [];

        if (this.accessControls.length === 0) {
            // Seed defaults if empty
            this.accessControls = [
                { role: 'system_admin', dashboard: true, task: true, staff: true, schedule: true, locate: true, documents: true, reports: true, messages: true, settings: true },
                { role: 'manager', dashboard: true, task: true, staff: true, schedule: true, locate: true, documents: true, reports: true, messages: true, settings: true },
                { role: 'staff', dashboard: true, task: true, staff: false, schedule: false, locate: true, documents: false, reports: false, messages: true, settings: false }
            ];
            localStorage.setItem('accessControlMatrix', JSON.stringify(this.accessControls));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Inline toggle for matrix cells (defer save until user clicks Save)
        $(document).on('change', '.toggle-access', (e) => this.onToggleAccess(e));
        $('#saveAccessBtn').on('click', () => this.saveMatrix());
    }

    renderAccessTable() {
        const tbody = $('#accessTableBody');
        tbody.empty();

        this.accessControls.forEach(access => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${this.formatRoleName(access.role)}</div>
                    </td>
                    ${this.renderAccessCell(access, 'dashboard')}
                    ${this.renderAccessCell(access, 'task')}
                    ${this.renderAccessCell(access, 'staff')}
                    ${this.renderAccessCell(access, 'schedule')}
                    ${this.renderAccessCell(access, 'locate')}
                    ${this.renderAccessCell(access, 'documents')}
                    ${this.renderAccessCell(access, 'reports')}
                    ${this.renderAccessCell(access, 'messages')}
                    ${this.renderAccessCell(access, 'settings')}
                </tr>
            `;
            tbody.append(row);
        });
    }

    renderAccessCell(access, key) {
        const checked = access[key] ? 'checked' : '';
        return `<td class="px-6 py-4 whitespace-nowrap text-center">
            <input type="checkbox" class="toggle-access" data-role="${access.role}" data-key="${key}" ${checked}>
        </td>`;
    }

    formatRoleName(role) {
        return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Modal-based add/edit removed in favor of inline toggles

    // editAccess removed

    // deleteAccess removed

    onToggleAccess(e) {
        const checkbox = $(e.target);
        const role = checkbox.data('role');
        const key = checkbox.data('key');
        const value = checkbox.is(':checked');

        const idx = this.accessControls.findIndex(a => a.role === role);
        if (idx !== -1) {
            this.accessControls[idx][key] = value;
        }
    }

    saveMatrix() {
        localStorage.setItem('accessControlMatrix', JSON.stringify(this.accessControls));
        alert('Access permissions saved.');
    }

    showModal() {
        $('#accessModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#accessModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize access control management page when DOM is ready
$(document).ready(() => {
    new AccessControlManagementPage();
}); 