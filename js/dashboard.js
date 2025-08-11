// Dashboard Page JavaScript
class DashboardPage {
    constructor() {
        this.currentUser = null;
        this.tasks = [];
        this.staff = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('dashboard');
        this.loadData();
        this.bindEvents();
        this.loadDashboard();
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

    // Access control: hide nav links and redirect if page not allowed
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
                Object.entries(map).forEach(([key, href]) => {
                    if (!pages[key]) {
                        $(`a[href="${href}"]`).hide();
                    }
                });
                if (!pages[currentPageKey]) {
                    const order = ['dashboard','task','staff','schedule','locate','documents','reports','messages','settings'];
                    for (const key of order) {
                        if (pages[key]) { window.location.href = map[key]; return; }
                    }
                }
            }
        } catch (e) { /* no-op */ }
    }

    loadData() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || this.getSampleTasks();
        this.staff = JSON.parse(localStorage.getItem('staff')) || this.getSampleStaff();
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        $('.period-btn').on('click', (e) => this.switchPeriod(e));
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

    isToday(dateString) {
        const today = new Date().toDateString();
        const date = new Date(dateString).toDateString();
        return today === date;
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
}

// Initialize dashboard page when DOM is ready
$(document).ready(() => {
    new DashboardPage();
}); 