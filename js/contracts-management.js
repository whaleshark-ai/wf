// Contracts Management Page JavaScript
class ContractsManagementPage {
    constructor() {
        this.currentUser = null;
        this.contracts = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('settings');
        this.loadContractsData();
        this.bindEvents();
        this.renderContractsTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Access to page: admin, manager, and manager_licensee can view; only admin/manager_licensee can add/edit
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'manager_licensee') {
            alert('Access denied. Only System Admin and Manager roles can view contracts.');
            window.location.href = 'settings.html';
        }
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

    loadContractsData() {
        this.contracts = JSON.parse(localStorage.getItem('contracts')) || [];
        
        // Add sample data if empty
        if (this.contracts.length === 0) {
            this.contracts = [
                { 
                    id: 1, 
                    number: 'CON001', 
                    startTime: '2024-01-01', 
                    endTime: '2024-12-31', 
                    serviceType: 'maintenance', 
                    isLicensee: true, 
                    status: 'active' 
                },
                { 
                    id: 2, 
                    number: 'CON002', 
                    startTime: '2024-02-01', 
                    endTime: '2024-11-30', 
                    serviceType: 'cleaning', 
                    isLicensee: false, 
                    status: 'active' 
                },
                { 
                    id: 3, 
                    number: 'CON003', 
                    startTime: '2024-03-01', 
                    endTime: '2024-10-31', 
                    serviceType: 'security', 
                    isLicensee: true, 
                    status: 'inactive' 
                }
            ];
            localStorage.setItem('contracts', JSON.stringify(this.contracts));
        }
    }

    bindEvents() {
        // Add contract button (only admin or manager_licensee can add)
        if (this.currentUser.role === 'system_admin' || this.currentUser.role === 'manager_licensee') {
            $('#addContractBtn').on('click', () => this.showAddModal());
        } else {
            $('#addContractBtn').hide();
        }
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#contractForm').on('submit', (e) => {
            e.preventDefault();
            this.submitContract();
        });

        // Close modal when clicking outside
        $(document).on('click', (e) => {
            if ($(e.target).closest('#contractModal').length === 0 && $('#contractModal').is(':visible')) {
                this.hideModal();
            }
        });
    }

    renderContractsTable() {
        const tbody = $('#contractsTableBody');
        tbody.empty();

        if (this.contracts.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        No contracts found. Click "Add Contract" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.contracts.forEach(contract => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${contract.number}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(contract.startTime)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(contract.endTime)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contract.serviceType === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                            contract.serviceType === 'cleaning' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                        }">
                            ${contract.serviceType.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contract.isLicensee ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }">
                            ${contract.isLicensee ? 'YES' : 'NO'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${contract.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-contract text-indigo-600 hover:text-indigo-900 mr-3" data-id="${contract.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-contract text-red-600 hover:text-red-900" data-id="${contract.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Licensee gating: if user is not licensee and not admin, hide add/edit/delete
        const isAdmin = this.currentUser.role === 'system_admin';
        const isLicenseeUser = !!this.currentUser.isLicensee;
        if (!isAdmin && !isLicenseeUser) {
            $('#addContractBtn').hide();
            $('.edit-contract, .delete-contract').hide();
        }

        // Bind edit and delete events
        if (true) {
            $('.edit-contract').on('click', (e) => {
                const id = parseInt($(e.target).closest('button').data('id'));
                this.editContract(id);
            });
            $('.delete-contract').on('click', (e) => {
                const id = parseInt($(e.target).closest('button').data('id'));
                this.deleteContract(id);
            });
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
        $('#modalTitle').text('Add Contract');
        $('#contractForm')[0].reset();
        $('#contractId').val('');
        this.showModal();
    }

    editContract(id) {
        const contract = this.contracts.find(c => c.id === id);
        if (!contract) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Contract');
        
        // Populate form
        $('#contractId').val(contract.id);
        $('#contractNumber').val(contract.number);
        $('#contractStart').val(contract.startTime);
        $('#contractEnd').val(contract.endTime);
        $('#contractServiceType').val(contract.serviceType);
        $('#contractLicensee').prop('checked', contract.isLicensee);
        
        this.showModal();
    }

    deleteContract(id) {
        if (confirm('Are you sure you want to delete this contract?')) {
            this.contracts = this.contracts.filter(c => c.id !== id);
            localStorage.setItem('contracts', JSON.stringify(this.contracts));
            this.renderContractsTable();
        }
    }

    submitContract() {
        const formData = {
            number: $('#contractNumber').val().trim(),
            startTime: $('#contractStart').val(),
            endTime: $('#contractEnd').val(),
            serviceType: $('#contractServiceType').val(),
            isLicensee: $('#contractLicensee').is(':checked'),
            status: 'active'
        };

        // Validation
        if (!formData.number || !formData.startTime || !formData.endTime) {
            alert('Please fill in all required fields');
            return;
        }

        if (new Date(formData.startTime) >= new Date(formData.endTime)) {
            alert('End date must be after start date');
            return;
        }

        if (this.isEditing) {
            // Update existing contract
            const index = this.contracts.findIndex(c => c.id === this.editingId);
            if (index !== -1) {
                this.contracts[index] = { ...this.contracts[index], ...formData };
            }
        } else {
            // Add new contract
            const newContract = {
                ...formData,
                id: Date.now()
            };
            this.contracts.push(newContract);
        }

        // Save to localStorage
        localStorage.setItem('contracts', JSON.stringify(this.contracts));
        
        // Update table
        this.renderContractsTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Contract updated successfully!' : 'Contract added successfully!');
    }

    showModal() {
        $('#contractModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#contractModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize contracts management page when DOM is ready
$(document).ready(() => {
    new ContractsManagementPage();
}); 