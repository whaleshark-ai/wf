// Services Management Page JavaScript
class ServicesManagementPage {
    constructor() {
        this.currentUser = null;
        this.services = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadServicesData();
        this.bindEvents();
        this.renderServicesTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to services management
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'manager_licensee') {
            alert('Access denied. Only System Admin and Manager roles can manage services.');
            window.location.href = 'settings.html';
        }
    }

    loadServicesData() {
        this.services = JSON.parse(localStorage.getItem('services')) || [];
        
        // Add sample data if empty
        if (this.services.length === 0) {
            this.services = [
                { id: 1, name: 'Maintenance', status: 'active', createdDate: '2024-01-01' },
                { id: 2, name: 'Cleaning', status: 'active', createdDate: '2024-01-01' },
                { id: 3, name: 'Security', status: 'active', createdDate: '2024-01-01' },
                { id: 4, name: 'Inspection', status: 'inactive', createdDate: '2024-01-01' }
            ];
            localStorage.setItem('services', JSON.stringify(this.services));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add service button (only admin or manager_licensee can add)
        if (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') {
            $(document).on('click', '#addServiceBtn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAddModal();
            });
        } else {
            $('#addServiceBtn').hide();
        }
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#serviceForm').on('submit', (e) => {
            e.preventDefault();
            this.submitService();
        });

        // Close modal when clicking overlay background only
        $('#serviceModal').on('click', (e) => {
            if (e.target && e.target.id === 'serviceModal') {
                this.hideModal();
            }
        });
    }

    renderServicesTable() {
        const tbody = $('#servicesTableBody');
        tbody.empty();

        if (this.services.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No services found. Click "Add Service" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.services.forEach(service => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${service.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${service.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(service.createdDate)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-service text-indigo-600 hover:text-indigo-900 mr-3" data-id="${service.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-service text-red-600 hover:text-red-900" data-id="${service.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind edit and delete events (delegated with gating)
        if (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') {
            $(document).off('click', '.edit-service').on('click', '.edit-service', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = parseInt($(e.target).closest('button').data('id'));
                this.editService(id);
            });
            $(document).off('click', '.delete-service').on('click', '.delete-service', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = parseInt($(e.target).closest('button').data('id'));
                this.deleteService(id);
            });
        } else {
            // Hide action buttons for non-licensee roles
            $('.edit-service, .delete-service').remove();
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Service');
        $('#serviceForm')[0].reset();
        $('#serviceId').val('');
        this.showModal();
    }

    editService(id) {
        const service = this.services.find(s => s.id === id);
        if (!service) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Service');
        
        // Populate form
        $('#serviceId').val(service.id);
        $('#serviceName').val(service.name);
        $('#serviceStatus').val(service.status);
        
        this.showModal();
    }

    deleteService(id) {
        if (confirm('Are you sure you want to delete this service?')) {
            this.services = this.services.filter(s => s.id !== id);
            localStorage.setItem('services', JSON.stringify(this.services));
            this.renderServicesTable();
        }
    }

    submitService() {
        const formData = {
            name: $('#serviceName').val().trim(),
            status: $('#serviceStatus').val(),
            createdDate: this.isEditing ? this.services.find(s => s.id === this.editingId)?.createdDate : new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!formData.name) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.isEditing) {
            // Update existing service
            const index = this.services.findIndex(s => s.id === this.editingId);
            if (index !== -1) {
                this.services[index] = { ...this.services[index], ...formData };
            }
        } else {
            // Add new service
            const newService = {
                ...formData,
                id: Date.now()
            };
            this.services.push(newService);
        }

        // Save to localStorage
        localStorage.setItem('services', JSON.stringify(this.services));
        
        // Update table
        this.renderServicesTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Service updated successfully!' : 'Service added successfully!');
    }

    showModal() {
        $('#serviceModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#serviceModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize services management page when DOM is ready
$(document).ready(() => {
    new ServicesManagementPage();
}); 