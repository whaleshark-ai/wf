// Task Page JavaScript
class TaskPage {
    constructor() {
        this.currentUser = null;
        this.tasks = [];
        this.staff = [];
        this.locations = [];
        this.taskCategories = [];
        this.taskSubcategories = [];
        this.documents = [];
        this.filteredTasks = [];
        this.pagination = { page: 1, pageSize: 12, totalPages: 1 };
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.applyAccessVisibility('task');
        this.loadData();
        this.bindEvents();
        this.loadTaskPage();
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

    loadData() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || this.getSampleTasks();
        this.staff = (JSON.parse(localStorage.getItem('staff')) || this.getSampleStaff()).filter(s => (s.status || 'active') === 'active');
        this.locations = (JSON.parse(localStorage.getItem('locations')) || this.getSampleLocations()).filter(l => (l.status || 'active') === 'active');
        this.taskCategories = (JSON.parse(localStorage.getItem('taskCategories')) || this.getSampleTaskCategories()).filter(c => (c.status || 'active') === 'active');
        this.taskSubcategories = JSON.parse(localStorage.getItem('taskSubcategories')) || this.getSampleTaskSubcategories();
        this.documents = (JSON.parse(localStorage.getItem('documents')) || []).filter(d => (d.status || 'active') === 'active');
    }

    bindEvents() {
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Task management events (delegated to avoid timing issues)
        $(document).on('click', '#addTaskBtn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddTaskModal();
        });
        $('#addTaskMenuBtn').on('click', () => this.toggleAddTaskMenu());
        $('#addNewTask').on('click', () => this.showAddTaskModal());
        $('#addFromTemplate').on('click', () => this.openTemplatePicker());
        
        // Modal events
        $('#closeTaskModal').on('click', () => this.hideAddTaskModal());
        $('#cancelTaskBtn').on('click', () => this.hideAddTaskModal());
        $('#submitTaskBtn').on('click', () => this.submitTask());
        $('#saveTemplateBtn').on('click', () => this.saveTaskTemplate());
        $('#closeTemplateModal').on('click', () => this.hideTemplatePicker());
        $(document).on('click', '.template-card', (e) => this.applyTemplateFromCard(e));
        $('#templateAddDirectBtn').on('click', () => { this.hideTemplatePicker(); this.showAddTaskModal(); });

        // Form events
        $('#taskCategory').on('change', () => this.onTaskCategoryChange());
        $('#taskSubcategory').on('change', () => this.onTaskSubcategoryChange());
        $('#startTime, #duration').on('change', () => this.calculateEndTime());
        $('#assignStaffSearch').on('input', () => this.filterStaff());
        
        // Location mode tab switching
        $(document).on('click', '.location-tab-btn', (e) => this.switchLocationMode(e));
        // Checkpoint selection
        $(document).on('change', '#checkpointSelect', () => this.onCheckpointChange());

        // Tab events
        $('.tab-btn').on('click', (e) => this.switchTab(e));

        // Filter events
        $('#statusFilter, #typeFilter, #staffFilter, #locationFilter').on('change', () => this.applyFilters());
        $('#dateStart, #dateEnd').on('change', () => this.applyFilters());
        $('#clearFiltersBtn').on('click', () => this.clearFilters());
        
        // Toggle events
        $('#hideCompletedTasks, #hideCancelledTasks, #hideRejectedTasks').on('change', () => this.applyFilters());

        // Close modal when clicking the overlay background only
        $('#addTaskModal').on('click', (e) => {
            if (e.target && e.target.id === 'addTaskModal') {
                this.hideAddTaskModal();
            }
        });
    }

    loadTaskPage() {
        this.updateTaskStats();
        this.loadTaskCollection();
        this.setDefaultDateRange();
        this.applyFilters();
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
        this.renderTaskCards(this.tasks);
    }

    renderTaskCards(tasks) {
        // Group by date (YYYY-MM-DD)
        const byDate = tasks.reduce((acc, t) => {
            const key = (t.startTime || '').slice(0,10);
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
        }, {});
        const dates = Object.keys(byDate).sort();
        const sectionsHtml = dates.map(dateKey => {
            const display = new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const cards = byDate[dateKey].map(task => `
                <div class="task-card bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow" 
                    data-status="${task.status}" 
                    data-type="${task.category.toLowerCase()}" 
                    data-staff="${task.assignedStaff.join(',')}" 
                     data-location="${task.location.toLowerCase()}" 
                     data-id="${task.id}">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-800">${task.name}</h4>
                        <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(task.status)}">${task.status}</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                        <div>Category: ${task.category}</div>
                        <div>Location: ${task.location}</div>
                        <div>Time: ${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}</div>
                        <div>Assigned: ${this.getStaffNames(task.assignedStaff)}</div>
                    </div>
                    ${task.isOverdue ? '<div class="text-xs text-red-600 font-semibold">OVERDUE</div>' : ''}
                </div>
            `).join('');
            return `
                <div>
                    <div class="text-sm font-semibold text-gray-700 mb-2">${display}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${cards}
                    </div>
                </div>`;
        }).join('');
        $('#taskCollection').html(sectionsHtml || '<div class="text-gray-500">No tasks.</div>');
        // Click to open prefilled modal
        $(document).off('click', '.task-card').on('click', '.task-card', (e) => {
            const id = parseInt($(e.currentTarget).data('id'), 10);
            const t = this.tasks.find(x => x.id === id);
            if (!t) return;
            this.openTaskForEdit(t);
        });
    }

    openTaskForEdit(task) {
        // Store the task ID being edited
        this.editingTaskId = task.id;
        
        // Show modal as Edit
        $('#taskModalTitle').text('View / Edit Task');
        this.populateTaskFormForEdit(); // Use edit-specific population
        
        // Hide recurrence fields for editing
        this.hideRecurrenceFields();
        
        // Fill fields
        const cat = this.taskCategories.find(c => c.name === task.category);
        if (cat) $('#taskCategory').val(cat.id).trigger('change');
        // small delay to allow subcategory render
        setTimeout(() => {
            const sub = this.taskSubcategories.find(s => s.name === (task.subcategory||''));
            if (sub) $('#taskSubcategory').val(sub.id).trigger('change');
        }, 0);
        $('#taskName').val(task.name);
        $('#startTime').val(task.startTime?.slice(0,16));
        $('#duration').val(task.duration || '');
        $('#endTime').val(task.endTime?.slice(0,16));
        // Features (if present)
        if (task.features) {
            $('#featurePhotoEvidence').prop('checked', !!task.features.photoEvidence);
            $('#featureEarlyComplete').prop('checked', !!task.features.earlyComplete);
        }
        // Location: try to match POI first
        const poi = this.locations.find(l => (l.name||'').toLowerCase() === (task.location||'').toLowerCase());
        if (poi) {
            $('.location-tab-btn[data-tab="poi"]').trigger('click');
            const opt = $('#location option').filter(function(){ return $(this).text() === poi.name; }).val();
            if (opt) $('#location').val(opt);
        }
        
        // For edit mode, show radio buttons and select current assignee
        const currentStaffId = task.assignedStaff && task.assignedStaff.length > 0 ? task.assignedStaff[0] : null;
        if (currentStaffId) {
            $(`#staffList input[value="${currentStaffId}"]`).prop('checked', true);
        } else {
            // Select "No Assignee" if no staff assigned
            $('#staffList input[value=""]').prop('checked', true);
        }
        
        $('#addTaskModal').removeClass('hidden').css('display', 'block');
    }

    getStatusColor(status) {
        const colors = {
            'open-queued': 'bg-blue-100 text-blue-800',
            'assigned': 'bg-indigo-100 text-indigo-800',
            'in-progress': 'bg-yellow-100 text-yellow-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-gray-200 text-gray-700',
            'suspended': 'bg-purple-100 text-purple-800',
            'overdue': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    showAddTaskModal() {
        this.populateTaskForm();
        // Show recurrence fields for new tasks
        this.showRecurrenceFields();
        $('#addTaskModal').removeClass('hidden').css('display', 'block');
    }

    hideAddTaskModal() {
        $('#addTaskModal').addClass('hidden').css('display', 'none');
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

        // Populate checkpoints
        const checkpoints = this.getSampleCheckpoints();
        const cpOptions = checkpoints.map(cp => 
            `<option value="${cp.id}">${cp.name}</option>`
        ).join('');
        $('#checkpointSelect').html('<option value="">Select checkpoint...</option>' + cpOptions);
        this.currentCheckpoints = checkpoints;

        // Populate location zones (sample)
        const zones = this.getSampleZones();
        const zoneOpts = zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        $('#zoneSelect').html('<option value="">Select location zone...</option>' + zoneOpts);
        this.currentZones = zones;

        // Populate staff list with checkboxes for new tasks
        const staffOptions = this.staff.map(s => `
            <div class="flex items-center">
                <input type="checkbox" id="staff_${s.id}" value="${s.id}" class="mr-2">
                <label for="staff_${s.id}" class="text-sm">${s.name}</label>
            </div>
        `).join('');
        $('#staffList').html(staffOptions);

        // Populate documents dropdown
        this.renderDocumentOptions();
    }

    populateTaskFormForEdit() {
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

        // Populate checkpoints
        const checkpoints = this.getSampleCheckpoints();
        const cpOptions = checkpoints.map(cp => 
            `<option value="${cp.id}">${cp.name}</option>`
        ).join('');
        $('#checkpointSelect').html('<option value="">Select checkpoint...</option>' + cpOptions);
        this.currentCheckpoints = checkpoints;

        // Populate location zones (sample)
        const zones = this.getSampleZones();
        const zoneOpts = zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        $('#zoneSelect').html('<option value="">Select location zone...</option>' + zoneOpts);
        this.currentZones = zones;

        // Populate staff list with radio buttons for edit mode (single selection)
        const staffOptions = this.staff.map(s => `
            <div class="flex items-center">
                <input type="radio" name="editStaff" id="staff_${s.id}" value="${s.id}" class="mr-2">
                <label for="staff_${s.id}" class="text-sm">${s.name}</label>
            </div>
        `).join('');
        // Add "No Assignee" option for edit mode
        const noAssigneeOption = `
            <div class="flex items-center">
                <input type="radio" name="editStaff" id="staff_none" value="" class="mr-2">
                <label for="staff_none" class="text-sm text-gray-500">No Assignee</label>
            </div>
        `;
        $('#staffList').html(noAssigneeOption + staffOptions);

        // Populate documents dropdown
        this.renderDocumentOptions();
    }

    renderDocumentOptions() {
        const select = $('#documentSelect');
        const options = (this.documents || []).map((d) => {
            const label = `${d.filename} (${d.category})`;
            return `<option value="${d.id || ''}">${label}</option>`;
        }).join('');
        select.html('<option value="">Select document...</option>' + options);
    }

    // removed filterDocumentOptions; simple dropdown retained

    getSampleZones() {
        return [
            { id: 1, name: 'Zone 1' },
            { id: 2, name: 'Zone 2' },
            { id: 3, name: 'Zone 3' }
        ];
    }

    showRecurrenceFields() {
        $('#recurrenceType, #recurrenceInterval, #recurrenceEnd').closest('.grid').show();
    }

    hideRecurrenceFields() {
        $('#recurrenceType, #recurrenceInterval, #recurrenceEnd').closest('.grid').hide();
    }

    // Sample checkpoints with locations references
    getSampleCheckpoints() {
        return [
            { id: 1, name: 'North Wing Routine', locations: [1, 2] },
            { id: 2, name: 'South Wing Patrol', locations: [3] }
        ];
    }

    resetTaskForm() {
        $('#taskCategory, #taskSubcategory, #taskName, #startTime, #duration, #endTime, #location, #checkpointSelect').val('');
        $('#recurrenceType, #recurrenceInterval, #recurrenceEnd').val('');
        $('#checkpointLocationsList').empty();
        // reset location mode to POI
        $('.location-tab-btn').removeClass('bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
        $('.location-tab-btn[data-tab="poi"]').addClass('bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
        $('#poiLocationSection').removeClass('hidden');
        $('#checkpointSection').addClass('hidden');
        $('#zoneSection').addClass('hidden');
        $('#staffList input[type="checkbox"], #staffList input[type="radio"]').prop('checked', false);
        // Reset modal title and editing state
        $('#taskModalTitle').text('Add New Task');
        this.editingTaskId = null;
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

    switchLocationMode(e) {
        $('.location-tab-btn').removeClass('bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
        const tab = $(e.target).data('tab');
        $(e.target).addClass('bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
        if (tab === 'poi') {
            $('#poiLocationSection').removeClass('hidden');
            $('#checkpointSection').addClass('hidden');
            $('#zoneSection').addClass('hidden');
        } else {
            if (tab === 'checkpoint') {
                $('#poiLocationSection').addClass('hidden');
                $('#checkpointSection').removeClass('hidden');
                $('#zoneSection').addClass('hidden');
            } else if (tab === 'zone') {
                $('#poiLocationSection').addClass('hidden');
                $('#checkpointSection').addClass('hidden');
                $('#zoneSection').removeClass('hidden');
            }
        }
    }

    onCheckpointChange() {
        const id = parseInt($('#checkpointSelect').val(), 10);
        const cp = this.currentCheckpoints?.find(c => c.id === id);
        const container = $('#checkpointLocationsList');
        container.empty();
        if (!cp) return;
        const list = cp.locations.map(locId => {
            const loc = this.locations.find(l => l.id === locId);
            return loc ? `<li class="list-disc ml-5">${loc.name}</li>` : '';
        }).join('');
        container.html(list ? `<ul>${list}</ul>` : '<div class="text-gray-500">No locations found in this checkpoint.</div>');
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
        const filter = $('#assignStaffSearch').val().toLowerCase();
        $('#staffList div').each(function() {
            const name = $(this).find('label').text().toLowerCase();
            $(this).toggle(name.includes(filter));
        });
    }

    switchTab(e) {
        $('.tab-btn').removeClass('active bg-blue-600 text-white').addClass('bg-gray-200 text-gray-700');
        $(e.target).addClass('active bg-blue-600 text-white').removeClass('bg-gray-200 text-gray-700');
    }

    toggleAddTaskMenu() {
        $('#addTaskMenu').toggle();
    }

    openTemplatePicker() {
        this.renderTemplateCards();
        $('#templatePickerModal').removeClass('hidden').css('display', 'block');
    }

    hideTemplatePicker() {
        $('#templatePickerModal').addClass('hidden').css('display', 'none');
    }

    submitTask() {
        // Determine if this is an edit (radio buttons) or new task (checkboxes)
        const isEdit = $('#taskModalTitle').text().includes('Edit');
        
        let assignedStaff = [];
        if (isEdit) {
            // For edit mode, get selected radio button value
            const selectedRadio = $('#staffList input[name="editStaff"]:checked').val();
            if (selectedRadio) {
                assignedStaff = [selectedRadio];
            }
        } else {
            // For new tasks, get all checked checkboxes
            assignedStaff = $('#staffList input:checked').map(function() {
                return $(this).val();
            }).get();
        }

        const taskData = {
            id: Date.now(),
            name: $('#taskName').val(),
            category: $('#taskCategory option:selected').text(),
            subcategory: $('#taskSubcategory option:selected').text(),
            startTime: $('#startTime').val(),
            endTime: $('#endTime').val(),
            duration: $('#duration').val(),
            features: {
                photoEvidence: $('#featurePhotoEvidence').is(':checked'),
                earlyComplete: $('#featureEarlyComplete').is(':checked')
            },
            location: this.getSelectedLocationForSubmit(true),
            status: 'open-queued',
            assignedStaff: assignedStaff,
            createdAt: new Date().toISOString()
        };

        // Attach selected document metadata if any
        const selectedDocId = $('#documentSelect').val();
        if (selectedDocId) {
            const doc = (this.documents || []).find(d => String(d.id) === String(selectedDocId));
            if (doc) {
                taskData.document = { id: doc.id, filename: doc.filename, url: doc.url, category: doc.category };
            }
        }

        if (!taskData.name || !taskData.startTime || !taskData.endTime) {
            alert('Please fill in all required fields');
            return;
        }

        // Determine status by assignee presence
        taskData.status = (taskData.assignedStaff && taskData.assignedStaff.length > 0) ? 'assigned' : 'open-queued';

        if (isEdit) {
            // For edit mode, update the existing task
            // Find the task being edited from the clicked card
            const taskCards = $('.task-card');
            let editingTaskId = null;
            
            // Store the editing task ID when opening edit modal
            if (this.editingTaskId) {
                editingTaskId = this.editingTaskId;
            }
            
            if (editingTaskId) {
                const taskIndex = this.tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex !== -1) {
                    const originalTask = this.tasks[taskIndex];
                    
                    // Check if task is in-progress and assignee is changing
                    const isInProgress = originalTask.status === 'in-progress';
                    const originalAssignee = originalTask.assignedStaff && originalTask.assignedStaff.length > 0 ? originalTask.assignedStaff[0] : null;
                    const newAssignee = taskData.assignedStaff && taskData.assignedStaff.length > 0 ? taskData.assignedStaff[0] : null;
                    const assigneeChanged = originalAssignee !== newAssignee;
                    
                    let updatedTaskData = { ...taskData };
                    
                    // If task is in-progress and assignee changed, update start time to now
                    if (isInProgress && assigneeChanged) {
                        const now = new Date();
                        updatedTaskData.startTime = now.toISOString();
                        
                        // Recalculate end time based on duration
                        if (taskData.duration) {
                            const endTime = new Date(now.getTime() + parseInt(taskData.duration) * 60000);
                            updatedTaskData.endTime = endTime.toISOString();
                        }
                        
                        console.log('Task reassigned while in-progress. Start time updated to:', updatedTaskData.startTime);
                        
                        // Show notification to user
                        const newStaffName = this.getStaffNameById(newAssignee);
                        const oldStaffName = this.getStaffNameById(originalAssignee);
                        alert(`Task reassigned from ${oldStaffName || 'Unassigned'} to ${newStaffName || 'Unassigned'}. Start time has been updated to now due to in-progress status.`);
                    }
                    
                    // Update existing task
                    this.tasks[taskIndex] = {
                        ...originalTask,
                        ...updatedTaskData,
                        id: editingTaskId, // Keep original ID
                        createdAt: originalTask.createdAt // Keep original creation time
                    };
                }
            }
            
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
            this.hideAddTaskModal();
            this.loadTaskPage();
            return;
        }

        // For new tasks: Create separate tasks for each assignee
        const assignedStaffIds = taskData.assignedStaff;
        const tasksToCreate = [];
        
        if (assignedStaffIds && assignedStaffIds.length > 0) {
            // Create one task for each assignee
            assignedStaffIds.forEach(staffId => {
                const individualTask = {
                    ...taskData,
                    id: Date.now() + Math.floor(Math.random() * 100000),
                    assignedStaff: [staffId], // Single staff member per task
                    status: 'assigned'
                };
                tasksToCreate.push(individualTask);
            });
        } else {
            // No assignees - create single open-queued task
            tasksToCreate.push(taskData);
        }

        // Handle recurrence generation for each task
        const recType = $('#recurrenceType').val();
        const recInterval = parseInt($('#recurrenceInterval').val(), 10) || 0;
        const recEndStr = $('#recurrenceEnd').val();
        
        const finalTasksToAdd = [];
        
        tasksToCreate.forEach(baseTask => {
            const baseStart = new Date(baseTask.startTime);
            const baseEnd = new Date(baseTask.endTime);
            const tasksFromRecurrence = [baseTask];
            
            if (recType && recInterval > 0 && recEndStr) {
                let nextStart = new Date(baseStart);
                let nextEnd = new Date(baseEnd);
                const endBound = new Date(recEndStr);
                
                while (true) {
                    if (recType === 'hourly') {
                        nextStart = new Date(nextStart.getTime() + recInterval * 60 * 60 * 1000);
                        nextEnd = new Date(nextEnd.getTime() + recInterval * 60 * 60 * 1000);
                    } else if (recType === 'daily') {
                        nextStart = new Date(nextStart.getTime() + recInterval * 24 * 60 * 60 * 1000);
                        nextEnd = new Date(nextEnd.getTime() + recInterval * 24 * 60 * 60 * 1000);
                    }
                    if (nextStart > endBound) break;
                    
                    tasksFromRecurrence.push({
                        ...baseTask,
                        id: Date.now() + Math.floor(Math.random() * 100000),
                        startTime: nextStart.toISOString(),
                        endTime: nextEnd.toISOString()
                    });
                }
            }
            
            finalTasksToAdd.push(...tasksFromRecurrence);
        });

        this.tasks = this.tasks.concat(finalTasksToAdd);
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.hideAddTaskModal();
        this.loadTaskPage();
    }

    saveTaskTemplate() {
        const templateData = {
            id: Date.now(),
            name: $('#taskName').val(),
            categoryId: $('#taskCategory').val(),
            subcategoryId: $('#taskSubcategory').val(),
            categoryLabel: $('#taskCategory option:selected').text(),
            subcategoryLabel: $('#taskSubcategory option:selected').text(),
            duration: $('#duration').val(),
            locationDisplay: this.getSelectedLocationForSubmit(true),
            locationValue: this.getSelectedLocationForSubmit(false),
            mode: $('.location-tab-btn[data-tab="poi"]').hasClass('bg-blue-600') ? 'poi' : 'checkpoint'
        };

        const templates = JSON.parse(localStorage.getItem('taskTemplatesInline')) || [];
        templates.push(templateData);
        localStorage.setItem('taskTemplatesInline', JSON.stringify(templates));
        alert('Template saved successfully!');
    }

    renderTemplateCards() {
        const templates = JSON.parse(localStorage.getItem('taskTemplatesInline')) || [];
        const container = $('#templateCards');
        const empty = $('#templateEmptyState');
        container.empty();
        if (templates.length === 0) {
            empty.removeClass('hidden');
            return;
        }
        empty.addClass('hidden');
        const cards = templates.map(t => `
            <div class="template-card cursor-pointer border rounded-lg p-4 hover:shadow bg-gray-50" data-id="${t.id}">
                <div class="font-semibold text-gray-800 mb-1">${t.name || 'Untitled Task'}</div>
                <div class="text-sm text-gray-600">${t.categoryLabel} / ${t.subcategoryLabel}</div>
                <div class="text-sm text-gray-600">Duration: ${t.duration}m</div>
                <div class="text-sm text-gray-600">Location: ${t.locationDisplay || '-'}</div>
            </div>
        `).join('');
        container.html(cards);
    }

    applyTemplateFromCard(e) {
        const id = parseInt($(e.currentTarget).data('id'), 10);
        const templates = JSON.parse(localStorage.getItem('taskTemplatesInline')) || [];
        const t = templates.find(x => x.id === id);
        if (!t) return;
        // Close picker and open form
        this.hideTemplatePicker();
        this.showAddTaskModal();
        // Apply fields (exclude start time and assignees as requested)
        $('#taskCategory').val(t.categoryId).trigger('change');
        // Wait for subcategories to populate then set subcategory
        setTimeout(() => {
            $('#taskSubcategory').val(t.subcategoryId).trigger('change');
        }, 0);
        $('#duration').val(t.duration);
        // Location
        if (t.mode === 'poi') {
            $('.location-tab-btn[data-tab="poi"]').trigger('click');
            $('#location').val(t.locationValue);
        } else {
            $('.location-tab-btn[data-tab="checkpoint"]').trigger('click');
            // try match checkpoint by display prefix
            const cps = this.currentCheckpoints || [];
            const match = cps.find(cp => t.locationDisplay && t.locationDisplay.startsWith(cp.name));
            if (match) $('#checkpointSelect').val(match.id).trigger('change');
        }
    }

    getSelectedLocationForSubmit(returnLabel = false) {
        // If POI tab active, use #location
        const poiActive = $('.location-tab-btn[data-tab="poi"]').hasClass('bg-blue-600');
        if (poiActive) {
            const val = $('#location').val();
            if (returnLabel) return $('#location option:selected').text();
            return val;
        }
        // Else checkpoint
        const checkpointActive = $('.location-tab-btn[data-tab="checkpoint"]').hasClass('bg-blue-600');
        if (checkpointActive) {
            const cpId = parseInt($('#checkpointSelect').val(), 10);
            const cp = this.currentCheckpoints?.find(c => c.id === cpId);
            if (!cp) return returnLabel ? '' : '';
            const cpName = $('#checkpointSelect option:selected').text();
            const locNames = cp.locations.map(id => this.locations.find(l => l.id === id)?.name).filter(Boolean);
            const label = `${cpName}: ${locNames.join(', ')}`;
            return label;
        }
        // Else zone
        const zoneActive = $('.location-tab-btn[data-tab="zone"]').hasClass('bg-blue-600');
        if (zoneActive) {
            if (returnLabel) return $('#zoneSelect option:selected').text();
            return $('#zoneSelect').val();
        }
        return '';
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getStaffNames(staffIds) {
        return staffIds.map(id => {
            const staff = this.staff.find(s => s.id == id);
            return staff ? staff.name : 'Unknown';
        }).join(', ');
    }

    getStaffNameById(staffId) {
        if (!staffId) return null;
        const staff = this.staff.find(s => s.id == staffId);
        return staff ? staff.name : 'Unknown';
    }

    applyFilters() {
        const statusFilter = $('#statusFilter').val();
        const typeFilter = $('#typeFilter').val();
        const staffFilter = $('#staffFilter').val();
        const locationFilter = $('#locationFilter').val();
        
        // Get toggle states
        const hideCompleted = $('#hideCompletedTasks').is(':checked');
        const hideCancelled = $('#hideCancelledTasks').is(':checked');
        const hideRejected = $('#hideRejectedTasks').is(':checked');

        let filteredTasks = this.tasks;

        // Apply status toggles
        if (hideCompleted) {
            filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
        }
        if (hideCancelled) {
            filteredTasks = filteredTasks.filter(task => task.status !== 'cancelled');
        }
        if (hideRejected) {
            filteredTasks = filteredTasks.filter(task => task.status !== 'rejected');
        }

        // Apply other filters
        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }

        if (typeFilter) {
            filteredTasks = filteredTasks.filter(task => task.category.toLowerCase() === typeFilter);
        }

        if (staffFilter) {
            const staffId = parseInt(staffFilter, 10);
            if (!Number.isNaN(staffId)) {
                filteredTasks = filteredTasks.filter(task => task.assignedStaff.includes(staffId));
            }
        }

        if (locationFilter) {
            filteredTasks = filteredTasks.filter(task => task.location.toLowerCase().includes(locationFilter.toLowerCase()));
        }

        // Date range filter (start/end dates)
        const { startDate, endDate } = this.getDateRange();
        filteredTasks = filteredTasks.filter(t => {
            const s = new Date(t.startTime);
            return s >= startDate && s <= endDate;
        });

        // Sort tasks according to the specified order
        filteredTasks = this.sortTasks(filteredTasks);

        // Pagination setup (12 cards per page, across all dates combined order)
        this.filteredTasks = filteredTasks;
        this.pagination.totalPages = Math.max(1, Math.ceil(filteredTasks.length / this.pagination.pageSize));
        if (this.pagination.page > this.pagination.totalPages) this.pagination.page = this.pagination.totalPages;
        const pageTasks = filteredTasks.slice((this.pagination.page - 1) * this.pagination.pageSize, this.pagination.page * this.pagination.pageSize);

        this.renderTaskCards(pageTasks);
        this.renderPagination();
        this.updateTaskStats(filteredTasks);
    }

    sortTasks(tasks) {
        return tasks.sort((a, b) => {
            // 1. Sort by end time (earliest first)
            const endTimeA = new Date(a.endTime);
            const endTimeB = new Date(b.endTime);
            if (endTimeA.getTime() !== endTimeB.getTime()) {
                return endTimeA.getTime() - endTimeB.getTime();
            }

            // 2. Sort by task type (adhoc first)
            const isAdhocA = a.category.toLowerCase() === 'adhoc';
            const isAdhocB = b.category.toLowerCase() === 'adhoc';
            if (isAdhocA !== isAdhocB) {
                return isAdhocA ? -1 : 1;
            }

            // 3. Sort by task status priority
            const statusPriority = {
                'open-queued': 1,
                'assigned': 2,
                'in-progress': 3,
                'rejected': 4,
                'completed': 5,
                'cancelled': 6
            };
            
            const priorityA = statusPriority[a.status] || 999;
            const priorityB = statusPriority[b.status] || 999;
            
            return priorityA - priorityB;
        });
    }

    setDefaultDateRange() {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);
        // default to 3 days window
        end.setDate(end.getDate() + 2);
        $('#dateStart').val(start.toISOString().slice(0,10));
        $('#dateEnd').val(end.toISOString().slice(0,10));
    }

    getDateRange() {
        const startStr = $('#dateStart').val();
        const endStr = $('#dateEnd').val();
        const startDate = startStr ? new Date(startStr + 'T00:00:00') : new Date();
        const endDate = endStr ? new Date(endStr + 'T23:59:59') : new Date(startDate.getTime());
        if (!endStr) {
            // If missing end date, fallback to start date same-day
            endDate.setHours(23,59,59,999);
        }
        return { startDate, endDate };
    }

    renderPagination() {
        const container = $('#taskPagination');
        container.empty();
        if (this.pagination.totalPages <= 1) return;
        const btn = (label, page, disabled = false, active = false) => `<button data-page="${page}" class="px-2 py-1 border rounded ${active ? 'bg-blue-600 text-white' : 'bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}">${label}</button>`;
        const parts = [];
        parts.push(btn('Prev', Math.max(1, this.pagination.page - 1), this.pagination.page === 1));
        parts.push(`<span class="px-2">Page ${this.pagination.page} of ${this.pagination.totalPages}</span>`);
        parts.push(btn('Next', Math.min(this.pagination.totalPages, this.pagination.page + 1), this.pagination.page === this.pagination.totalPages));
        container.html(parts.join(''));
        container.find('button[data-page]').on('click', (e) => {
            const p = parseInt($(e.currentTarget).data('page'), 10);
            if (!Number.isNaN(p) && p >= 1 && p <= this.pagination.totalPages) {
                this.pagination.page = p;
                this.applyFilters();
            }
        });
    }

    clearFilters() {
        $('#statusFilter, #typeFilter, #staffFilter, #locationFilter').val('');
        this.renderTaskCards(this.tasks);
        this.updateTaskStats();
    }

    getStaffIdByName(name) {
        const staff = this.staff.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
        return staff ? staff.id : null;
    }

    updateTaskStats(tasks = null) {
        const taskList = tasks || this.tasks;
        const total = taskList.length;
        const completed = taskList.filter(t => t.status === 'completed').length;
        const pending = taskList.filter(t => t.status === 'pending').length;
        const overdue = taskList.filter(t => t.status === 'overdue').length;

        $('#totalTasks').text(total);
        $('#completedTasks').text(completed);
        $('#pendingTasks').text(pending);
        $('#overdueTasks').text(overdue);
    }

    // Sample data generators
    getSampleTasks() {
        return [
            {
                id: 1,
                name: 'Daily Cleaning Service',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-09T09:00:00',
                endTime: '2025-08-09T10:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'completed',
                assignedStaff: [1, 2],
                createdAt: '2025-08-09T08:00:00',
                completedAt: '2025-08-09T10:00:00'
            },
            {
                id: 2,
                name: 'Security Patrol',
                category: 'Security',
                subcategory: 'Patrol',
                startTime: '2025-08-09T14:00:00',
                endTime: '2025-08-09T15:00:00',
                duration: 60,
                location: 'Building B - Floor 2',
                status: 'in-progress',
                assignedStaff: [3],
                createdAt: '2025-08-09T13:00:00'
            },
            {
                id: 3,
                name: 'Equipment Inspection',
                category: 'Inspection',
                subcategory: 'Safety Check',
                startTime: '2025-08-09T11:00:00',
                endTime: '2025-08-09T12:00:00',
                duration: 60,
                location: 'Building A - Floor 2',
                status: 'completed',
                assignedStaff: [4],
                createdAt: '2025-08-09T10:30:00',
                completedAt: '2025-08-09T12:00:00'
            },
            {
                id: 4,
                name: 'Urgent Repair Request',
                category: 'Adhoc',
                subcategory: 'Emergency',
                startTime: '2025-08-09T16:00:00',
                endTime: '2025-08-09T17:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'assigned',
                assignedStaff: [1],
                createdAt: '2025-08-09T15:30:00'
            },
            {
                id: 5,
                name: 'Monthly Maintenance Check',
                category: 'Maintenance',
                subcategory: 'Preventive',
                startTime: '2025-08-09T13:00:00',
                endTime: '2025-08-09T14:00:00',
                duration: 60,
                location: 'Building B - Floor 1',
                status: 'open-queued',
                assignedStaff: [],
                createdAt: '2025-08-09T12:00:00'
            },
            {
                id: 6,
                name: 'Emergency Security Alert',
                category: 'Adhoc',
                subcategory: 'Emergency',
                startTime: '2025-08-09T18:00:00',
                endTime: '2025-08-09T19:00:00',
                duration: 60,
                location: 'Building B - Floor 2',
                status: 'suspended',
                assignedStaff: [3],
                createdAt: '2025-08-09T17:30:00'
            },
            {
                id: 7,
                name: 'Regular Cleaning Schedule',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-09T10:00:00',
                endTime: '2025-08-09T11:00:00',
                duration: 60,
                location: 'Building A - Floor 2',
                status: 'cancelled',
                assignedStaff: [4],
                createdAt: '2025-08-09T09:00:00'
            },
            {
                id: 8,
                name: 'System Maintenance',
                category: 'Maintenance',
                subcategory: 'Technical',
                startTime: '2025-08-09T20:00:00',
                endTime: '2025-08-09T21:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'assigned',
                assignedStaff: [1, 2],
                createdAt: '2025-08-09T19:00:00'
            },
            {
                id: 9,
                name: 'Adhoc Inspection Request',
                category: 'Adhoc',
                subcategory: 'Inspection',
                startTime: '2025-08-09T22:00:00',
                endTime: '2025-08-09T23:00:00',
                duration: 60,
                location: 'Building B - Floor 1',
                status: 'open-queued',
                assignedStaff: [],
                createdAt: '2025-08-09T21:30:00'
            },
            {
                id: 10,
                name: 'Scheduled Security Check',
                category: 'Security',
                subcategory: 'Routine',
                startTime: '2025-08-09T12:00:00',
                endTime: '2025-08-09T13:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'in-progress',
                assignedStaff: [4],
                createdAt: '2025-08-09T11:30:00'
            },
            {
                id: 11,
                name: 'Fire Safety Check',
                category: 'Security',
                subcategory: 'Safety Inspection',
                startTime: '2025-08-10T10:00:00',
                endTime: '2025-08-10T11:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'overdue',
                assignedStaff: [2, 3],
                createdAt: '2025-08-09T09:00:00',
                isOverdue: true
            },
            {
                id: 12,
                name: 'Window Cleaning',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-10T13:00:00',
                endTime: '2025-08-10T15:00:00',
                duration: 120,
                location: 'Building A - Floor 2',
                status: 'pending',
                assignedStaff: [2],
                createdAt: '2025-08-09T14:00:00'
            },
            {
                id: 13,
                name: 'Access Control Audit',
                category: 'Security',
                subcategory: 'Access Control',
                startTime: '2025-08-10T09:00:00',
                endTime: '2025-08-10T10:30:00',
                duration: 90,
                location: 'Building B - Floor 2',
                status: 'pending',
                assignedStaff: [4],
                createdAt: '2025-08-09T15:00:00'
            },
            {
                id: 14,
                name: 'Deep Cleaning Service',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-11T08:00:00',
                endTime: '2025-08-11T12:00:00',
                duration: 240,
                location: 'Building B - Floor 1',
                status: 'pending',
                assignedStaff: [1, 2],
                createdAt: '2025-08-10T10:00:00'
            },
            {
                id: 15,
                name: 'Security Camera Check',
                category: 'Security',
                subcategory: 'Equipment Check',
                startTime: '2025-08-10T16:00:00',
                endTime: '2025-08-10T17:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'completed',
                assignedStaff: [3],
                createdAt: '2025-08-10T15:30:00',
                completedAt: '2025-08-10T17:00:00'
            },
            {
                id: 16,
                name: 'Emergency Exit Inspection',
                category: 'Inspection',
                subcategory: 'Safety Check',
                startTime: '2025-08-11T10:00:00',
                endTime: '2025-08-11T11:00:00',
                duration: 60,
                location: 'Building A - Floor 2',
                status: 'pending',
                assignedStaff: [4],
                createdAt: '2025-08-10T14:00:00'
            },
            {
                id: 17,
                name: 'Lobby Sanitization',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-09T08:30:00',
                endTime: '2025-08-09T09:30:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'pending',
                assignedStaff: [1]
            },
            {
                id: 18,
                name: 'Night Patrol A',
                category: 'Security',
                subcategory: 'Patrol',
                startTime: '2025-08-09T21:00:00',
                endTime: '2025-08-09T22:00:00',
                duration: 60,
                location: 'Building B - Floor 2',
                status: 'in-progress',
                assignedStaff: [3]
            },
            {
                id: 19,
                name: 'Equipment Check East',
                category: 'Inspection',
                subcategory: 'Safety Check',
                startTime: '2025-08-09T09:30:00',
                endTime: '2025-08-09T10:15:00',
                duration: 45,
                location: 'Building A - Floor 2',
                status: 'assigned',
                assignedStaff: [4]
            },
            {
                id: 20,
                name: 'Window Wipe West',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-10T09:00:00',
                endTime: '2025-08-10T10:00:00',
                duration: 60,
                location: 'Building B - Floor 1',
                status: 'open-queued',
                assignedStaff: []
            },
            {
                id: 21,
                name: 'Access Audit North',
                category: 'Security',
                subcategory: 'Access Control',
                startTime: '2025-08-10T11:00:00',
                endTime: '2025-08-10T12:00:00',
                duration: 60,
                location: 'Building A - Floor 1',
                status: 'assigned',
                assignedStaff: [4]
            },
            {
                id: 22,
                name: 'Checkpoint Sweep B',
                category: 'Security',
                subcategory: 'Patrol',
                startTime: '2025-08-10T13:30:00',
                endTime: '2025-08-10T14:30:00',
                duration: 60,
                location: 'Building B - Floor 2',
                status: 'pending',
                assignedStaff: [3]
            },
            {
                id: 23,
                name: 'Floor Scrub A2',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-10T15:00:00',
                endTime: '2025-08-10T16:00:00',
                duration: 60,
                location: 'Building A - Floor 2',
                status: 'in-progress',
                assignedStaff: [1,2]
            },
            {
                id: 24,
                name: 'Adhoc Spill Response',
                category: 'Adhoc',
                subcategory: 'Emergency',
                startTime: '2025-08-10T16:30:00',
                endTime: '2025-08-10T17:15:00',
                duration: 45,
                location: 'Building A - Floor 1',
                status: 'open-queued',
                assignedStaff: []
            },
            {
                id: 25,
                name: 'Door Sensor Test',
                category: 'Security',
                subcategory: 'Equipment Check',
                startTime: '2025-08-10T18:00:00',
                endTime: '2025-08-10T19:00:00',
                duration: 60,
                location: 'Building B - Floor 1',
                status: 'pending',
                assignedStaff: [4]
            },
            {
                id: 26,
                name: 'Lift Panel Clean',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-09T12:00:00',
                endTime: '2025-08-09T12:45:00',
                duration: 45,
                location: 'Building A - Floor 1',
                status: 'assigned',
                assignedStaff: [2]
            },
            {
                id: 27,
                name: 'Fire Extinguisher Check',
                category: 'Inspection',
                subcategory: 'Safety Check',
                startTime: '2025-08-09T13:30:00',
                endTime: '2025-08-09T14:00:00',
                duration: 30,
                location: 'Building B - Floor 2',
                status: 'pending',
                assignedStaff: [3]
            },
            {
                id: 28,
                name: 'Gate Access Review',
                category: 'Security',
                subcategory: 'Access Control',
                startTime: '2025-08-09T15:00:00',
                endTime: '2025-08-09T15:45:00',
                duration: 45,
                location: 'Building A - Floor 1',
                status: 'in-progress',
                assignedStaff: [4]
            },
            {
                id: 29,
                name: 'Atrium Dusting',
                category: 'Maintenance',
                subcategory: 'Cleaning',
                startTime: '2025-08-09T16:30:00',
                endTime: '2025-08-09T17:15:00',
                duration: 45,
                location: 'Building A - Floor 2',
                status: 'pending',
                assignedStaff: [1]
            },
            {
                id: 30,
                name: 'North Wing Patrol',
                category: 'Security',
                subcategory: 'Patrol',
                startTime: '2025-08-10T20:00:00',
                endTime: '2025-08-10T21:00:00',
                duration: 60,
                location: 'Building B - Floor 1',
                status: 'assigned',
                assignedStaff: [3]
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
}

// Initialize task page when DOM is ready
$(document).ready(() => {
    new TaskPage();
}); 