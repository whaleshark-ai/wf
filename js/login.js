// Login Page JavaScript
class LoginPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        $('#loginBtn').on('click', () => this.handleLogin());
        $('#roleSelect').on('change', () => this.onRoleChange());
    }

    checkExistingSession() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            // Redirect to dashboard if user is already logged in
            window.location.href = 'dashboard.html';
        }
    }

    onRoleChange() {
        const role = $('#roleSelect').val();
        const loginBtn = $('#loginBtn');
        const roleDescription = $('#roleDescription');
        const roleTitle = $('#roleTitle');
        const roleDetails = $('#roleDetails');
        
        if (role) {
            // Enable login button and update text
            loginBtn.prop('disabled', false)
                   .removeClass('bg-gray-400')
                   .addClass('bg-blue-600 hover:bg-blue-700')
                   .text('Continue to Dashboard');
            
            // Show role description
            roleDescription.removeClass('hidden');
            
            // Update role description based on selection
            const roleInfo = this.getRoleInfo(role);
            roleTitle.text(roleInfo.title);
            roleDetails.text(roleInfo.description);
        } else {
            // Disable login button and update text
            loginBtn.prop('disabled', true)
                   .removeClass('bg-blue-600 hover:bg-blue-700')
                   .addClass('bg-gray-400')
                   .text('Select Role to Continue');
            
            // Hide role description
            roleDescription.addClass('hidden');
        }
    }

    getRoleInfo(role) {
        const roleInfo = {
            system_admin: {
                title: 'System Administrator',
                description: 'Full access to all features including user management, system settings, and administrative functions.'
            },
            manager: {
                title: 'Manager',
                description: 'Access to team management, task oversight, reporting, and limited administrative functions.'
            },
            manager_licensee: {
                title: 'Manager (Licensee)',
                description: 'Has licensee privileges: can add contracts, departments, and staff for their contract(s).'
            },
            staff: {
                title: 'Staff Member',
                description: 'Access to assigned tasks, personal schedule, and basic reporting functions.'
            }
        };
        
        return roleInfo[role] || { title: 'Unknown Role', description: 'Please select a valid role.' };
    }

    handleLogin() {
        const role = $('#roleSelect').val();
        if (!role) {
            alert('Please select a role');
            return;
        }

        // Store user session
        const user = { role: role };
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Initialize login page when DOM is ready
$(document).ready(() => {
    new LoginPage();
}); 