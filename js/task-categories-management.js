// Task Categories Management Page JavaScript
class TaskCategoriesManagementPage {
    constructor() {
        this.currentUser = null;
        this.categories = [];
        this.isEditing = false;
        this.editingId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadCategoriesData();
        this.bindEvents();
        this.renderCategoriesTable();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
        
        // Check if user has access to task categories management
        if (this.currentUser.role !== 'system_admin' && this.currentUser.role !== 'manager' && this.currentUser.role !== 'staff') {
            alert('Access denied. Only System Admin, Manager, and Staff can manage task categories.');
            window.location.href = 'settings.html';
        }
    }

    loadCategoriesData() {
        this.categories = JSON.parse(localStorage.getItem('taskCategories')) || [];
        
        // Add sample data if empty
        if (this.categories.length === 0) {
            this.categories = [
                { 
                    id: 1, 
                    name: 'Maintenance', 
                    contract: 'CON001', 
                    parentId: null, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 2, 
                    name: 'Security', 
                    contract: 'CON001', 
                    parentId: null, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 3, 
                    name: 'Cleaning', 
                    contract: 'CON002', 
                    parentId: null, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 4, 
                    name: 'Equipment Repair', 
                    contract: 'CON001', 
                    parentId: 1, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                },
                { 
                    id: 5, 
                    name: 'Patrol', 
                    contract: 'CON001', 
                    parentId: 2, 
                    status: 'active',
                    createdDate: '2024-01-01' 
                }
            ];
            localStorage.setItem('taskCategories', JSON.stringify(this.categories));
        }
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Add category button (delegated to avoid timing issues)
        $(document).on('click', '#addCategoryBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddModal();
        });
        
        // Modal close events
        $('.close-modal').on('click', () => this.hideModal());
        
        // Form submission
        $('#categoryForm').on('submit', (e) => {
            e.preventDefault();
            this.submitCategory();
        });

        // Close modal when clicking overlay background only
        $('#categoryModal').on('click', (e) => {
            if (e.target && e.target.id === 'categoryModal') {
                this.hideModal();
            }
        });
    }

    renderCategoriesTable() {
        const tbody = $('#categoriesTableBody');
        tbody.empty();

        if (this.categories.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        No categories found. Click "Add Category" to get started.
                    </td>
                </tr>
            `);
            return;
        }

        this.categories.forEach(category => {
            const parentCategory = category.parentId ? this.categories.find(c => c.id === category.parentId) : null;
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${category.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${category.contract}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${parentCategory ? parentCategory.name : 'None'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${category.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.formatDate(category.createdDate)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-category text-indigo-600 hover:text-indigo-900 mr-3" data-id="${category.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-category text-red-600 hover:text-red-900" data-id="${category.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind edit and delete events (delegated and de-duplicated)
        $(document).off('click', '.edit-category').on('click', '.edit-category', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.editCategory(id);
        });

        $(document).off('click', '.delete-category').on('click', '.delete-category', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt($(e.target).closest('button').data('id'));
            this.deleteCategory(id);
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
        $('#modalTitle').text('Add Category');
        $('#categoryForm')[0].reset();
        $('#categoryId').val('');
        this.showModal();
    }

    editCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (!category) return;

        this.isEditing = true;
        this.editingId = id;
        $('#modalTitle').text('Edit Category');
        
        // Populate form
        $('#categoryId').val(category.id);
        $('#categoryName').val(category.name);
        $('#categoryContract').val(category.contract);
        $('#categoryParent').val(category.parentId || '');
        
        this.showModal();
    }

    deleteCategory(id) {
        // Check if category has children
        const hasChildren = this.categories.some(c => c.parentId === id);
        if (hasChildren) {
            alert('Cannot delete category that has child categories. Please delete child categories first.');
            return;
        }

        if (confirm('Are you sure you want to delete this category?')) {
            this.categories = this.categories.filter(c => c.id !== id);
            localStorage.setItem('taskCategories', JSON.stringify(this.categories));
            this.renderCategoriesTable();
        }
    }

    submitCategory() {
        const formData = {
            name: $('#categoryName').val().trim(),
            contract: $('#categoryContract').val(),
            parentId: $('#categoryParent').val() || null,
            status: 'active',
            createdDate: this.isEditing ? this.categories.find(c => c.id === this.editingId)?.createdDate : new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!formData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Check if category name already exists (for new entries)
        if (!this.isEditing && this.categories.find(c => c.name.toLowerCase() === formData.name.toLowerCase())) {
            alert('Category with this name already exists');
            return;
        }

        if (this.isEditing) {
            // Update existing category
            const index = this.categories.findIndex(c => c.id === this.editingId);
            if (index !== -1) {
                this.categories[index] = { ...this.categories[index], ...formData };
            }
        } else {
            // Add new category
            const newCategory = {
                ...formData,
                id: Date.now()
            };
            this.categories.push(newCategory);
        }

        // Save to localStorage
        localStorage.setItem('taskCategories', JSON.stringify(this.categories));
        
        // Update table
        this.renderCategoriesTable();
        
        // Close modal
        this.hideModal();
        
        // Show success message
        alert(this.isEditing ? 'Category updated successfully!' : 'Category added successfully!');
    }

    showModal() {
        $('#categoryModal').removeClass('hidden').show();
    }

    hideModal() {
        $('#categoryModal').addClass('hidden').hide();
        this.isEditing = false;
        this.editingId = null;
    }
}

// Initialize task categories management page when DOM is ready
$(document).ready(() => {
    new TaskCategoriesManagementPage();
}); 