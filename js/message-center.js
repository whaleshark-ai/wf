class MessageCenter {
    constructor() {
        this.messages = [];
        this.filteredMessages = [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || { role: 'staff' };
        this.pagination = {
            page: 1,
            pageSize: 10,
            totalPages: 1
        };
        this.init();
    }

    init() {
        this.loadMessages();
        this.bindEvents();
        this.applyAccessVisibility();
        this.renderMessages();
    }

    applyAccessVisibility() {
        // Get access control data
        const accessPagesV2 = JSON.parse(localStorage.getItem('accessPagesV2')) || {};
        const userRoles = JSON.parse(localStorage.getItem('userRolesV2')) || [];
        
        // If no access control data exists, show all navigation items
        if (Object.keys(accessPagesV2).length === 0) {
            return;
        }
        
        // Map role for access check
        let accessRole = this.currentUser.role;
        if (accessRole === 'manager_licensee') accessRole = 'manager';
        
        // Check access to each page and hide nav items accordingly
        const pages = ['dashboard', 'task', 'staff', 'schedule', 'locate', 'documents', 'reports', 'messages', 'settings'];
        pages.forEach(page => {
            const hasAccess = accessPagesV2[accessRole]?.[page];
            // Only hide if explicitly set to false, default to true if undefined
            if (hasAccess === false) {
                const navItem = $(`.nav-item[href="${page === 'messages' ? 'message-center' : page}.html"]`);
                navItem.hide();
            }
        });

        // Only redirect if explicitly denied access to current page
        const currentPageAccess = accessPagesV2[accessRole]?.['messages'];
        if (currentPageAccess === false) {
            // Find first accessible page
            const accessiblePage = pages.find(page => accessPagesV2[accessRole]?.[page] !== false);
            if (accessiblePage) {
                window.location.href = `${accessiblePage === 'messages' ? 'message-center' : accessiblePage}.html`;
            }
        }
    }

    bindEvents() {
        // Filter messages
        $('#messageFilter').on('change', () => this.applyFilters());
        
        // Mark all as read
        $('#markAllReadBtn').on('click', () => this.markAllAsRead());
        
        // Message row clicks
        $(document).on('click', '.message-row', (e) => this.handleMessageClick(e));
        
        // Task detail modal
        $('#closeTaskDetailModal, #closeTaskDetailBtn').on('click', () => this.hideTaskDetailModal());
        $('#taskDetailModal').on('click', (e) => {
            if (e.target.id === 'taskDetailModal') {
                this.hideTaskDetailModal();
            }
        });
        
        // Pagination
        $(document).on('click', '.pagination-btn', (e) => this.handlePagination(e));
        
        // Logout functionality
        $('a[href="login.html"]').on('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    loadMessages() {
        // Load existing messages or create sample data
        const existingMessages = localStorage.getItem('messages');
        if (existingMessages) {
            this.messages = JSON.parse(existingMessages);
        } else {
            this.messages = this.generateSampleMessages();
            localStorage.setItem('messages', JSON.stringify(this.messages));
        }
    }

    generateSampleMessages() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const staff = JSON.parse(localStorage.getItem('staff')) || [];
        const messages = [];

        // Generate task assignment messages
        tasks.filter(t => t.status === 'assigned').forEach((task, index) => {
            if (index < 5) { // Limit sample messages
                messages.push({
                    id: Date.now() + index,
                    type: 'task_assigned',
                    title: 'New Task Assigned',
                    content: `You have been assigned to task "${task.name}". Please review the task details and start when ready.`,
                    taskId: task.id,
                    taskName: task.name,
                    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                    isRead: Math.random() > 0.5,
                    sender: 'System',
                    recipient: this.currentUser.role
                });
            }
        });

        // Generate task rejection messages
        tasks.filter(t => t.status === 'rejected').forEach((task, index) => {
            if (index < 3) { // Limit sample messages
                const assignedStaff = staff.find(s => task.assignedStaff?.includes(s.id));
                messages.push({
                    id: Date.now() + 1000 + index,
                    type: 'task_rejected',
                    title: 'Task Rejected',
                    content: `Task "${task.name}" has been rejected by ${assignedStaff?.name || 'staff member'}. Please review and reassign if necessary.`,
                    taskId: task.id,
                    taskName: task.name,
                    timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
                    isRead: Math.random() > 0.3,
                    sender: assignedStaff?.name || 'Staff Member',
                    recipient: this.currentUser.role
                });
            }
        });

        // Add some general system messages
        messages.push({
            id: Date.now() + 2000,
            type: 'system',
            title: 'System Maintenance',
            content: 'Scheduled system maintenance will occur this weekend. Please save your work frequently.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            sender: 'System',
            recipient: 'all'
        });

        return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    applyFilters() {
        const filter = $('#messageFilter').val();
        
        this.filteredMessages = this.messages.filter(message => {
            if (!filter) return true;
            
            switch (filter) {
                case 'unread':
                    return !message.isRead;
                case 'read':
                    return message.isRead;
                case 'task_assigned':
                    return message.type === 'task_assigned';
                case 'task_rejected':
                    return message.type === 'task_rejected';
                default:
                    return true;
            }
        });

        this.pagination.page = 1;
        this.pagination.totalPages = Math.max(1, Math.ceil(this.filteredMessages.length / this.pagination.pageSize));
        this.renderMessages();
    }

    renderMessages() {
        if (!this.filteredMessages.length) {
            this.filteredMessages = this.messages;
        }

        const container = $('#messagesList');
        const emptyState = $('#emptyState');
        
        if (this.filteredMessages.length === 0) {
            container.hide();
            emptyState.removeClass('hidden');
            $('#messageCount').text('0 messages');
            return;
        }

        container.show();
        emptyState.addClass('hidden');

        // Calculate pagination
        const startIndex = (this.pagination.page - 1) * this.pagination.pageSize;
        const endIndex = startIndex + this.pagination.pageSize;
        const pageMessages = this.filteredMessages.slice(startIndex, endIndex);

        // Render message rows
        const messageRows = pageMessages.map(message => this.renderMessageRow(message)).join('');
        container.html(messageRows);

        // Update message count
        $('#messageCount').text(`${this.filteredMessages.length} message${this.filteredMessages.length !== 1 ? 's' : ''}`);

        // Render pagination
        this.renderPagination();
    }

    renderMessageRow(message) {
        const isUnread = !message.isRead;
        const timeAgo = this.getTimeAgo(message.timestamp);
        const typeIcon = this.getMessageTypeIcon(message.type);
        const typeColor = this.getMessageTypeColor(message.type);

        return `
            <div class="message-row cursor-pointer hover:bg-gray-50 p-4 ${isUnread ? 'bg-blue-50 border-l-4 border-blue-500' : ''}" 
                 data-message-id="${message.id}">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full ${typeColor} flex items-center justify-center">
                            <i class="${typeIcon} text-white"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <h4 class="text-sm font-medium text-gray-900 ${isUnread ? 'font-semibold' : ''}">${message.title}</h4>
                                ${isUnread ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">New</span>' : ''}
                            </div>
                            <span class="text-xs text-gray-500">${timeAgo}</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1 line-clamp-2">${message.content}</p>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs text-gray-500">From: ${message.sender}</span>
                            ${message.taskId ? `<button class="text-xs text-blue-600 hover:text-blue-800 view-task-btn" data-task-id="${message.taskId}">View Task →</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMessageTypeIcon(type) {
        const icons = {
            'task_assigned': 'fas fa-tasks',
            'task_rejected': 'fas fa-times-circle',
            'system': 'fas fa-info-circle',
            'default': 'fas fa-envelope'
        };
        return icons[type] || icons['default'];
    }

    getMessageTypeColor(type) {
        const colors = {
            'task_assigned': 'bg-blue-500',
            'task_rejected': 'bg-red-500',
            'system': 'bg-gray-500',
            'default': 'bg-gray-400'
        };
        return colors[type] || colors['default'];
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - messageTime) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return messageTime.toLocaleDateString();
    }

    handleMessageClick(e) {
        e.stopPropagation();
        const messageId = parseInt($(e.currentTarget).data('message-id'));
        const message = this.messages.find(m => m.id === messageId);
        
        if (!message) return;

        // Mark as read
        this.markMessageAsRead(messageId);

        // If message has a task, show task details
        if (message.taskId) {
            this.showTaskDetails(message.taskId);
        }
    }

    markMessageAsRead(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message && !message.isRead) {
            message.isRead = true;
            localStorage.setItem('messages', JSON.stringify(this.messages));
            this.renderMessages();
        }
    }

    markAllAsRead() {
        this.messages.forEach(message => {
            message.isRead = true;
        });
        localStorage.setItem('messages', JSON.stringify(this.messages));
        this.renderMessages();
    }

    showTaskDetails(taskId) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find(t => t.id == taskId);
        
        if (!task) {
            alert('Task not found');
            return;
        }

        const staff = JSON.parse(localStorage.getItem('staff')) || [];
        const assignedStaffNames = task.assignedStaff?.map(staffId => {
            const staffMember = staff.find(s => s.id == staffId);
            return staffMember ? staffMember.name : 'Unknown';
        }).join(', ') || 'None';

        const content = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Task Name</label>
                        <p class="text-sm text-gray-900">${task.name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Status</label>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusColor(task.status)}">${task.status}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Category</label>
                        <p class="text-sm text-gray-900">${task.category}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Subcategory</label>
                        <p class="text-sm text-gray-900">${task.subcategory || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Start Time</label>
                        <p class="text-sm text-gray-900">${this.formatDateTime(task.startTime)}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">End Time</label>
                        <p class="text-sm text-gray-900">${this.formatDateTime(task.endTime)}</p>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700">Location</label>
                    <p class="text-sm text-gray-900">${task.location}</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700">Assigned Staff</label>
                    <p class="text-sm text-gray-900">${assignedStaffNames}</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700">Duration</label>
                    <p class="text-sm text-gray-900">${task.duration} minutes</p>
                </div>
                
                ${task.features ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Features</label>
                    <div class="text-sm text-gray-900">
                        ${task.features.photoEvidence ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-2">Photo Evidence</span>' : ''}
                        ${task.features.earlyComplete ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Early Complete</span>' : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        $('#taskDetailContent').html(content);
        $('#taskDetailModal').removeClass('hidden').css('display', 'block');
    }

    getStatusColor(status) {
        const colors = {
            'open-queued': 'bg-blue-100 text-blue-800',
            'assigned': 'bg-indigo-100 text-indigo-800',
            'in-progress': 'bg-yellow-100 text-yellow-800',
            'rejected': 'bg-red-100 text-red-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-gray-200 text-gray-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    }

    hideTaskDetailModal() {
        $('#taskDetailModal').addClass('hidden').css('display', 'none');
    }

    renderPagination() {
        const container = $('#messagePagination');
        
        if (this.pagination.totalPages <= 1) {
            container.html('');
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        if (this.pagination.page > 1) {
            paginationHTML += `<button class="pagination-btn px-3 py-1 text-sm border rounded hover:bg-gray-50" data-page="${this.pagination.page - 1}">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= this.pagination.totalPages; i++) {
            if (i === this.pagination.page) {
                paginationHTML += `<button class="pagination-btn px-3 py-1 text-sm bg-blue-600 text-white rounded" data-page="${i}">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn px-3 py-1 text-sm border rounded hover:bg-gray-50" data-page="${i}">${i}</button>`;
            }
        }
        
        // Next button
        if (this.pagination.page < this.pagination.totalPages) {
            paginationHTML += `<button class="pagination-btn px-3 py-1 text-sm border rounded hover:bg-gray-50" data-page="${this.pagination.page + 1}">Next</button>`;
        }
        
        container.html(paginationHTML);
    }

    handlePagination(e) {
        const page = parseInt($(e.target).data('page'));
        if (page && page !== this.pagination.page) {
            this.pagination.page = page;
            this.renderMessages();
        }
    }
}

// Initialize the message center when the page loads
$(document).ready(() => {
    new MessageCenter();
});
