// Settings Page JavaScript
class SettingsPage {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('settings');
        this.loadSettingsPage();
        this.bindEvents();
    }

    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(currentUser);
        $('#currentRole').text(this.currentUser.role.replace('_', ' ').toUpperCase());
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

    loadSettingsPage() {
        const role = this.currentUser.role;
        const canViewSystem = role === 'system_admin';
        const canViewContract = role === 'system_admin' || role === 'manager' || role === 'manager_licensee';
        // Hide side headers and menu groups when no access
        $('#systemSettingsHeader').toggle(canViewSystem);
        $('#systemSettingsMenu').toggle(canViewSystem);
        $('#contractSettingsHeader').toggle(canViewContract);
        $('#contractSettingsMenu').toggle(canViewContract);
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Side menu navigation
        $(document).on('click', '.settings-item', (e) => {
            e.preventDefault();
            const target = $(e.currentTarget).data('target');
            let title = 'Settings';
            let desc = '';
            let href = '#';
            switch(target){
                case 'personal':
                    title = 'Personal Settings';
                    desc = 'Update language and font size preferences for your account.';
                    href = 'personal-settings.html';
                    break;
                case 'roles':
                    title = 'User Roles';
                    desc = 'Manage user roles and job nature.';
                    href = 'user-roles-management.html';
                    break;
                case 'access':
                    title = 'Access Control';
                    desc = 'Configure page/menu visibility by role.';
                    href = 'access-control-management.html';
                    break;
                case 'contracts':
                    title = 'Contracts';
                    desc = 'Manage contracts.';
                    href = 'contracts-management.html';
                    break;
                case 'services':
                    title = 'Services';
                    desc = 'Manage service types.';
                    href = 'services-management.html';
                    break;
                case 'departments':
                    title = 'Departments';
                    desc = 'Manage departments.';
                    href = 'departments-management.html';
                    break;
                case 'companies':
                    title = 'Companies';
                    desc = 'Manage companies.';
                    href = 'companies-management.html';
                    break;
                case 'jobtitles':
                    title = 'Job Titles';
                    desc = 'Manage job titles.';
                    href = 'job-titles-management.html';
                    break;
            }
            $('#settingsDetailTitle').text(title);
            $('#settingsDetailDesc').text(desc);
            $('#settingsOpenBtn').attr('href', href);
        });

        // Close modal events
        $('.close-modal').on('click', () => this.hideAllModals());
        
        // Submit button events
        $('#submitStaffBtn').on('click', () => this.submitStaff());
        $('#submitRoleBtn').on('click', () => this.submitRole());
        $('#submitAccessBtn').on('click', () => this.submitAccess());
        $('#submitContractBtn').on('click', () => this.submitContract());
        $('#submitServiceBtn').on('click', () => this.submitService());
        $('#submitTemplateBtn').on('click', () => this.submitTemplate());
        $('#submitCategoryBtn').on('click', () => this.submitCategory());
        $('#submitLocationBtn').on('click', () => this.submitLocation());

        // Close modal when clicking outside
        $(document).on('click', (e) => {
            if ($(e.target).closest('.modal').length === 0 && $('.modal').is(':visible')) {
                this.hideAllModals();
            }
        });
    }

    showModal(modalId) {
        this.hideAllModals();
        $(`#${modalId}`).removeClass('hidden').show();
    }

    hideAllModals() {
        $('.modal, [id$="Modal"]').addClass('hidden').hide();
    }

    submitStaff() {
        const staffData = {
            name: $('#staffName').val(),
            contract: $('#staffContract').val(),
            role: $('#staffRole').val(),
            status: $('#staffStatus').val()
        };

        if (!staffData.name || !staffData.contract) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const staff = JSON.parse(localStorage.getItem('staff')) || [];
        staff.push({ ...staffData, id: Date.now() });
        localStorage.setItem('staff', JSON.stringify(staff));

        alert('Staff added successfully!');
        this.hideAllModals();
        this.resetForm('staff');
    }

    submitRole() {
        const roleData = {
            name: $('#roleName').val(),
            jobNature: $('#jobNature').val(),
            status: $('#roleStatus').val()
        };

        if (!roleData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const roles = JSON.parse(localStorage.getItem('userRoles')) || [];
        roles.push({ ...roleData, id: Date.now() });
        localStorage.setItem('userRoles', JSON.stringify(roles));

        alert('Role added successfully!');
        this.hideAllModals();
        this.resetForm('role');
    }

    submitAccess() {
        const accessData = {
            role: $('#accessRole').val(),
            dashboard: $('#accessDashboard').is(':checked'),
            task: $('#accessTask').is(':checked'),
            staff: $('#accessStaff').is(':checked'),
            locate: $('#accessLocate').is(':checked'),
            settings: $('#accessSettings').is(':checked')
        };

        // Save to localStorage
        const accessControl = JSON.parse(localStorage.getItem('accessControl')) || {};
        accessControl[accessData.role] = accessData;
        localStorage.setItem('accessControl', JSON.stringify(accessControl));

        alert('Access control updated successfully!');
        this.hideAllModals();
    }

    submitContract() {
        const contractData = {
            number: $('#contractNumber').val(),
            startTime: $('#contractStart').val(),
            endTime: $('#contractEnd').val(),
            serviceType: $('#contractServiceType').val(),
            isLicensee: $('#contractLicensee').is(':checked'),
            status: 'active'
        };

        if (!contractData.number || !contractData.startTime || !contractData.endTime) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const contracts = JSON.parse(localStorage.getItem('contracts')) || [];
        contracts.push({ ...contractData, id: Date.now() });
        localStorage.setItem('contracts', JSON.stringify(contracts));

        alert('Contract added successfully!');
        this.hideAllModals();
        this.resetForm('contract');
    }

    submitService() {
        const serviceData = {
            name: $('#serviceName').val(),
            status: $('#serviceStatus').val()
        };

        if (!serviceData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const services = JSON.parse(localStorage.getItem('services')) || [];
        services.push({ ...serviceData, id: Date.now() });
        localStorage.setItem('services', JSON.stringify(services));

        alert('Service added successfully!');
        this.hideAllModals();
        this.resetForm('service');
    }

    submitTemplate() {
        const templateData = {
            name: $('#templateName').val(),
            taskType: $('#templateTaskType').val(),
            category: $('#templateCategory').val(),
            subcategory: $('#templateSubcategory').val()
        };

        if (!templateData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const templates = JSON.parse(localStorage.getItem('taskTemplates')) || [];
        templates.push({ ...templateData, id: Date.now() });
        localStorage.setItem('taskTemplates', JSON.stringify(templates));

        alert('Template added successfully!');
        this.hideAllModals();
        this.resetForm('template');
    }

    submitCategory() {
        const categoryData = {
            name: $('#categoryName').val(),
            contract: $('#categoryContract').val(),
            parentId: $('#categoryParent').val() || null,
            status: 'active'
        };

        if (!categoryData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const categories = JSON.parse(localStorage.getItem('taskCategories')) || [];
        categories.push({ ...categoryData, id: Date.now() });
        localStorage.setItem('taskCategories', JSON.stringify(categories));

        alert('Category added successfully!');
        this.hideAllModals();
        this.resetForm('category');
    }

    submitLocation() {
        const locationData = {
            name: $('#locationName').val(),
            x: parseInt($('#locationX').val()) || 0,
            y: parseInt($('#locationY').val()) || 0,
            building: $('#locationBuilding').val(),
            level: parseInt($('#locationLevel').val()) || 1,
            status: 'active'
        };

        if (!locationData.name) {
            alert('Please fill in all required fields');
            return;
        }

        // Save to localStorage
        const locations = JSON.parse(localStorage.getItem('locations')) || [];
        locations.push({ ...locationData, id: Date.now() });
        localStorage.setItem('locations', JSON.stringify(locations));

        alert('Location added successfully!');
        this.hideAllModals();
        this.resetForm('location');
    }

    resetForm(type) {
        switch(type) {
            case 'staff':
                $('#staffName, #staffContract').val('');
                $('#staffRole').val('staff');
                $('#staffStatus').val('active');
                break;
            case 'role':
                $('#roleName').val('');
                $('#jobNature').val('admin');
                $('#roleStatus').val('active');
                break;
            case 'contract':
                $('#contractNumber, #contractStart, #contractEnd').val('');
                $('#contractServiceType').val('maintenance');
                $('#contractLicensee').prop('checked', false);
                break;
            case 'service':
                $('#serviceName').val('');
                $('#serviceStatus').val('active');
                break;
            case 'template':
                $('#templateName').val('');
                $('#templateTaskType').val('maintenance');
                $('#templateCategory').val('cleaning');
                $('#templateSubcategory').val('general_cleaning');
                break;
            case 'category':
                $('#categoryName').val('');
                $('#categoryContract').val('CON001');
                $('#categoryParent').val('');
                break;
            case 'location':
                $('#locationName, #locationBuilding').val('');
                $('#locationX, #locationY, #locationLevel').val('');
                break;
        }
    }
}

// Initialize settings page when DOM is ready
$(document).ready(() => {
    new SettingsPage();
}); 