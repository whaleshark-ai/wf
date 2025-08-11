// User Roles Management Page JavaScript
class UserRolesManagementPage {
    constructor() {
        this.currentUser = null;
        this.roles = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadRolesData();
        this.bindEvents();
        this.renderRolesTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to user roles management
        if (this.currentUser.role !== 'system_admin') {
            alert('Access denied. Only System Admin can manage user roles.');
            window.location.href = 'settings.html';
        }
    }

    loadRolesData() {
        this.roles = JSON.parse(localStorage.getItem('userRoles')) || [];
        
        // Add sample data if empty
        if (this.roles.length === 0) {
            this.roles = [
                { id: 1, name: 'System Admin', jobNature: 'system_admin', status: 'active', createdDate: '2024-01-01' },
                { id: 2, name: 'Manager', jobNature: 'manager', status: 'active', createdDate: '2024-01-01' },
                { id: 3, name: 'Frontline', jobNature: 'frontline', status: 'active', createdDate: '2024-01-01' }
            ];
            localStorage.setItem('userRoles', JSON.stringify(this.roles));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add role button (ensure delegated and stops propagation)
        $(document).on('click', '#addRoleBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddModal();
        });
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#roleForm').on('submit', (e) => {
            e.preventDefault();
            this.submitRole();
        });

        // Close modal when clicking the overlay background only
        $('#roleModal').on('click', (e) => {
            if (e.target && e.target.id === 'roleModal') {
                this.hideModal();
            }
        });
    }

    renderRolesTable() {
        const tbody = $('#rolesTableBody');
        tbody.empty();

        if (this.roles.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No roles found. Click "Add Role" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.roles.forEach(role => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${role.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            role.jobNature === 'system_admin' ? 'bg-purple-100 text-purple-800' :
                            role.jobNature === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                        }">
                            ${this.formatAccessLevel(role.jobNature)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${role.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(role.createdDate)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-role text-indigo-600 hover:text-indigo-900 mr-3" data-id="${role.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-role text-red-600 hover:text-red-900" data-id="${role.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind edit and delete events
        $(document).off('click', '.edit-role').on('click', '.edit-role', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.editRole(id);
        });

        $('.delete-role').on('click', (e) => {
            const id = parseInt($(e.target).closest('button').data('id'));
            this.deleteRole(id);
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatAccessLevel(level) {
        const map = { system_admin: 'System Admin', manager: 'Manager', frontline: 'Frontline' };
        return map[level] || level;
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Role');
        $('#roleForm')[0].reset();
        $('#roleId').val('');
        this.showModal();
    }

    editRole(id) {
        const role = this.roles.find(r => r.id === id);
        if (!role) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Role');
        
        // Populate form
        $('#roleId').val(role.id);
        $('#roleName').val(role.name);
        $('#jobNature').val(role.jobNature);
        $('#roleStatus').val(role.status);
        
        this.showModal();
    }

    deleteRole(id) {
        if (confirm('Are you sure you want to delete this role?')) {
            this.roles = this.roles.filter(r => r.id !== id);
            localStorage.setItem('userRoles', JSON.stringify(this.roles));
            this.renderRolesTable();
        }
    }

    submitRole() {
        const formData = {
            name: $('#roleName').val().trim(),
            jobNature: $('#jobNature').val(),
            status: $('#roleStatus').val(),
            createdDate: this.isEditing ? this.roles.find(r => r.id === this.editingId)?.createdDate : new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!formData.name) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.isEditing) {
            // Update existing role
            const index = this.roles.findIndex(r => r.id === this.editingId);
            if (index !== -1) {
                this.roles[index] = { ...this.roles[index], ...formData };
            }
        } else {
            // Add new role
            const newRole = {
                ...formData,
                id: Date.now()
            };
            this.roles.push(newRole);
        }

        // Save to localStorage
        localStorage.setItem('userRoles', JSON.stringify(this.roles));
        
        // Update table
        this.renderRolesTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Role updated successfully!' : 'Role added successfully!');
    }

    showModal() {
        $('#roleModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#roleModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize user roles management page when DOM is ready
$(document).ready(() => {
    new UserRolesManagementPage();
}); 