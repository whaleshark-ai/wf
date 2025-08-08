// Workforce Portal Application
class WorkforcePortal {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.tasks = [];
        this.staff = [];
        this.locations = [];
        this.taskCategories = [];
        this.taskSubcategories = [];
        this.taskTemplates = [];
        this.contracts = [];
        this.services = [];
        this.userRoles = [];
        this.accessControl = {};
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.showLoginPage();
    }

    loadData() {
        // Load sample data from localStorage or initialize with defaults
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || this.getSampleTasks();
        this.staff = JSON.parse(localStorage.getItem('staff')) || this.getSampleStaff();
        this.locations = JSON.parse(localStorage.getItem('locations')) || this.getSampleLocations();
        this.taskCategories = JSON.parse(localStorage.getItem('taskCategories')) || this.getSampleTaskCategories();
        this.taskSubcategories = JSON.parse(localStorage.getItem('taskSubcategories')) || this.getSampleTaskSubcategories();
        this.taskTemplates = JSON.parse(localStorage.getItem('taskTemplates')) || this.getSampleTaskTemplates();
        this.contracts = JSON.parse(localStorage.getItem('contracts')) || this.getSampleContracts();
        this.services = JSON.parse(localStorage.getItem('services')) || this.getSampleServices();
        this.userRoles = JSON.parse(localStorage.getItem('userRoles')) || this.getSampleUserRoles();
        this.accessControl = JSON.parse(localStorage.getItem('accessControl')) || this.getSampleAccessControl();
    }

    saveData() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('staff', JSON.stringify(this.staff));
        localStorage.setItem('locations', JSON.stringify(this.locations));
        localStorage.setItem('taskCategories', JSON.stringify(this.taskCategories));
        localStorage.setItem('taskSubcategories', JSON.stringify(this.taskSubcategories));
        localStorage.setItem('taskTemplates', JSON.stringify(this.taskTemplates));
        localStorage.setItem('contracts', JSON.stringify(this.contracts));
        localStorage.setItem('services', JSON.stringify(this.services));
        localStorage.setItem('userRoles', JSON.stringify(this.userRoles));
        localStorage.setItem('accessControl', JSON.stringify(this.accessControl));
    }

    bindEvents() {
        // Login events
        $('#loginBtn').on('click', () => this.handleLogin());
        $('#logoutBtn').on('click', () => this.handleLogout());

        // Navigation events
        $('#navDashboard').on('click', () => this.navigateTo('dashboard'));
        $('#navTask').on('click', () => this.navigateTo('task'));
        $('#navStaff').on('click', () => this.navigateTo('staff'));
        $('#navLocate').on('click', () => this.navigateTo('locate'));
        $('#navSettings').on('click', () => this.navigateTo('settings'));

        // Task management events - using event delegation for dynamic elements
        $(document).on('click', '#addTaskBtn', () => {
            console.log('Add Task button clicked');
            this.showAddTaskModal();
        });
        $(document).on('click', '#addTaskMenuBtn', () => this.toggleAddTaskMenu());
        $(document).on('click', '#addNewTask', () => this.showAddTaskModal());
        $(document).on('click', '#addFromTemplate', () => this.showTemplateSelection());
        
        // Modal events
        $(document).on('click', '#closeTaskModal', () => this.hideAddTaskModal());
        $(document).on('click', '#cancelTaskBtn', () => this.hideAddTaskModal());
        $(document).on('click', '#submitTaskBtn', () => this.submitTask());
        $(document).on('click', '#saveTemplateBtn', () => this.saveTaskTemplate());

        // Form events
        $(document).on('change', '#taskCategory', () => this.onTaskCategoryChange());
        $(document).on('change', '#taskSubcategory', () => this.onTaskSubcategoryChange());
        $(document).on('change', '#startTime, #duration', () => this.calculateEndTime());
        $(document).on('input', '#staffFilter', () => this.filterStaff());

        // Tab events
        $(document).on('click', '.tab-btn', (e) => this.switchTab(e));
        $(document).on('click', '.period-btn', (e) => this.switchPeriod(e));

        // Close modal when clicking outside
        $(document).on('click', (e) => {
            if ($(e.target).closest('#addTaskModal').length === 0 && $('#addTaskModal').is(':visible')) {
                this.hideAddTaskModal();
            }
        });
    }

    showLoginPage() {
        $('#loginPage').show();
        $('#mainApp').hide();
    }

    handleLogin() {
        const role = $('#roleSelect').val();
        if (!role) {
            alert('Please select a role');
            return;
        }

        this.currentUser = { role: role };
        $('#currentRole').text(role.replace('_', ' ').toUpperCase());
        
        $('#loginPage').hide();
        $('#mainApp').show();
        
        this.navigateTo('dashboard');
        this.updateNavigationVisibility();
    }

    handleLogout() {
        this.currentUser = null;
        this.showLoginPage();
    }

    updateNavigationVisibility() {
        // Hide/show navigation items based on access control
        const role = this.currentUser.role;
        const access = this.accessControl[role] || {};
        
        $('#navDashboard').toggle(access.dashboard !== false);
        $('#navTask').toggle(access.task !== false);
        $('#navStaff').toggle(access.staff !== false);
        $('#navLocate').toggle(access.locate !== false);
        $('#navSettings').toggle(access.settings !== false);
    }

    navigateTo(page) {
        this.currentPage = page;
        
        // Hide all pages
        $('.page-content').hide();
        
        // Show selected page
        $(`#${page}Page`).show();
        
        // Update navigation active state
        $('.nav-item').removeClass('bg-gray-100 text-gray-900').addClass('text-gray-700');
        $(`#nav${page.charAt(0).toUpperCase() + page.slice(1)}`).addClass('bg-gray-100 text-gray-900');
        
        // Load page-specific content
        this.loadPageContent(page);
    }

    loadPageContent(page) {
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'task':
                this.loadTaskPage();
                break;
            case 'settings':
                this.loadSettingsPage();
                break;
        }
    }

    loadDashboard() {
        const role = this.currentUser.role;
        
        // Hide all dashboards
        $('#adminDashboard, #managerDashboard, #staffDashboard').hide();
        
        // Show appropriate dashboard
        switch(role) {
            case 'system_admin':
                $('#adminDashboard').show();
                this.loadAdminDashboard();
                break;
            case 'manager':
                $('#managerDashboard').show();
                break;
            case 'staff':
                $('#staffDashboard').show();
                break;
        }
    }

    loadAdminDashboard() {
        this.loadDailyUsageChart();
        this.loadTasksChart();
        this.loadSummaryStats();
    }

    loadDailyUsageChart() {
        const ctx = document.getElementById('dailyUsageChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Usage',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    loadTasksChart() {
        const ctx = document.getElementById('tasksChart').getContext('2d');
        this.tasksChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Completed', 'Pending', 'Overdue'],
                datasets: [{
                    label: 'Tasks',
                    data: [12, 8, 3],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(255, 205, 86, 0.2)',
                        'rgba(255, 99, 132, 0.2)'
                    ],
                    borderColor: [
                        'rgb(75, 192, 192)',
                        'rgb(255, 205, 86)',
                        'rgb(255, 99, 132)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    loadSummaryStats() {
        const stats = [
            { label: 'Total Tasks', value: this.tasks.length, change: '+5%' },
            { label: 'Active Staff', value: this.staff.filter(s => s.status === 'active').length, change: '+2%' },
            { label: 'Completed Today', value: this.tasks.filter(t => t.status === 'completed' && this.isToday(t.completedAt)).length, change: '+12%' }
        ];

        const statsHtml = stats.map(stat => `
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">${stat.label}</span>
                <div class="text-right">
                    <div class="font-semibold">${stat.value}</div>
                    <div class="text-xs text-green-600">${stat.change}</div>
                </div>
            </div>
        `).join('');

        $('#summaryStats').html(statsHtml);
    }

    loadTaskPage() {
        this.updateTaskStats();
        this.loadTaskCollection();
    }

    updateTaskStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const overdue = this.tasks.filter(t => t.status === 'overdue').length;

        $('#totalTasks').text(total);
        $('#completedTasks').text(completed);
        $('#pendingTasks').text(pending);
        $('#overdueTasks').text(overdue);
    }

    loadTaskCollection() {
        const taskCards = this.tasks.map(task => `
            <div class="bg-white border rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-800">${task.name}</h4>
                    <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(task.status)}">${task.status}</span>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    <div>Category: ${task.category}</div>
                    <div>Location: ${task.location}</div>
                    <div>Time: ${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}</div>
                </div>
                ${task.isOverdue ? '<div class="text-xs text-red-600 font-semibold">OVERDUE</div>' : ''}
            </div>
        `).join('');

        $('#taskCollection').html(taskCards);
    }

    getStatusColor(status) {
        const colors = {
            'completed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'overdue': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    loadSettingsPage() {
        const role = this.currentUser.role;
        
        // Hide all settings sections
        $('#adminSettings, #managerSettings, #staffSettings').hide();
        
        // Show appropriate settings
        switch(role) {
            case 'system_admin':
                $('#adminSettings').show();
                break;
            case 'manager':
                $('#managerSettings').show();
                break;
            case 'staff':
                $('#staffSettings').show();
                break;
        }
    }

    showAddTaskModal() {
        console.log('showAddTaskModal called');
        console.log('Modal element exists:', $('#addTaskModal').length);
        console.log('Modal current display:', $('#addTaskModal').css('display'));
        console.log('Modal has hidden class:', $('#addTaskModal').hasClass('hidden'));
        
        this.populateTaskForm();
        
        // Force show the modal
        $('#addTaskModal').removeClass('hidden').css('display', 'block');
        
        console.log('Modal display after show:', $('#addTaskModal').css('display'));
        console.log('Modal hidden class after show:', $('#addTaskModal').hasClass('hidden'));
    }

    hideAddTaskModal() {
        $('#addTaskModal').addClass('hidden').hide();
        this.resetTaskForm();
    }

    populateTaskForm() {
        // Populate task categories
        const categoryOptions = this.taskCategories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        $('#taskCategory').html('<option value="">Select category...</option>' + categoryOptions);

        // Populate locations
        const locationOptions = this.locations.map(loc => 
            `<option value="${loc.id}">${loc.name}</option>`
        ).join('');
        $('#location').html('<option value="">Select location...</option>' + locationOptions);

        // Populate staff list
        const staffOptions = this.staff.map(s => `
            <div class="flex items-center">
                <input type="checkbox" id="staff_${s.id}" value="${s.id}" class="mr-2">
                <label for="staff_${s.id}" class="text-sm">${s.name}</label>
            </div>
        `).join('');
        $('#staffList').html(staffOptions);
    }

    resetTaskForm() {
        $('#taskCategory, #taskSubcategory, #taskName, #startTime, #duration, #endTime, #location').val('');
        $('#staffList input[type="checkbox"]').prop('checked', false);
    }

    onTaskCategoryChange() {
        const categoryId = $('#taskCategory').val();
        const subcategories = this.taskSubcategories.filter(sub => sub.categoryId == categoryId);
        
        const options = subcategories.map(sub => 
            `<option value="${sub.id}">${sub.name}</option>`
        ).join('');
        
        $('#taskSubcategory').html('<option value="">Select subcategory...</option>' + options);
        $('#taskName').val('');
    }

    onTaskSubcategoryChange() {
        const subcategoryId = $('#taskSubcategory').val();
        const subcategory = this.taskSubcategories.find(sub => sub.id == subcategoryId);
        
        if (subcategory) {
            $('#taskName').val(subcategory.name);
        }
    }

    calculateEndTime() {
        const startTime = $('#startTime').val();
        const duration = parseInt($('#duration').val()) || 0;
        
        if (startTime && duration) {
            const start = new Date(startTime);
            const end = new Date(start.getTime() + duration * 60000);
            $('#endTime').val(end.toISOString().slice(0, 16));
        }
    }

    filterStaff() {
        const filter = $('#staffFilter').val().toLowerCase();
        $('#staffList div').each(function() {
            const name = $(this).find('label').text().toLowerCase();
            $(this).toggle(name.includes(filter));
        });
    }

    switchTab(e) {
        $('.tab-btn').removeClass('active bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
        $(e.target).addClass('active bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
    }

    switchPeriod(e) {
        $('.period-btn').removeClass('active bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
        $(e.target).addClass('active bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
        
        // Update chart based on period
        const period = $(e.target).data('period');
        this.updateTasksChart(period);
    }

    updateTasksChart(period) {
        // Update chart data based on period
        const data = this.getTasksDataByPeriod(period);
        this.tasksChart.data.datasets[0].data = data;
        this.tasksChart.update();
    }

    getTasksDataByPeriod(period) {
        // Sample data - in real app, this would filter actual task data
        const data = {
            day: [5, 3, 1],
            week: [25, 15, 5],
            month: [100, 60, 20]
        };
        return data[period] || [0, 0, 0];
    }

    toggleAddTaskMenu() {
        $('#addTaskMenu').toggle();
    }

    showTemplateSelection() {
        // Implementation for template selection
        alert('Template selection will be implemented here');
    }

    submitTask() {
        const taskData = {
            id: Date.now(),
            name: $('#taskName').val(),
            category: $('#taskCategory option:selected').text(),
            subcategory: $('#taskSubcategory option:selected').text(),
            startTime: $('#startTime').val(),
            endTime: $('#endTime').val(),
            duration: $('#duration').val(),
            location: $('#location option:selected').text(),
            status: 'pending',
            assignedStaff: $('#staffList input:checked').map(function() {
                return $(this).val();
            }).get(),
            createdAt: new Date().toISOString()
        };

        if (!taskData.name || !taskData.startTime || !taskData.endTime) {
            alert('Please fill in all required fields');
            return;
        }

        this.tasks.push(taskData);
        this.saveData();
        this.hideAddTaskModal();
        this.loadTaskPage();
    }

    saveTaskTemplate() {
        const templateData = {
            id: Date.now(),
            name: $('#taskName').val(),
            category: $('#taskCategory').val(),
            subcategory: $('#taskSubcategory').val(),
            duration: $('#duration').val(),
            location: $('#location').val()
        };

        this.taskTemplates.push(templateData);
        this.saveData();
        alert('Template saved successfully!');
    }

    isToday(dateString) {
        const today = new Date().toDateString();
        const date = new Date(dateString).toDateString();
        return today === date;
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Sample data generators
    getSampleTasks() {
        return [
            {
                id: 1,
                name: 'Cleaning Service',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2024-01-15T09:00:00',
                endTime: '2024-01-15T10:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'completed',
                assignedStaff: [1, 2],
                createdAt: '2024-01-15T08:00:00',
                completedAt: '2024-01-15T10:00:00'
            },
            {
                id: 2,
                name: 'Security Check',
                category: 'Security',
                subcategory: 'Patrol',
                startTime: '2024-01-15T14:00:00',
                endTime: '2024-01-15T15:00:00',
                duration: 60,
                location: 'Building B - Floor 2',
                status: 'pending',
                assignedStaff: [3],
                createdAt: '2024-01-15T13:00:00'
            }
        ];
    }

    getSampleStaff() {
        return [
            { id: 1, name: 'John Smith', contract: 'CON001', status: 'active', role: 'staff' },
            { id: 2, name: 'Jane Doe', contract: 'CON002', status: 'active', role: 'staff' },
            { id: 3, name: 'Mike Johnson', contract: 'CON003', status: 'active', role: 'staff' },
            { id: 4, name: 'Sarah Wilson', contract: 'CON004', status: 'active', role: 'manager' }
        ];
    }

    getSampleLocations() {
        return [
            { id: 1, name: 'Building A - Floor 1', x: 100, y: 200, building: 'A', level: 1, status: 'active' },
            { id: 2, name: 'Building A - Floor 2', x: 100, y: 300, building: 'A', level: 2, status: 'active' },
            { id: 3, name: 'Building B - Floor 1', x: 200, y: 200, building: 'B', level: 1, status: 'active' }
        ];
    }

    getSampleTaskCategories() {
        return [
            { id: 1, name: 'Maintenance', contract: 'CON001', parentId: null, status: 'active' },
            { id: 2, name: 'Security', contract: 'CON001', parentId: null, status: 'active' },
            { id: 3, name: 'Cleaning', contract: 'CON002', parentId: null, status: 'active' }
        ];
    }

    getSampleTaskSubcategories() {
        return [
            { id: 1, categoryId: 1, name: 'Equipment Repair' },
            { id: 2, categoryId: 1, name: 'Cleaning' },
            { id: 3, categoryId: 2, name: 'Patrol' },
            { id: 4, categoryId: 2, name: 'Access Control' },
            { id: 5, categoryId: 3, name: 'General Cleaning' },
            { id: 6, categoryId: 3, name: 'Deep Cleaning' }
        ];
    }

    getSampleTaskTemplates() {
        return [
            { id: 1, name: 'Daily Cleaning', category: 3, subcategory: 5, duration: 60, location: 1 },
            { id: 2, name: 'Security Patrol', category: 2, subcategory: 3, duration: 30, location: 2 }
        ];
    }

    getSampleContracts() {
        return [
            { id: 1, number: 'CON001', startTime: '2024-01-01', endTime: '2024-12-31', status: 'active', serviceType: 'Maintenance', isLicensee: true },
            { id: 2, number: 'CON002', startTime: '2024-01-01', endTime: '2024-12-31', status: 'active', serviceType: 'Cleaning', isLicensee: false }
        ];
    }

    getSampleServices() {
        return [
            { id: 1, name: 'Maintenance', status: 'active' },
            { id: 2, name: 'Cleaning', status: 'active' },
            { id: 3, name: 'Security', status: 'active' }
        ];
    }

    getSampleUserRoles() {
        return [
            { id: 1, name: 'System Admin', jobNature: 'admin', status: 'active' },
            { id: 2, name: 'Manager', jobNature: 'manager', status: 'active' },
            { id: 3, name: 'Staff', jobNature: 'frontline', status: 'active' }
        ];
    }

    getSampleAccessControl() {
        return {
            system_admin: {
                dashboard: true,
                task: true,
                staff: true,
                locate: true,
                settings: true
            },
            manager: {
                dashboard: true,
                task: true,
                staff: true,
                locate: true,
                settings: true
            },
            staff: {
                dashboard: true,
                task: true,
                staff: false,
                locate: false,
                settings: true
            }
        };
    }
}

// Initialize the application when DOM is ready
$(document).ready(() => {
    window.app = new WorkforcePortal();
    
    // Add global test function
    window.testModal = function() {
        console.log('Testing modal...');
        $('#addTaskModal').removeClass('hidden').css('display', 'block');
        console.log('Modal should be visible');
    };
}); 