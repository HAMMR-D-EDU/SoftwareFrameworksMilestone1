# MACRO-HARD Teams

A full-stack chat application built with Angular (frontend) and Node.js/Express (backend) featuring user authentication, role-based permissions, groups, and channels.

## 🚀 Features

### ✅ User Authentication
- **Register**: Create new accounts with username, password, and optional email
- **Login**: Authenticate with username/password
- **Logout**: Clear session and redirect to login
- **Session Management**: Persistent login state using LocalStorage

### ✅ Role-Based Permissions
- **Super Admin** (`super/123`): Can promote users to Group Admin, manage all users
- **Group Admin**: Can create groups, manage group members, create channels, ban users
- **User**: Can join groups, view channels (unless banned)

### ✅ Groups & Channels
- **Create Groups**: Group admins can create new groups
- **Join Groups**: Users can be added to groups by group admins
- **Create Channels**: Group admins can create channels within their groups
- **View Channels**: Users can view channels they have access to
- **Ban Users**: Group admins can ban users from specific channels

### ✅ Navigation & Routing
- **Protected Routes**: AuthGuard ensures only logged-in users access protected pages
- **Role-Based Access**: RoleGuard restricts admin panel to super/group admins
- **Dynamic Navigation**: Navbar adapts based on login state and user role

## 🛠️ Technology Stack

### Frontend
- **Angular 17**: Modern frontend framework with standalone components
- **Bootstrap 5**: Responsive UI components and styling
- **TypeScript**: Type-safe JavaScript development
- **Angular Router**: Client-side routing with guards

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **CORS**: Cross-origin resource sharing for development
- **JSON APIs**: RESTful API endpoints

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd SoftwareFrameworksA1
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd server
npm install
```

#### Frontend Dependencies
```bash
cd client
npm install
```

### 3. Start the Application

#### Start the Backend Server
```bash
cd server
npm start
# or
node server.js
```
The server will run on `http://localhost:3000`

#### Start the Frontend Application
```bash
cd client
npm start
# or
ng serve
```
The application will run on `http://localhost:4200`

### 4. Access the Application
Open your browser and navigate to `http://localhost:4200`

## 🔐 Default Credentials

- **Super Admin**: `super` / `123`
- **Demo Users**: Create additional users through the registration page

## 📋 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/users` - Get all users (admin only)

### Groups
- `POST /api/groups` - Create new group
- `GET /api/users/:userId/groups` - Get user's groups
- `POST /api/groups/:groupId/members` - Add user to group
- `POST /api/groups/:groupId/promote` - Promote user to group admin

### Channels
- `POST /api/groups/:groupId/channels` - Create channel in group
- `GET /api/groups/:groupId/channels` - Get group's channels
- `POST /api/channels/:channelId/ban` - Ban user from channel

## 🏗️ Project Structure

```
SoftwareFrameworksA1/
├── client/                 # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Angular components
│   │   │   ├── services/       # Business logic services
│   │   │   ├── guards/         # Route guards
│   │   │   └── models/         # TypeScript interfaces
│   │   └── main.ts
│   └── package.json
├── server/                # Node.js backend
│   ├── server.js         # Express server
│   └── package.json
└── README.md
```

## 🎯 Key Components

### Frontend Components
- **LoginComponent**: User authentication
- **RegisterComponent**: User registration
- **DashboardComponent**: Main dashboard with groups overview
- **AdminPanelComponent**: User management for super admins
- **GroupDetailComponent**: Group management and channels
- **ChannelViewComponent**: Channel view (placeholder for Phase 2)
- **NavbarComponent**: Navigation and user info

### Services
- **AuthService**: Authentication and session management
- **StorageService**: LocalStorage wrapper
- **ApiService**: HTTP client for backend communication

### Guards
- **AuthGuard**: Protects routes requiring authentication
- **RoleGuard**: Protects admin routes based on user roles

## 🔒 Security Features

- **Input Validation**: Server-side validation for all inputs
- **Role-Based Access Control**: Different permissions based on user roles
- **Route Protection**: Guards prevent unauthorized access
- **Session Management**: Secure session handling

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and mobile devices
- **Bootstrap Styling**: Modern, clean interface
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages for actions
- **Loading States**: Visual feedback during API calls

## 🚧 Phase 2 Preview

The application is designed to be extended in Phase 2 with:
- Real-time chat functionality
- WebSocket integration
- Message persistence
- File sharing
- Advanced user management

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the port in `server/server.js` (line 18)
   - Update the base URL in `client/src/app/services/api.service.ts`

2. **CORS Errors**
   - Ensure the server is running on port 3000
   - Check that CORS is properly configured in `server/server.js`

3. **Build Errors**
   - Run `npm install` in both client and server directories
   - Clear node_modules and reinstall if needed

### Development Tips

- Use browser developer tools to debug frontend issues
- Check server console for backend errors
- Use the Network tab to monitor API calls
- Clear browser cache if changes don't appear

## 📝 License

This project is created for educational purposes as part of the 3813ICT Software Frameworks course.

## 🤝 Contributing

This is a course assignment. For educational purposes only.

---

**Built with ❤️ using Angular and Node.js**