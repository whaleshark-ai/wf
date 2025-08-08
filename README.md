# Workforce Portal

A frontend-only workforce management portal built with HTML, Tailwind CSS, jQuery, and Chart.js. This POC application provides role-based access control and task management functionality.

## Features

### Role-Based Access Control
- **System Admin**: Full access to all features including user management and access control
- **Manager**: Access to task management, staff management, and contract management
- **Staff**: Limited access to task management and basic settings

### Dashboard
- **System Admin Dashboard**: 
  - Daily usage charts
  - Task statistics by day/week/month
  - Summary statistics with change indicators
- **Manager Dashboard**: Basic dashboard (placeholder)
- **Staff Dashboard**: Basic dashboard (placeholder)

### Task Management
- Task summary with statistics cards
- Task collection view with status indicators
- Add new tasks with comprehensive form
- Task templates for quick task creation
- Staff assignment functionality
- Location-based task assignment

### Settings
- **System Admin Settings**:
  - Add/Manage Staff
  - User Roles Management
  - Access Control Configuration
- **Manager Settings**:
  - Contract Management
  - Service Type Management
  - Staff Management
- **Staff Settings**:
  - Task Template Management
  - Task Category Management
  - Location Management

## Technology Stack

- **HTML5**: Semantic markup structure
- **Tailwind CSS**: Utility-first CSS framework for styling
- **jQuery**: JavaScript library for DOM manipulation and event handling
- **Chart.js**: Charting library for data visualization
- **Font Awesome**: Icon library
- **LocalStorage**: Client-side data persistence

## Project Structure

```
wf/
├── index.html          # Redirect to login page
├── login.html          # Login page
├── dashboard.html      # Dashboard page
├── task.html          # Task management page
├── staff.html         # Staff & schedule page
├── locate.html        # Location tracking page
├── settings.html      # Settings page
├── js/
│   ├── login.js       # Login page JavaScript
│   ├── dashboard.js   # Dashboard page JavaScript
│   ├── task.js        # Task page JavaScript
│   ├── staff.js       # Staff page JavaScript
│   ├── locate.js      # Locate page JavaScript
│   └── settings.js    # Settings page JavaScript
├── requirement.txt     # Project requirements
├── tech_stacks.txt    # Technology stack specification
└── README.md          # Project documentation
```

## Getting Started

1. **Clone or download the project files**
2. **Open `login.html` in a web browser** (or `index.html` which will redirect to login)
3. **Select a role from the login page**:
   - System Admin
   - Manager
   - Staff
4. **Explore the different features based on your role**

## Data Persistence

The application uses browser localStorage to persist data between sessions. All data is stored locally and includes:

- Tasks and task templates
- Staff information
- Locations
- Task categories and subcategories
- Contracts and services
- User roles and access control settings

## Key Features Implementation

### Login System
- Role-based authentication
- Session management
- Access control enforcement

### Navigation
- Responsive navigation bar
- Role-based menu visibility
- Active page highlighting

### Task Management
- Comprehensive task creation form
- Real-time form validation
- Dynamic end time calculation
- Staff filtering and assignment
- Template-based task creation

### Dashboard Analytics
- Interactive charts using Chart.js
- Real-time data visualization
- Period-based data filtering (day/week/month)
- Summary statistics with trend indicators

### Settings Management
- Role-specific settings pages
- Modular settings interface
- Extensible settings structure

## Browser Compatibility

This application is compatible with modern browsers that support:
- ES6 JavaScript features
- LocalStorage API
- CSS Grid and Flexbox
- HTML5 semantic elements

## Development Notes

### Data Structure
The application uses a modular data structure with separate collections for:
- Tasks
- Staff
- Locations
- Categories
- Templates
- Contracts
- Services
- User Roles
- Access Control

### Event Handling
All user interactions are handled through jQuery event listeners with proper event delegation and cleanup.

### Responsive Design
The application is fully responsive using Tailwind CSS utility classes and mobile-first design principles.

## Future Enhancements

- Backend integration for real data persistence
- Real-time notifications
- Advanced reporting and analytics
- Mobile app development
- API integration for external systems
- Advanced search and filtering
- Export functionality for reports
- Multi-language support

## License

This is a POC (Proof of Concept) application for demonstration purposes. 