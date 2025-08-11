// Task Settings Page Logic
class TaskSettingsPage {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'templates';
        this.items = [];
        this.filteredItems = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.switchSection('templates');
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = JSON.parse(currentUser);
        // logout clears storage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    bindEvents() {
        $(document).on('click', '.task-settings-item', (e) => {
            e.preventDefault();
            const section = $(e.currentTarget).data('section');
            $('.task-settings-item').removeClass('active bg-gray-100');
            $(e.currentTarget).addClass('active bg-gray-100');
            this.switchSection(section);
        });

        $('#searchInput').on('input', () => this.applySearch());
        $('#prevPage').on('click', () => this.changePage(-1));
        $('#nextPage').on('click', () => this.changePage(1));
        $('#addItemBtn').on('click', () => this.openAddModal());

        // Modal events
        $('#closeModal, #cancelModalBtn').on('click', () => this.hideModal());
        $('#taskSettingModal').on('click', (e) => {
            if (e.target && e.target.id === 'taskSettingModal') this.hideModal();
        });

        // Delegated edit/delete
        $(document).on('click', '.edit-item', (e) => {
            const id = $(e.currentTarget).data('id');
            this.openEditModal(id);
        });
        $(document).on('click', '.delete-item', (e) => {
            const id = $(e.currentTarget).data('id');
            this.deleteItem(id);
        });

        // Submit form
        $(document).on('submit', '#taskSettingForm', (e) => {
            e.preventDefault();
            this.submitForm();
        });
    }

    switchSection(section) {
        this.currentSection = section;
        this.currentPage = 1;
        this.loadData();
        this.renderHeader();
        this.applySearch();
    }

    loadData() {
        // seed sample if empty per section
        const keyMap = {
            'templates': 'taskTemplates',
            'categories': 'taskCategories',
            'custom-poi': 'locations',
            'checkpoints': 'checkpoints',
            'location-zone': 'locationZones',
            'documents': 'documents'
        };
        const storageKey = keyMap[this.currentSection];
        this.items = JSON.parse(localStorage.getItem(storageKey)) || [];

        if (this.items.length === 0) {
            switch (this.currentSection) {
                case 'templates':
                    this.items = [
                        { id: 1, name: 'Daily Patrol', taskType: 'adhoc', category: 'Security', subcategory: 'Patrol', status: 'active' },
                        { id: 2, name: 'AC Maintenance', taskType: 'maintenance', category: 'Maintenance', subcategory: 'HVAC', status: 'active' }
                    ];
                    break;
                case 'categories':
                    this.items = [
                        { id: 1, name: 'Maintenance', status: 'active' },
                        { id: 2, name: 'Security', status: 'active' }
                    ];
                    break;
                case 'custom-poi':
                    this.items = [
                        { id: 1, name: 'Lobby POI', building: 'A', level: 1, status: 'active' },
                        { id: 2, name: 'Loading Bay POI', building: 'B', level: 1, status: 'active' }
                    ];
                    break;
                case 'checkpoints':
                    this.items = [
                        { id: 1, name: 'Morning Route', poiCount: 5, status: 'active' },
                        { id: 2, name: 'Night Route', poiCount: 4, status: 'active' }
                    ];
                    break;
                case 'location-zone':
                    this.items = [
                        { id: 1, name: 'Zone 1', description: 'Building A Level 1', status: 'active' },
                        { id: 2, name: 'Zone 2', description: 'Building B Loading Area', status: 'inactive' }
                    ];
                    break;
                case 'documents':
                    this.items = [
                        { id: 1, category: 'Maintenance', filename: 'Maintenance_Manual.pdf', url: '#', status: 'active' },
                        { id: 2, category: 'Security', filename: 'Security_Protocol.docx', url: '#', status: 'active' }
                    ];
                    break;
            }
            localStorage.setItem(storageKey, JSON.stringify(this.items));
        }
    }

    renderHeader() {
        const titles = {
            'templates': { title: 'Task Templates', desc: 'Manage task templates.' },
            'categories': { title: 'Task Categories', desc: 'Manage task categories.' },
            'custom-poi': { title: 'Custom POI', desc: 'Manage points of interest.' },
            'checkpoints': { title: 'Checkpoints', desc: 'Manage checkpoint routes.' },
            'location-zone': { title: 'Location Zone', desc: 'Manage zones grouping locations.' },
            'documents': { title: 'Documents', desc: 'Manage task-related documents.' }
        };
        $('#sectionTitle').text(titles[this.currentSection].title);
        $('#sectionDescription').text(titles[this.currentSection].desc);

        // Render table header fields based on section (refer to existing management pages)
        let headerHtml = '';
        switch (this.currentSection) {
            case 'templates':
                headerHtml = this.thead(['Name', 'Task Type', 'Category', 'Subcategory', 'Status', 'Actions']);
                break;
            case 'categories':
                headerHtml = this.thead(['Name', 'Status', 'Actions']);
                break;
            case 'custom-poi':
                headerHtml = this.thead(['Name', 'Building', 'Level', 'Status', 'Actions']);
                break;
            case 'checkpoints':
                headerHtml = this.thead(['Name', 'POIs', 'Status', 'Actions']);
                break;
            case 'location-zone':
                headerHtml = this.thead(['Name', 'Description', 'Status', 'Actions']);
                break;
            case 'documents':
                headerHtml = this.thead(['Task Category', 'Filename', 'URL', 'Status', 'Actions']);
                break;
        }
        $('#tableHeader').html(headerHtml);
    }

    thead(cols) {
        const ths = cols.map(c => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${c}</th>`).join('');
        return `<tr>${ths}</tr>`;
    }

    applySearch() {
        const q = ($('#searchInput').val() || '').toLowerCase();
        this.filteredItems = this.items.filter(item => (item.name || item.filename || '').toLowerCase().includes(q));
        this.renderTable();
        this.updatePagination();
    }

    renderTable() {
        const start = (this.currentPage - 1) * this.pageSize;
        const pageItems = this.filteredItems.slice(start, start + this.pageSize);
        const tbody = $('#tableBody');
        tbody.empty();

        pageItems.forEach(item => {
            let row = '';
            switch (this.currentSection) {
                case 'templates':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.name}</td>
                        <td class="px-6 py-4">${item.taskType}</td>
                        <td class="px-6 py-4">${item.category}</td>
                        <td class="px-6 py-4">${item.subcategory || ''}</td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
                case 'categories':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.name}</td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
                case 'custom-poi':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.name}</td>
                        <td class="px-6 py-4">${item.building || ''}</td>
                        <td class="px-6 py-4">${item.level ?? ''}</td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
                case 'checkpoints':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.name}</td>
                        <td class="px-6 py-4">${item.poiCount ?? (item.pois ? item.pois.length : 0)}</td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
                case 'location-zone':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.name}</td>
                        <td class="px-6 py-4">${item.description || ''}</td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
                case 'documents':
                    row = `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">${item.category}</td>
                        <td class="px-6 py-4">${item.filename}</td>
                        <td class="px-6 py-4"><a href="${item.url}" class="text-blue-600 hover:underline" target="_blank">View</a></td>
                        <td class="px-6 py-4">${(item.status || 'active').toUpperCase()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button class="edit-item text-blue-600 hover:text-blue-800" data-id="${item.id}">Edit</button>
                            <span class="mx-2 text-gray-300">|</span>
                            <button class="delete-item text-red-600 hover:text-red-800" data-id="${item.id}">Delete</button>
                        </td>
                    </tr>`;
                    break;
            }
            tbody.append(row);
        });
    }

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
        this.currentPage = Math.min(this.currentPage, totalPages);
        $('#pageInfo').text(`Page ${this.currentPage} of ${totalPages}`);
        $('#prevPage').prop('disabled', this.currentPage <= 1);
        $('#nextPage').prop('disabled', this.currentPage >= totalPages);
    }

    changePage(delta) {
        const totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
        const next = Math.min(Math.max(1, this.currentPage + delta), totalPages);
        if (next !== this.currentPage) {
            this.currentPage = next;
            this.renderTable();
            this.updatePagination();
        }
    }

    openAddModal() {
        $('#modalTitle').text('Add Item');
        this.renderFormFields();
        $('#taskSettingModal').removeClass('hidden').show();
    }

    openEditModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        $('#modalTitle').text('Edit Item');
        this.renderFormFields(item);
        $('#taskSettingModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#taskSettingModal').addClass('hidden').hide();
        $('#taskSettingForm').empty();
    }

    renderFormFields(item = null) {
        let html = '';
        const idInput = item ? `<input type="hidden" name="id" value="${item.id}">` : '';
        switch (this.currentSection) {
            case 'templates':
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input name="name" class="w-full px-3 py-2 border rounded" value="${item?.name || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Task Type *</label>
                        <select name="taskType" class="w-full px-3 py-2 border rounded" required>
                            <option value="adhoc" ${item?.taskType==='adhoc'?'selected':''}>Adhoc</option>
                            <option value="maintenance" ${item?.taskType==='maintenance'?'selected':''}>Maintenance</option>
                            <option value="security" ${item?.taskType==='security'?'selected':''}>Security</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <input name="category" class="w-full px-3 py-2 border rounded" value="${item?.category || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                        <input name="subcategory" class="w-full px-3 py-2 border rounded" value="${item?.subcategory || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
            case 'categories':
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input name="name" class="w-full px-3 py-2 border rounded" value="${item?.name || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
            case 'custom-poi':
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input name="name" class="w-full px-3 py-2 border rounded" value="${item?.name || ''}" required>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Building</label>
                            <input name="building" class="w-full px-3 py-2 border rounded" value="${item?.building || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
                            <input name="level" type="number" class="w-full px-3 py-2 border rounded" value="${item?.level ?? ''}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
            case 'checkpoints':
                // select up to 10 POIs
                const locations = JSON.parse(localStorage.getItem('locations')) || [];
                const selected = item?.pois || [];
                const options = locations.map(loc => `<option value="${loc.id}" ${selected.includes(loc.id)?'selected':''}>${loc.name}</option>`).join('');
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input name="name" class="w-full px-3 py-2 border rounded" value="${item?.name || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">POIs (max 10)</label>
                        <select name="pois" multiple size="8" class="w-full px-3 py-2 border rounded">${options}</select>
                        <p class="text-xs text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple.</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
            case 'location-zone':
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input name="name" class="w-full px-3 py-2 border rounded" value="${item?.name || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" class="w-full px-3 py-2 border rounded">${item?.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
            case 'documents':
                // reference documents.html structure
                const categories = JSON.parse(localStorage.getItem('taskCategories')) || [{ name: 'Maintenance' }, { name: 'Security' }];
                const catOpts = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                html = `
                    ${idInput}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Task Category *</label>
                        <select name="category" class="w-full px-3 py-2 border rounded" required>
                            <option value="">Select category...</option>
                            ${catOpts}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Filename *</label>
                        <input name="filename" class="w-full px-3 py-2 border rounded" value="${item?.filename || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                        <input name="url" class="w-full px-3 py-2 border rounded" value="${item?.url || ''}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border rounded">
                            <option value="active" ${!item || item.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${item?.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>`;
                break;
        }

        $('#taskSettingForm').html(html);
    }

    submitForm() {
        const form = $('#taskSettingForm');
        const formData = Object.fromEntries(new FormData(form[0]).entries());
        if (formData.pois) {
            // Collect multiple selects into array
            formData.pois = Array.from(form.find('select[name="pois"] option:checked')).map(o => parseInt(o.value));
            if (formData.pois.length > 10) {
                alert('Maximum 10 POIs allowed.');
                return;
            }
        }

        const keyMap = {
            'templates': 'taskTemplates',
            'categories': 'taskCategories',
            'custom-poi': 'locations',
            'checkpoints': 'checkpoints',
            'location-zone': 'locationZones',
            'documents': 'documents'
        };
        const storageKey = keyMap[this.currentSection];

        // Normalize
        if (this.currentSection === 'custom-poi' && formData.level) formData.level = parseInt(formData.level);
        if (this.currentSection === 'checkpoints') formData.poiCount = (formData.pois || []).length;

        if (formData.id) {
            const id = parseInt(formData.id);
            delete formData.id;
            this.items = this.items.map(i => i.id === id ? { ...i, ...formData } : i);
        } else {
            this.items.push({ id: Date.now(), ...formData });
        }

        localStorage.setItem(storageKey, JSON.stringify(this.items));
        this.hideModal();
        this.applySearch();
        alert('Saved successfully');
    }

    deleteItem(id) {
        if (!confirm('Delete this record?')) return;
        const keyMap = {
            'templates': 'taskTemplates',
            'categories': 'taskCategories',
            'custom-poi': 'locations',
            'checkpoints': 'checkpoints',
            'location-zone': 'locationZones',
            'documents': 'documents'
        };
        const storageKey = keyMap[this.currentSection];
        this.items = this.items.filter(i => i.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(this.items));
        this.applySearch();
    }
}

$(document).ready(() => new TaskSettingsPage());


