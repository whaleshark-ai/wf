// Checkpoints Management Page JavaScript
class CheckpointsManagementPage {
    constructor() {
        this.currentUser = null;
        this.checkpoints = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.bindEvents();
        this.renderTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = JSON.parse(currentUser);
    }

    loadData() {
        this.checkpoints = JSON.parse(localStorage.getItem('checkpoints')) || [];
        if (this.checkpoints.length === 0) {
            this.checkpoints = [
                { id: 1, name: 'North Wing Routine', locationIds: [1,2], status: 'active' },
                { id: 2, name: 'South Wing Patrol', locationIds: [3], status: 'active' }
            ];
            localStorage.setItem('checkpoints', JSON.stringify(this.checkpoints));
        }
        this.locations = JSON.parse(localStorage.getItem('locations')) || [
            { id: 1, name: 'Building A - Floor 1' },
            { id: 2, name: 'Building A - Floor 2' },
            { id: 3, name: 'Building B - Floor 1' }
        ];
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add checkpoint
        $(document).on('click', '#addCheckpointBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddModal();
        });

        // Close modal on overlay
        $('#checkpointModal').on('click', (e) => {
            if (e.target && e.target.id === 'checkpointModal') {
                this.hideModal();
            }
        });

        // Form submit
        $('#checkpointForm').on('submit', (e) => {
            e.preventDefault();
            this.submitCheckpoint();
        });

        // Delegated edit/delete
        $(document).off('click', '.edit-checkpoint').on('click', '.edit-checkpoint', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.editCheckpoint(id);
        });
        $(document).off('click', '.delete-checkpoint').on('click', '.delete-checkpoint', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.deleteCheckpoint(id);
        });
    }

    renderTable() {
        const tbody = $('#checkpointsTableBody');
        tbody.empty();
        if (this.checkpoints.length === 0) {
            tbody.append(`<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No checkpoints found. Click "Add Checkpoint" to get started.</td></tr>`);
            return;
        }
        this.checkpoints.forEach(cp => {
            const locNames = cp.locationIds.map(id => this.locations.find(l => l.id === id)?.name).filter(Boolean).join(', ');
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${cp.name}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${locNames}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${cp.status.toUpperCase()}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-checkpoint text-indigo-600 hover:text-indigo-900 mr-3" data-id="${cp.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-checkpoint text-red-600 hover:text-red-900" data-id="${cp.id}"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                </tr>`;
            tbody.append(row);
        });
    }

    populatePoiList(selectedIds = []) {
        const container = $('#poiList');
        const options = this.locations.map(loc => {
            const checked = selectedIds.includes(loc.id) ? 'checked' : '';
            return `<label class="flex items-center"><input type="checkbox" class="mr-2 poi-checkbox" value="${loc.id}" ${checked}> ${loc.name}</label>`;
        }).join('');
        container.html(options);
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Checkpoint');
        $('#checkpointForm')[0].reset();
        this.populatePoiList([]);
        this.showModal();
    }

    editCheckpoint(id) {
        const cp = this.checkpoints.find(c => c.id === id);
        if (!cp) return;
        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Checkpoint');
        $('#checkpointId').val(cp.id);
        $('#checkpointName').val(cp.name);
        this.populatePoiList(cp.locationIds);
        this.showModal();
    }

    deleteCheckpoint(id) {
        if (confirm('Are you sure you want to delete this checkpoint?')) {
            this.checkpoints = this.checkpoints.filter(c => c.id !== id);
            localStorage.setItem('checkpoints', JSON.stringify(this.checkpoints));
            this.renderTable();
        }
    }

    submitCheckpoint() {
        const name = $('#checkpointName').val().trim();
        const locIds = $('.poi-checkbox:checked').map(function() { return parseInt($(this).val(), 10); }).get();
        if (!name) {
            alert('Please enter a checkpoint name');
            return;
        }
        if (locIds.length > 10) {
            alert('Please select at most 10 POI locations');
            return;
        }
        const formData = {
            id: this.isEditing ? this.editingId : Date.now(),
            name,
            locationIds: locIds,
            status: 'active'
        };
        if (this.isEditing) {
            const idx = this.checkpoints.findIndex(c => c.id === this.editingId);
            if (idx !== -1) this.checkpoints[idx] = { ...this.checkpoints[idx], ...formData };
        } else {
            this.checkpoints.push(formData);
        }
        localStorage.setItem('checkpoints', JSON.stringify(this.checkpoints));
        this.renderTable();
        this.hideModal();
        alert(this.isEditing ? 'Checkpoint updated successfully!' : 'Checkpoint added successfully!');
    }

    showModal() {
        $('#checkpointModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#checkpointModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

$(document).ready(() => {
    new CheckpointsManagementPage();
});


