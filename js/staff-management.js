// Staff Management Page JavaScript
class StaffManagementPage {
    constructor() {
        this.currentUser = null;
        this.staff = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadStaffData();
        this.bindEvents();
        this.renderStaffTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Access: admins and managers can view; only admin/manager_licensee can add/edit
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'manager_licensee') {
            alert('Access denied. Only System Admin and Manager roles can view staff.');
            window.location.href = 'settings.html';
        }
    }

    loadStaffData() {
        this.staff = JSON.parse(localStorage.getItem('staff')) || [];
        
        // Add sample data if empty
        if (this.staff.length === 0) {
            this.staff = [
                { id: 1, name: 'John Smith', contract: 'CON001', role: 'staff', status: 'active' },
                { id: 2, name: 'Jane Doe', contract: 'CON001', role: 'manager', status: 'active' },
                { id: 3, name: 'Mike Johnson', contract: 'CON002', role: 'staff', status: 'active' },
                { id: 4, name: 'Sarah Wilson', contract: 'CON002', role: 'staff', status: 'inactive' }
            ];
            localStorage.setItem('staff', JSON.stringify(this.staff));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add staff button (only admin or manager_licensee can add)
        if (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') {
            $('#addStaffBtn').on('click', () => this.showAddModal());
        } else {
            $('#addStaffBtn').hide();
        }
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#staffForm').on('submit', (e) => {
            e.preventDefault();
            this.submitStaff();
        });

        // Close modal when clicking outside
        $(document).on('click', (e) => {
            if ($(e.target).closest('#staffModal').length === 0 && $('#staffModal').is(':visible')) {
                this.hideModal();
            }
        });
    }

    renderStaffTable() {
        const tbody = $('#staffTableBody');
        tbody.empty();

        if (this.staff.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No staff members found. Click "Add Staff" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.staff.forEach(staff => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${staff.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${staff.contract}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            staff.role === 'system_admin' ? 'bg-purple-100 text-purple-800' :
                            staff.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                        }">
                            ${staff.role.replace('_', ' ').toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            staff.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${staff.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        ${(this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') ? `
                        <button class="edit-staff text-indigo-600 hover:text-indigo-900 mr-3" data-id="${staff.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-staff text-red-600 hover:text-red-900" data-id="${staff.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>` : '<span class="text-gray-400 text-xs">No actions</span>'}
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind edit and delete events
        if (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') {
            $('.edit-staff').on('click', (e) => {
                const id = parseInt($(e.target).closest('button').data('id'));
                this.editStaff(id);
            });
            $('.delete-staff').on('click', (e) => {
                const id = parseInt($(e.target).closest('button').data('id'));
                this.deleteStaff(id);
            });
        }
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Staff');
        $('#staffForm')[0].reset();
        $('#staffId').val('');
        this.showModal();
    }

    editStaff(id) {
        const staff = this.staff.find(s => s.id === id);
        if (!staff) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Staff');
        
        // Populate form
        $('#staffId').val(staff.id);
        $('#staffName').val(staff.name);
        $('#staffContract').val(staff.contract);
        $('#staffRole').val(staff.role);
        $('#staffStatus').val(staff.status);
        
        this.showModal();
    }

    deleteStaff(id) {
        if (confirm('Are you sure you want to delete this staff member?')) {
            this.staff = this.staff.filter(s => s.id !== id);
            localStorage.setItem('staff', JSON.stringify(this.staff));
            this.renderStaffTable();
        }
    }

    submitStaff() {
        const formData = {
            name: $('#staffName').val().trim(),
            contract: $('#staffContract').val().trim(),
            role: $('#staffRole').val(),
            status: $('#staffStatus').val()
        };

        // Validation
        if (!formData.name || !formData.contract) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.isEditing) {
            // Update existing staff
            const index = this.staff.findIndex(s => s.id === this.editingId);
            if (index !== -1) {
                this.staff[index] = { ...this.staff[index], ...formData };
            }
        } else {
            // Add new staff
            const newStaff = {
                ...formData,
                id: Date.now()
            };
            this.staff.push(newStaff);
        }

        // Save to localStorage
        localStorage.setItem('staff', JSON.stringify(this.staff));
        
        // Update table
        this.renderStaffTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Staff updated successfully!' : 'Staff added successfully!');
    }

    showModal() {
        $('#staffModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#staffModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize staff management page when DOM is ready
$(document).ready(() => {
    new StaffManagementPage();
}); 