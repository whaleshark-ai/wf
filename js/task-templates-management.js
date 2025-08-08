// Task Templates Management Page JavaScript
class TaskTemplatesManagementPage {
    constructor() {
        this.currentUser = null;
        this.templates = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadTemplatesData();
        this.bindEvents();
        this.renderTemplatesTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to task templates management
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'staff') {
            alert('Access denied. Only System Admin, Manager, and Staff can manage task templates.');
            window.location.href = 'settings.html';
        }
    }

    loadTemplatesData() {
        this.templates = JSON.parse(localStorage.getItem('taskTemplatesInline')) || [];
        
        // Add sample data if empty
        if (this.templates.length === 0) {
            this.templates = [
                { 
                    id: 1, 
                    name: 'Daily Cleaning Template', 
                    taskType: 'cleaning', 
                    category: 'cleaning', 
                    subcategory: 'general_cleaning',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 2, 
                    name: 'Equipment Maintenance Template', 
                    taskType: 'maintenance', 
                    category: 'equipment_repair', 
                    subcategory: 'equipment_check',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 3, 
                    name: 'Security Patrol Template', 
                    taskType: 'security', 
                    category: 'patrol', 
                    subcategory: 'safety_inspection',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 4, 
                    name: 'Access Control Check Template', 
                    taskType: 'security', 
                    category: 'access_control', 
                    subcategory: 'safety_inspection',
                    createdDate: '2024-01-01' 
                }
            ];
            localStorage.setItem('taskTemplatesInline', JSON.stringify(this.templates));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add template button (delegated, prevent bubbling)
        $(document).on('click', '#addTemplateBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddModal();
        });
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#templateForm').on('submit', (e) => {
            e.preventDefault();
            this.submitTemplate();
        });

        // Close modal when clicking overlay background only
        $('#templateModal').on('click', (e) => {
            if (e.target && e.target.id === 'templateModal') {
                this.hideModal();
            }
        });
    }

    renderTemplatesTable() {
        const tbody = $('#templatesTableBody');
        tbody.empty();

        if (this.templates.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        No templates found. Click "Add Template" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.templates.forEach(template => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${template.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            template.taskType === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                            template.taskType === 'security' ? 'bg-purple-100 text-purple-800' :
                            template.taskType === 'cleaning' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                        }">
                            ${template.taskType.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatCategory(template.category)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatSubcategory(template.subcategory)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(template.createdDate)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-template text-indigo-600 hover:text-indigo-900 mr-3" data-id="${template.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-template text-red-600 hover:text-red-900" data-id="${template.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind edit and delete events (delegated and de-duplicated)
        $(document).off('click', '.edit-template').on('click', '.edit-template', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.editTemplate(id);
        });

        $(document).off('click', '.delete-template').on('click', '.delete-template', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.deleteTemplate(id);
        });
    }

    formatCategory(category) {
        return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatSubcategory(subcategory) {
        return subcategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    showAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#modalTitle').text('Add Template');
        $('#templateForm')[0].reset();
        $('#templateId').val('');
        this.populateTemplateForm();
        this.showModal();
    }

    editTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Template');
        
        // Populate form (new structure)
        $('#templateId').val(template.id);
        this.populateTemplateForm();
        $('#templateTaskCategory').val(template.categoryId);
        // populate subcategories then select
        setTimeout(() => {
            $('#templateTaskSubcategory').val(template.subcategoryId);
            $('#templateTaskName').val(template.name);
        }, 0);
        $('#templateDuration').val(template.duration);
        if (template.mode === 'poi') {
            $('.tmpl-location-tab-btn[data-tab="poi"]').trigger('click');
            $('#templateLocation').val(template.locationValue);
        } else {
            $('.tmpl-location-tab-btn[data-tab="checkpoint"]').trigger('click');
            const cps = this.getSampleCheckpoints();
            const match = cps.find(cp => template.locationDisplay && template.locationDisplay.startsWith(cp.name));
            if (match) $('#templateCheckpointSelect').val(match.id).trigger('change');
        }
        
        this.showModal();
    }

    deleteTemplate(id) {
        if (confirm('Are you sure you want to delete this template?')) {
            this.templates = this.templates.filter(t => t.id !== id);
            localStorage.setItem('taskTemplates', JSON.stringify(this.templates));
            this.renderTemplatesTable();
        }
    }

    submitTemplate() {
        const formData = {
            id: $('#templateId').val() ? parseInt($('#templateId').val(), 10) : Date.now(),
            name: $('#templateTaskName').val().trim(),
            categoryId: $('#templateTaskCategory').val(),
            subcategoryId: $('#templateTaskSubcategory').val(),
            categoryLabel: $('#templateTaskCategory option:selected').text(),
            subcategoryLabel: $('#templateTaskSubcategory option:selected').text(),
            duration: $('#templateDuration').val(),
            locationDisplay: this.getSelectedTemplateLocation(true),
            locationValue: this.getSelectedTemplateLocation(false),
            mode: $('.tmpl-location-tab-btn[data-tab="poi"]').hasClass('bg-blue-600') ? 'poi' : 'checkpoint',
            createdDate: this.isEditing ? this.templates.find(t => t.id === this.editingId)?.createdDate : new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!formData.name || !formData.categoryId || !formData.subcategoryId) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.isEditing) {
            // Update existing template
            const index = this.templates.findIndex(t => t.id === formData.id);
            if (index !== -1) {
                this.templates[index] = { ...this.templates[index], ...formData };
            }
        } else {
            // Add new template
            this.templates.push(formData);
        }

        // Save to localStorage
        localStorage.setItem('taskTemplatesInline', JSON.stringify(this.templates));
        
        // Update table
        this.renderTemplatesTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Template updated successfully!' : 'Template added successfully!');
    }

    populateTemplateForm() {
        // categories
        const categories = (JSON.parse(localStorage.getItem('taskCategories')) || [
            { id: 1, name: 'Maintenance' },
            { id: 2, name: 'Security' },
            { id: 3, name: 'Cleaning' },
            { id: 4, name: 'Inspection' }
        ]);
        const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        $('#templateTaskCategory').html('<option value="">Select category...</option>' + catOptions);

        // subcategories depend on selected category; simple sample
        const allSubs = (JSON.parse(localStorage.getItem('taskSubcategories')) || [
            { id: 1, categoryId: 1, name: 'Equipment Repair' },
            { id: 2, categoryId: 1, name: 'Cleaning' },
            { id: 3, categoryId: 2, name: 'Patrol' },
            { id: 4, categoryId: 2, name: 'Access Control' },
            { id: 5, categoryId: 3, name: 'General Cleaning' },
            { id: 6, categoryId: 3, name: 'Deep Cleaning' }
        ]);
        $('#templateTaskCategory').off('change').on('change', () => {
            const catId = $('#templateTaskCategory').val();
            const subs = allSubs.filter(s => String(s.categoryId) === String(catId));
            const subOptions = subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            $('#templateTaskSubcategory').html('<option value="">Select subcategory...</option>' + subOptions);
            $('#templateTaskName').val('');
        });
        $('#templateTaskSubcategory').off('change').on('change', () => {
            const subId = $('#templateTaskSubcategory').val();
            const sub = allSubs.find(s => String(s.id) === String(subId));
            if (sub) $('#templateTaskName').val(sub.name);
        });

        // locations
        const locations = JSON.parse(localStorage.getItem('locations')) || [
            { id: 1, name: 'Building A - Floor 1' },
            { id: 2, name: 'Building A - Floor 2' },
            { id: 3, name: 'Building B - Floor 1' }
        ];
        const locOptions = locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
        $('#templateLocation').html('<option value="">Select location...</option>' + locOptions);

        // checkpoints
        const cps = this.getSampleCheckpoints();
        const cpOpts = cps.map(cp => `<option value="${cp.id}">${cp.name}</option>`).join('');
        $('#templateCheckpointSelect').html('<option value="">Select checkpoint...</option>' + cpOpts);

        // tabs
        $(document).off('click', '.tmpl-location-tab-btn').on('click', '.tmpl-location-tab-btn', (e) => {
            $('.tmpl-location-tab-btn').removeClass('bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
            const tab = $(e.target).data('tab');
            $(e.target).addClass('bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
            if (tab === 'poi') {
                $('#templatePoiSection').removeClass('hidden');
                $('#templateCheckpointSection').addClass('hidden');
            } else {
                $('#templatePoiSection').addClass('hidden');
                $('#templateCheckpointSection').removeClass('hidden');
            }
        });
        $(document).off('change', '#templateCheckpointSelect').on('change', '#templateCheckpointSelect', () => {
            const id = parseInt($('#templateCheckpointSelect').val(), 10);
            const cp = cps.find(c => c.id === id);
            const list = (cp?.locations || []).map(locId => {
                const loc = locations.find(l => l.id === locId);
                return loc ? `<li class="list-disc ml-5">${loc.name}</li>` : '';
            }).join('');
            $('#templateCheckpointLocationsList').html(list ? `<ul>${list}</ul>` : '<div class="text-gray-500">No locations found in this checkpoint.</div>');
        });
    }

    getSelectedTemplateLocation(returnLabel = false) {
        const poiActive = $('.tmpl-location-tab-btn[data-tab="poi"]').hasClass('bg-blue-600');
        if (poiActive) {
            const val = $('#templateLocation').val();
            if (returnLabel) return $('#templateLocation option:selected').text();
            return val;
        }
        const cpId = parseInt($('#templateCheckpointSelect').val(), 10);
        const cps = this.getSampleCheckpoints();
        const cp = cps.find(c => c.id === cpId);
        if (!cp) return returnLabel ? '' : '';
        const cpName = $('#templateCheckpointSelect option:selected').text();
        const locations = JSON.parse(localStorage.getItem('locations')) || [];
        const locNames = cp.locations.map(id => locations.find(l => l.id === id)?.name).filter(Boolean);
        const label = `${cpName}: ${locNames.join(', ')}`;
        return label;
    }

    getSampleCheckpoints() {
        return [
            { id: 1, name: 'North Wing Routine', locations: [1, 2] },
            { id: 2, name: 'South Wing Patrol', locations: [3] }
        ];
    }

    showModal() {
        $('#templateModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#templateModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize task templates management page when DOM is ready
$(document).ready(() => {
    new TaskTemplatesManagementPage();
}); 