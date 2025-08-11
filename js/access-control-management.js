// Access Control Management Page JavaScript
class AccessControlManagementPage {
    constructor() {
        this.currentUser = null;
        this.roles = []; // [{id, name, accessLevel, status}]
        this.pages = {}; // { [roleId]: { dashboard: boolean, ... } }
        this.taskSettings = {}; // { [roleId]: { templates: 'manage'|'view'|'hidden', documents: ... } }
        this.selectedRoleId = null;
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadAccessData();
        this.bindEvents();
        this.renderRolesList();
        this.selectFirstRole();
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
        // roles
        this.roles = JSON.parse(localStorage.getItem('userRolesV2')) || [
            { id: 1, name: 'System Admin', accessLevel: 'system_admin', status: 'active' },
            { id: 2, name: 'Manager', accessLevel: 'manager', status: 'active' },
            { id: 3, name: 'Frontline', accessLevel: 'frontline', status: 'active' }
        ];
        localStorage.setItem('userRolesV2', JSON.stringify(this.roles));

        // pages matrix
        this.pages = JSON.parse(localStorage.getItem('accessPagesV2')) || {};
        if (Object.keys(this.pages).length === 0) {
            this.roles.forEach(r => {
                this.pages[r.id] = {
                    dashboard: true, task: true, staff: r.accessLevel !== 'frontline', schedule: r.accessLevel !== 'frontline', locate: true, documents: true, reports: r.accessLevel !== 'frontline', messages: true, settings: r.accessLevel !== 'frontline'
                };
            });
            localStorage.setItem('accessPagesV2', JSON.stringify(this.pages));
        }

        // task settings permissions
        this.taskSettings = JSON.parse(localStorage.getItem('accessTaskSettingsV2')) || {};
        if (Object.keys(this.taskSettings).length === 0) {
            this.roles.forEach(r => {
                this.taskSettings[r.id] = {
                    templates: r.accessLevel === 'frontline' ? 'view' : 'manage',
                    categories: r.accessLevel === 'frontline' ? 'view' : 'manage',
                    customPoi: r.accessLevel === 'frontline' ? 'view' : 'manage',
                    checkpoints: r.accessLevel === 'frontline' ? 'view' : 'manage',
                    zones: r.accessLevel === 'frontline' ? 'view' : 'manage',
                    documents: r.accessLevel === 'frontline' ? 'view' : 'manage'
                };
            });
            localStorage.setItem('accessTaskSettingsV2', JSON.stringify(this.taskSettings));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Roles list
        $(document).on('click', '.role-item', (e) => {
            const id = parseInt($(e.currentTarget).data('id'), 10);
            this.selectRole(id);
        });
        $('#addRoleInlineBtn').on('click', () => this.openAddRole());
        $(document).on('click', '.close-role-modal', () => this.hideAddRole());
        $('#saveNewRoleBtn').on('click', () => this.saveNewRole());

        // Pages matrix
        $(document).on('change', '.page-visible', (e) => this.onTogglePage(e));

        // Task settings radios
        $(document).on('change', '.task-permission', (e) => this.onChangeTaskPermission(e));

        // Save all
        $('#saveAllAccessBtn').on('click', () => this.saveAll());
    }

    renderRolesList() {
        const list = $('#rolesList');
        list.empty();
        this.roles.forEach(r => {
            const item = `<li><a href="#" class="role-item block px-3 py-2 rounded hover:bg-gray-100 ${this.selectedRoleId === r.id ? 'bg-gray-100 font-medium' : ''}" data-id="${r.id}">${r.name} <span class="text-xs text-gray-500">(${this.formatLevel(r.accessLevel)})</span></a></li>`;
            list.append(item);
        });
    }

    selectFirstRole() {
        if (this.roles.length > 0) this.selectRole(this.roles[0].id);
    }

    selectRole(id) {
        this.selectedRoleId = id;
        const role = this.roles.find(r => r.id === id);
        if (!role) return;
        $('#selectedRoleSummary').removeClass('hidden');
        $('#selectedRoleName').text(role.name);
        $('#selectedRoleLevel').text(this.formatLevel(role.accessLevel));
        this.renderPagesMatrix();
        this.renderTaskSettings();
        this.renderRolesList();
    }

    renderPagesMatrix() {
        const tbody = $('#pagesMatrixBody');
        tbody.empty();
        const pages = [
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'task', label: 'Task' },
            { key: 'staff', label: 'Staff' },
            { key: 'schedule', label: 'Schedule' },
            { key: 'locate', label: 'Locate' },
            { key: 'documents', label: 'Documents' },
            { key: 'reports', label: 'Reports' },
            { key: 'messages', label: 'Message Center' },
            { key: 'settings', label: 'Settings' }
        ];
        const state = this.pages[this.selectedRoleId] || {};
        pages.forEach(p => {
            const checked = state[p.key] ? 'checked' : '';
            const row = `<tr>
                <td class="px-6 py-3">${p.label}</td>
                <td class="px-6 py-3 text-center"><input type="checkbox" class="page-visible" data-key="${p.key}" ${checked}></td>
            </tr>`;
            tbody.append(row);
        });
    }

    renderTaskSettings() {
        const tbody = $('#taskSettingsBody');
        tbody.empty();
        const role = this.roles.find(r => r.id === this.selectedRoleId);
        const perms = this.taskSettings[this.selectedRoleId] || {};
        const rows = [
            { key: 'templates', label: 'Task Templates' },
            { key: 'categories', label: 'Task Categories' },
            { key: 'customPoi', label: 'Custom POI' },
            { key: 'checkpoints', label: 'Checkpoints' },
            { key: 'zones', label: 'Location Zones' },
            { key: 'documents', label: 'Documents' }
        ];
        rows.forEach(rw => {
            const manageDisabled = rw.key === 'documents' && !(role.accessLevel === 'manager' || role.accessLevel === 'system_admin') ? 'disabled' : '';
            const val = perms[rw.key] || 'view';
            const row = `<tr>
                <td class="px-6 py-3">${rw.label}</td>
                <td class="px-6 py-3 text-center"><input type="radio" name="perm_${rw.key}" value="manage" class="task-permission" data-key="${rw.key}" ${val==='manage'?'checked':''} ${manageDisabled}></td>
                <td class="px-6 py-3 text-center"><input type="radio" name="perm_${rw.key}" value="view" class="task-permission" data-key="${rw.key}" ${val==='view'?'checked':''}></td>
                <td class="px-6 py-3 text-center"><input type="radio" name="perm_${rw.key}" value="hidden" class="task-permission" data-key="${rw.key}" ${val==='hidden'?'checked':''}></td>
            </tr>`;
            tbody.append(row);
        });
    }

    onTogglePage(e) {
        const key = $(e.currentTarget).data('key');
        const checked = $(e.currentTarget).is(':checked');
        if (!this.pages[this.selectedRoleId]) this.pages[this.selectedRoleId] = {};
        this.pages[this.selectedRoleId][key] = checked;
    }

    onChangeTaskPermission(e) {
        const key = $(e.currentTarget).data('key');
        const val = $(e.currentTarget).val();
        if (!this.taskSettings[this.selectedRoleId]) this.taskSettings[this.selectedRoleId] = {};
        this.taskSettings[this.selectedRoleId][key] = val;
    }

    saveAll() {
        localStorage.setItem('userRolesV2', JSON.stringify(this.roles));
        localStorage.setItem('accessPagesV2', JSON.stringify(this.pages));
        localStorage.setItem('accessTaskSettingsV2', JSON.stringify(this.taskSettings));
        alert('Access control saved.');
    }

    openAddRole() {
        $('#roleAddForm')[0].reset();
        $('#roleAddModal').removeClass('hidden').show();
    }
    hideAddRole() { $('#roleAddModal').addClass('hidden').hide(); }
    saveNewRole() {
        const name = $('#newRoleName').val().trim();
        const accessLevel = $('#newRoleLevel').val();
        const status = $('#newRoleStatus').val();
        if (!name || !accessLevel) { alert('Please fill role name and access level'); return; }
        const id = Date.now();
        this.roles.push({ id, name, accessLevel, status });
        // defaults for pages and task settings
        this.pages[id] = {
            dashboard: true, task: true, staff: accessLevel !== 'frontline', schedule: accessLevel !== 'frontline', locate: true, documents: true, reports: accessLevel !== 'frontline', messages: true, settings: accessLevel !== 'frontline'
        };
        this.taskSettings[id] = {
            templates: accessLevel === 'frontline' ? 'view' : 'manage',
            categories: accessLevel === 'frontline' ? 'view' : 'manage',
            customPoi: accessLevel === 'frontline' ? 'view' : 'manage',
            checkpoints: accessLevel === 'frontline' ? 'view' : 'manage',
            zones: accessLevel === 'frontline' ? 'view' : 'manage',
            documents: accessLevel === 'frontline' ? 'view' : 'manage'
        };
        this.hideAddRole();
        this.renderRolesList();
        this.selectRole(id);
    }

    formatLevel(level) { return level === 'system_admin' ? 'System Admin' : level === 'manager' ? 'Manager' : 'Frontline'; }

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