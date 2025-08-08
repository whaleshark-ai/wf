// Locate Page JavaScript
class LocatePage {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuth();
        // Logout clears localStorage
        $(document).on('click', 'a[href="login.html"]', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
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
}

// Initialize locate page when DOM is ready
$(document).ready(() => {
    new LocatePage();
}); 