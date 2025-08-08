// Staff Page JavaScript
class StaffPage {
    constructor() {
        this.currentUser = null;
        this.staff = [];
        this.filteredStaff = [];
        this.isEditing = false;
        this.editingId = null;
        this.canManageStaff = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadStaff();
        this.bindEvents();
        this.applyFilter();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        this.canManageStaff = (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee');
    }

    loadStaff() {
        this.staff = JSON.parse(localStorage.getItem('staff')) || [
            { id: 1, name: 'Alice Wong', contract: 'CON001', role: 'manager', status: 'active' },
            { id: 2, name: 'Bob Lee', contract: 'CON002', role: 'staff', status: 'active' },
            { id: 3, name: 'Charlie Chan', contract: 'CON001', role: 'system_admin', status: 'active' }
        ];
        localStorage.setItem('staff', JSON.stringify(this.staff));
        this.filteredStaff = [...this.staff];
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add Staff button
        $(document).on('click', '#addStaffBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.canManageStaff) return;
            this.openAddModal();
        });

        // Close modal on overlay or close buttons
        $('#staffModal').on('click', (e) => {
            if (e.target && e.target.id === 'staffModal') {
                this.hideModal();
            }
        });
        $(document).on('click', '.close-staff-modal', () => this.hideModal());

        // Submit form
        $('#staffForm').on('submit', (e) => {
            e.preventDefault();
            this.submitStaff();
        });

        // Search input
        $(document).on('input', '#staffSearchInput', () => {
            this.applyFilter();
        });

        // View button → detail page
        $(document).off('click', '.view-staff').on('click', '.view-staff', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.currentTarget).data('id'));
            if (!isNaN(id)) {
                localStorage.setItem('selectedStaffId', String(id));
                window.location.href = 'staff-detail.html';
            }
        });

        // Edit button → open modal prefilled
        $(document).off('click', '.edit-staff').on('click', '.edit-staff', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.canManageStaff) return;
            const id = parseInt($(e.currentTarget).data('id'));
            this.openEditModal(id);
        });
    }

    renderTable() {
        const tbody = $('#staffTableBody');
        tbody.empty();
        const list = this.filteredStaff;
        if (list.length === 0) {
            tbody.append(`<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No staff found. Click "Add Staff" to get started.</td></tr>`);
            return;
        }
        list.forEach(s => {
            const statusBadge = s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const row = `
                <tr class="hover:bg-gray-50" data-id="${s.id}">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${s.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${this.formatRole(s.role)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${s.contract || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge}">${s.status.toUpperCase()}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-staff text-indigo-600 hover:text-indigo-900 mr-3" data-id="${s.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="view-staff text-blue-600 hover:text-blue-900" data-id="${s.id}"><i class="fas fa-eye"></i> View</button>
                    </td>
                </tr>`;
            tbody.append(row);
        });
    }

    applyFilter() {
        const q = ($('#staffSearchInput').val() || '').toLowerCase().trim();
        if (!q) {
            this.filteredStaff = [...this.staff];
        } else {
            this.filteredStaff = this.staff.filter(s => (s.name || '').toLowerCase().includes(q));
        }
        this.renderTable();
    }

    formatRole(role) {
        const map = { system_admin: 'System Admin', manager: 'Manager', staff: 'Staff' };
        return map[role] || role;
    }

    openAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#staffModalTitle').text('Add Staff');
        $('#staffForm')[0].reset();
        $('#staffStatus').val('active');
        this.populateRoleOptions();
        this.showModal();
    }

    openEditModal(id) {
        const record = this.staff.find(s => s.id === id);
        if (!record) return;
        this.isEditing = true;
        this.editingId = id;
        $('#staffModalTitle').text('Edit Staff');
        this.populateRoleOptions();
        $('#staffId').val(record.id);
        $('#staffName').val(record.name);
        $('#staffContract').val(record.contract || '');
        $('#staffRoleSelect').val(record.role);
        $('#staffStatus').val(record.status || 'active');
        this.showModal();
    }

    populateRoleOptions() {
        const role = this.currentUser.role; // system_admin | manager | staff
        let options = [];
        if (role === 'system_admin') {
            options = [
                { value: 'system_admin', label: 'System Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' }
            ];
        } else if (role === 'manager') {
            options = [
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' }
            ];
        } else {
            // Staff cannot add staff by requirement; but show empty/disabled if page accessed
            options = [];
        }
        const select = $('#staffRoleSelect');
        select.empty();
        if (options.length === 0) {
            select.append('<option value="" disabled selected>No roles available</option>');
        } else {
            options.forEach(o => select.append(`<option value="${o.value}">${o.label}</option>`));
            select.val(options[0].value);
        }
        select.prop('disabled', options.length === 0);
    }

    submitStaff() {
        const name = $('#staffName').val().trim();
        const contract = $('#staffContract').val().trim();
        const role = $('#staffRoleSelect').val();
        const status = $('#staffStatus').val();
        if (!name || !contract || !role) {
            alert('Please fill in all required fields');
            return;
        }
        if (this.isEditing && this.editingId) {
            const idx = this.staff.findIndex(s => s.id === this.editingId);
            if (idx !== -1) {
                this.staff[idx] = { ...this.staff[idx], name, contract, role, status };
            }
        } else {
            const newRecord = { id: Date.now(), name, contract, role, status };
            this.staff.push(newRecord);
        }
        localStorage.setItem('staff', JSON.stringify(this.staff));
        this.applyFilter();
        this.hideModal();
        alert(this.isEditing ? 'Staff updated successfully!' : 'Staff added successfully!');
    }

    showModal() {
        $('#staffModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#staffModal').addClass('hidden').hide();
    }
}

// Initialize staff page when DOM is ready
$(document).ready(() => {
    new StaffPage();
}); 