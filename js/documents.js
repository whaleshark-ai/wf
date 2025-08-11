class DocumentsPage {
    constructor() {
        this.currentUser = null;
        this.documents = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('documents');
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
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
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

    loadData() {
        // Staff and contract detection
        const staff = JSON.parse(localStorage.getItem('staff')) || [];
        const userContract = this.currentUser?.contract || staff[0]?.contract || 'CON001';
        this.contractNumber = userContract;
        // Task categories
        this.taskCategories = JSON.parse(localStorage.getItem('taskCategories')) || [
            { id: 1, name: 'Maintenance' },
            { id: 2, name: 'Security' },
            { id: 3, name: 'Cleaning' }
        ];
        // Documents
        this.documents = JSON.parse(localStorage.getItem('documents')) || [];
        if (this.documents.length === 0) {
            this.documents = [
                { id: 1, contract: this.contractNumber, categoryId: 1, categoryName: 'Maintenance', filename: 'cleaning-specs.pdf', url: '#', status: 'active' },
                { id: 2, contract: this.contractNumber, categoryId: 2, categoryName: 'Security', filename: 'patrol-route.jpg', url: '#', status: 'inactive' }
            ];
            localStorage.setItem('documents', JSON.stringify(this.documents));
        }
    }

    bindEvents() {
        // Open add modal
        $(document).on('click', '#addDocumentBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openAddModal();
        });
        // Close modal
        $('#documentModal').on('click', (e) => {
            if (e.target && e.target.id === 'documentModal') this.hideModal();
        });
        $(document).on('click', '.close-document-modal', () => this.hideModal());
        // Submit
        $('#documentForm').on('submit', (e) => {
            e.preventDefault();
            this.submitDocument();
        });
    }

    renderTable() {
        const tbody = $('#documentsTableBody');
        tbody.empty();
        if (!this.documents.length) {
            tbody.append(`<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No documents uploaded yet.</td></tr>`);
            return;
        }
        this.documents.forEach(d => {
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${d.categoryName || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${d.filename}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-700"><a class="underline" href="${d.url}" target="_blank">${d.url}</a></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${d.status.toUpperCase()}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="delete-document text-red-600 hover:text-red-900" data-id="${d.id}"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                </tr>`;
            tbody.append(row);
        });

        // bind delete
        $(document).off('click', '.delete-document').on('click', '.delete-document', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.currentTarget).data('id'));
            this.deleteDocument(id);
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.editingId = null;
        $('#documentModalTitle').text('Add Document');
        $('#documentForm')[0].reset();
        $('#docContract').val(this.contractNumber);
        // populate categories
        const opts = this.taskCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        $('#docCategory').html('<option value="">Select category...</option>' + opts);
        $('#docStatus').val('active');
        this.showModal();
    }

    submitDocument() {
        const categoryId = $('#docCategory').val();
        const categoryName = $('#docCategory option:selected').text();
        const fileInput = document.getElementById('docFile');
        const status = $('#docStatus').val();
        if (!categoryId) {
            alert('Please select a task category');
            return;
        }
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file to upload');
            return;
        }
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10 MB');
            return;
        }
        // Simulate upload by creating object URL
        const url = URL.createObjectURL(file);
        const doc = {
            id: Date.now(),
            contract: this.contractNumber,
            categoryId: parseInt(categoryId, 10),
            categoryName,
            filename: file.name,
            url,
            status
        };
        this.documents.push(doc);
        localStorage.setItem('documents', JSON.stringify(this.documents));
        this.renderTable();
        this.hideModal();
        alert('Document saved');
    }

    deleteDocument(id) {
        if (!confirm('Delete this document?')) return;
        this.documents = this.documents.filter(d => d.id !== id);
        localStorage.setItem('documents', JSON.stringify(this.documents));
        this.renderTable();
    }

    showModal() {
        $('#documentModal').removeClass('hidden').show();
    }
    hideModal() {
        $('#documentModal').addClass('hidden').hide();
    }
}

$(document).ready(() => {
    new DocumentsPage();
});


