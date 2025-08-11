// Locations Management Page JavaScript
class LocationsManagementPage {
    constructor() {
        this.currentUser = null;
        this.locations = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('settings');
        this.loadLocationsData();
        this.bindEvents();
        this.renderLocationsTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to locations management
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'staff') {
            alert('Access denied. Only System Admin, Manager, and Staff can manage locations.');
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

    loadLocationsData() {
        this.locations = (JSON.parse(localStorage.getItem('locations')) || []).filter(l => (l.status || 'active') === 'active');
        
        // Add sample data if empty
        if (this.locations.length === 0) {
            this.locations = [
                { 
                    id: 1, 
                    name: 'Building A - Floor 1', 
                    contract: 'CON001',
                    building: 'Building A', 
                    level: 1, 
                    x: 100.5, 
                    y: 200.3, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 2, 
                    name: 'Building A - Floor 2', 
                    contract: 'CON001',
                    building: 'Building A', 
                    level: 2, 
                    x: 150.2, 
                    y: 250.7, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 3, 
                    name: 'Building B - Floor 1', 
                    contract: 'CON002',
                    building: 'Building B', 
                    level: 1, 
                    x: 300.1, 
                    y: 400.8, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 4, 
                    name: 'Main Entrance', 
                    contract: 'CON003',
                    building: 'Building A', 
                    level: 1, 
                    x: 50.0, 
                    y: 100.0, 
                    status: 'inactive',
                    createdDate: '2024-01-01' 
                }
            ];
            localStorage.setItem('locations', JSON.stringify(this.locations));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add location button
        $('#addLocationBtn').on('click', () => this.showAddModal());
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#locationForm').on('submit', (e) => {
            e.preventDefault();
            this.submitLocation();
        });

        // Close modal when clicking outside
        $(document).on('click', (e) => {
            if ($(e.target).closest('#locationModal').length === 0 && $('#locationModal').is(':visible')) {
                this.hideModal();
            }
        });
    }

    renderLocationsTable() {
        const tbody = $('#locationsTableBody');
        tbody.empty();

        if (this.locations.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                        No locations found. Click "Add Location" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.locations.forEach(location => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${location.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${location.contract}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${location.building}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${location.level}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">(${location.x}, ${location.y})</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            location.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${location.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(location.createdDate)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-location text-indigo-600 hover:text-indigo-900 mr-3" data-id="${location.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-location text-red-600 hover:text-red-900" data-id="${location.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
        // Licensee gating for actions
        const isAdmin = this.currentUser.role === 'system_admin';
        const isLicenseeUser = !!this.currentUser.isLicensee;
        if (!isAdmin && !isLicenseeUser) {
            $('#addLocationBtn').hide();
            $('.edit-location, .delete-location').remove();
        }

        // Bind edit and delete events using event delegation
        $(document).off('click', '.edit-location').on('click', '.edit-location', (e) => {
            const id = parseInt($(e.target).closest('button').data('id'));
            this.editLocation(id);
        });

        $(document).off('click', '.delete-location').on('click', '.delete-location', (e) => {
            const id = parseInt($(e.target).closest('button').data('id'));
            this.deleteLocation(id);
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Location');
        $('#locationForm')[0].reset();
        $('#locationId').val('');
        $('#locationLevel').val('1');
        this.showModal();
    }

    editLocation(id) {
        console.log('Edit location called with id:', id);
        const location = this.locations.find(l => l.id === id);
        if (!location) {
            console.log('Location not found for id:', id);
            return;
        }

        console.log('Found location:', location);
        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Location');
        
        // Populate form
        $('#locationId').val(location.id);
        $('#locationName').val(location.name);
        $('#locationContract').val(location.contract);
        $('#locationBuilding').val(location.building);
        $('#locationLevel').val(location.level);
        $('#locationX').val(location.x);
        $('#locationY').val(location.y);
        
        console.log('Form populated, showing modal');
        this.showModal();
    }

    deleteLocation(id) {
        if (confirm('Are you sure you want to delete this location?')) {
            this.locations = this.locations.filter(l => l.id !== id);
            localStorage.setItem('locations', JSON.stringify(this.locations));
            this.renderLocationsTable();
        }
    }

    submitLocation() {
        const formData = {
            name: $('#locationName').val().trim(),
            contract: $('#locationContract').val(),
            building: $('#locationBuilding').val().trim(),
            level: parseInt($('#locationLevel').val()) || 1,
            x: parseFloat($('#locationX').val()) || 0,
            y: parseFloat($('#locationY').val()) || 0,
            status: 'active',
            createdDate: this.isEditing ? this.locations.find(l => l.id === this.editingId)?.createdDate : new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!formData.name || !formData.contract) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.isEditing) {
            // Update existing location
            const index = this.locations.findIndex(l => l.id === this.editingId);
            if (index !== -1) {
                this.locations[index] = { ...this.locations[index], ...formData };
            }
        } else {
            // Add new location
            const newLocation = {
                ...formData,
                id: Date.now()
            };
            this.locations.push(newLocation);
        }

        // Save to localStorage
        localStorage.setItem('locations', JSON.stringify(this.locations));
        
        // Update table
        this.renderLocationsTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Location updated successfully!' : 'Location added successfully!');
    }

    showModal() {
        console.log('Showing modal');
        $('#locationModal').removeClass('hidden').show();
        console.log('Modal should be visible now');
    }

    hideModal() {
        $('#locationModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize locations management page when DOM is ready
$(document).ready(() => {
    new LocationsManagementPage();
}); 