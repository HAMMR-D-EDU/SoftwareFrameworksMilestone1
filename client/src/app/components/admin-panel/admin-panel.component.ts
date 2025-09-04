import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, ApiUser } from '../../services/api.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h1 class="mb-3">Admin Panel</h1>
      
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Global User Management</h5>
            </div>
            <div class="card-body">
              <form *ngIf="isSuperAdmin()" (ngSubmit)="createUser()" class="mb-3 vstack gap-2">
                <h6>Create New User</h6>
                <div>
                  <label class="form-label">Username</label>
                  <input class="form-control" [(ngModel)]="newUsername" name="newUsername" required>
                </div>
                <div>
                  <label class="form-label">Email (optional)</label>
                  <input class="form-control" [(ngModel)]="newEmail" name="newEmail" type="email">
                </div>
                <div>
                  <label class="form-label">Password (optional, default 123)</label>
                  <input class="form-control" [(ngModel)]="newPassword" name="newPassword" type="text" placeholder="123">
                </div>
                <button class="btn btn-sm btn-success" type="submit">Create User</button>
              </form>
              <div *ngIf="users.length === 0" class="text-muted">
                No users found.
              </div>
              <div *ngFor="let user of users" class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                  <h6 class="mb-1">{{ user.username }}</h6>
                  <small class="text-muted">
                    ID: {{ user.id }} | 
                    Roles: {{ user.roles.join(', ') }} | 
                    Groups: {{ user.groups.length }}
                  </small>
                </div>
                <div class="d-flex flex-wrap gap-2" *ngIf="!isTargetSuper(user)">
                  <button 
                    *ngIf="isSuperAdmin()" 
                    class="btn btn-outline-primary btn-sm" 
                    (click)="promoteToSuperAdmin(user.id)">
                    Make Super Admin
                  </button>
                  <button 
                    *ngIf="isSuperAdmin() && user.id !== currentUser?.id" 
                    class="btn btn-outline-danger btn-sm" 
                    (click)="removeUser(user.id)">
                    Delete User
                  </button>
                  <button 
                    *ngIf="isSuperAdmin() && !hasGroupAdmin(user)" 
                    class="btn btn-outline-info btn-sm" 
                    (click)="toggleGroupAdmin(user.id, true)">
                    Promote to Group Admin
                  </button>
                  <button 
                    *ngIf="isSuperAdmin() && hasGroupAdmin(user)" 
                    class="btn btn-outline-secondary btn-sm" 
                    (click)="toggleGroupAdmin(user.id, false)">
                    Demote Group Admin
                  </button>
                  
                </div>
              </div>
              <div *ngIf="adminError" class="text-danger mt-2">{{ adminError }}</div>
              <div *ngIf="adminSuccess" class="text-success mt-2">{{ adminSuccess }}</div>
            </div>
          </div>
        </div>

        <div class="col-md-4" *ngIf="isSuperAdmin()">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Reports from Group Admins</h5>
            </div>
            <div class="card-body">
              <div *ngIf="reports.length === 0" class="text-muted">
                No reports found.
              </div>
              <div *ngFor="let report of reports" class="mb-3 p-2 border rounded">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <h6 class="mb-1">{{ report.subject }}</h6>
                    <p class="mb-1 small">{{ report.message }}</p>
                    <small class="text-muted">
                      Type: {{ report.type }} | 
                      {{ report.timestamp | date:'short' }}
                    </small>
                  </div>
                  <span class="badge bg-warning">{{ report.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  `,
})
export class AdminPanelComponent implements OnInit {
  users: ApiUser[] = [];
  reports: any[] = [];
  currentUser: User | null = null;
  adminError = '';
  adminSuccess = '';
  targetGroupId = '';
  newUsername = '';
  newEmail = '';
  newPassword = '';

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {
    this.currentUser = this.auth.currentUser();
  }

  ngOnInit() {
    this.loadUsers();
    this.loadReports();
  }

  loadUsers() {
    if (this.currentUser) {
      this.api.adminGetUsers(this.currentUser.id).subscribe({
        next: (users) => {
          this.users = users;
        },
        error: () => {
          // Fallback to non-admin endpoint if needed
          this.api.getUsers().subscribe({ next: (u) => this.users = u });
        }
      });
    }
  }

  createUser() {
    this.adminError = '';
    this.adminSuccess = '';
    if (!this.currentUser) return;
    const username = this.newUsername.trim();
    const email = this.newEmail.trim();
    const password = this.newPassword.trim() || undefined;
    if (!username) {
      this.adminError = 'Username is required';
      return;
    }
    this.api.adminCreateUser(this.currentUser.id, username, email || undefined, password).subscribe({
      next: (r) => {
        if (r.ok) {
          this.adminSuccess = `User ${username} created`;
          this.newUsername = '';
          this.newEmail = '';
          this.newPassword = '';
          this.loadUsers();
          setTimeout(() => this.adminSuccess = '', 3000);
        } else {
          this.adminError = r.msg || 'Failed to create user';
        }
      },
      error: (e) => {
        this.adminError = e.error?.msg || 'Failed to create user';
      }
    });
  }

  removeUser(userId: string) {
    if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      if (!this.currentUser) return;
      
      this.api.removeUser(userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.adminSuccess = 'User removed successfully!';
          this.loadUsers(); // Reload users
          setTimeout(() => this.adminSuccess = '', 3000);
        },
        error: (error) => {
          this.adminError = error.error?.msg || 'Failed to remove user';
        }
      });
    }
  }

  promoteToSuperAdmin(userId: string) {
    if (confirm('Are you sure you want to promote this user to Super Admin?')) {
      if (!this.currentUser) return;
      
      this.api.promoteToSuperAdmin(userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.adminSuccess = 'User promoted to Super Admin successfully!';
          this.loadUsers(); // Reload users
          setTimeout(() => this.adminSuccess = '', 3000);
        },
        error: (error) => {
          this.adminError = error.error?.msg || 'Failed to promote user to Super Admin';
        }
      });
    }
  }

  goBack() {
    // Navigate back to dashboard
    window.history.back();
  }

  isSuperAdmin(): boolean {
    return this.currentUser ? this.currentUser.roles.includes('super') : false;
  }

  isTargetSuper(user: ApiUser): boolean {
    return user.roles.includes('super') || user.roles.includes('super_admin');
  }

  hasGroupAdmin(user: ApiUser): boolean {
    return user.roles.includes('group_admin') || user.roles.includes('groupAdmin');
  }

  toggleGroupAdmin(userId: string, promote: boolean) {
    if (!this.currentUser) return;
    this.adminError = '';
    this.api.adminToggleGroupAdmin(userId, this.currentUser.id, promote).subscribe({
      next: (r) => {
        this.adminSuccess = r.msg || (promote ? 'Promoted' : 'Demoted');
        this.loadUsers();
        setTimeout(() => this.adminSuccess = '', 3000);
      },
      error: (e) => {
        this.adminError = e.error?.msg || 'Failed to toggle role';
      }
    });
  }

  // addUserToGroup and removeUserFromGroup removed per request

  loadReports() {
    if (this.currentUser && this.isSuperAdmin()) {
      console.log('Loading reports for user:', this.currentUser.id);
      this.api.getReports(this.currentUser.id).subscribe({
        next: (reports) => {
          console.log('Reports loaded:', reports);
          this.reports = reports;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
        }
      });
    }
  }
}