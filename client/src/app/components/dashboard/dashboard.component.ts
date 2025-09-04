import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <div class="row">
        <div class="col-md-8">
          <h1 class="mb-3">Dashboard</h1>
          <p>Welcome, {{ user?.username }}!</p>
          <p>Role: {{ getPrimaryRole() }}</p>
          
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">My Groups</h5>
              <button *ngIf="canCreateGroups()" class="btn btn-primary btn-sm" (click)="showCreateGroup = true">
                Create Group
              </button>
            </div>
            <div class="card-body">
              <div *ngIf="groups.length === 0" class="text-muted">
                No groups yet. {{ canCreateGroups() ? 'Create your first group!' : 'Ask a group admin to add you to a group.' }}
              </div>
              <div *ngFor="let group of groups" class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                  <h6 class="mb-1">{{ group.name }}</h6>
                  <small class="text-muted">
                    Members: {{ group.memberIds.length }} | 
                    Admins: {{ group.adminIds.length }}
                  </small>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-primary btn-sm" (click)="viewGroup(group.id)">
                    View Details
                  </button>
                  <button class="btn btn-outline-warning btn-sm" (click)="leaveGroup(group.id)">
                    Leave Group
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Create Group Form -->
          <div *ngIf="showCreateGroup" class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Create New Group</h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="createGroup()" class="vstack gap-3">
                <div>
                  <label class="form-label">Group Name</label>
                  <input class="form-control" [(ngModel)]="newGroupName" name="groupName" required>
                </div>
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-primary">Create Group</button>
                  <button type="button" class="btn btn-secondary" (click)="showCreateGroup = false">Cancel</button>
                </div>
                <div *ngIf="groupError" class="text-danger">{{ groupError }}</div>
                <div *ngIf="groupSuccess" class="text-success">{{ groupSuccess }}</div>
              </form>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Quick Actions</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button *ngIf="isSuperAdmin()" class="btn btn-outline-primary" (click)="goToAdmin()">
                  Admin Panel
                </button>
                <button class="btn btn-outline-info" (click)="showBrowseGroups = true">
                  Browse Groups
                </button>
                <button class="btn btn-outline-danger" (click)="showDeleteAccount = true">
                  Delete Account
                </button>
                <button class="btn btn-outline-secondary" (click)="logout()">
                  Logout
                </button>
              </div>
            </div>
          </div>

          <!-- Browse Groups -->
          <div *ngIf="showBrowseGroups" class="card mt-3">
            <div class="card-header">
              <h5 class="mb-0">Browse All Groups</h5>
            </div>
            <div class="card-body">
              <div *ngIf="allGroups.length === 0" class="text-muted">
                No groups available.
              </div>
              <div *ngFor="let group of availableGroups" class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                  <h6 class="mb-1">{{ group.name }}</h6>
                  <small class="text-muted">
                    Members: {{ group.memberIds.length }}
                  </small>
                </div>
                <ng-container *ngIf="!isSuperAdmin(); else superHasAccess">
                  <button class="btn btn-outline-success btn-sm" (click)="requestToJoinGroup(group.id)">
                    Request to Join
                  </button>
                </ng-container>
                <ng-template #superHasAccess>
                  <span class="text-muted">Super admin has access</span>
                </ng-template>
              </div>
              <div class="mt-3">
                <button class="btn btn-secondary" (click)="showBrowseGroups = false">Close</button>
              </div>
              <div *ngIf="browseError" class="text-danger mt-2">{{ browseError }}</div>
              <div *ngIf="browseSuccess" class="text-success mt-2">{{ browseSuccess }}</div>
            </div>
          </div>

          <!-- Delete Account -->
          <div *ngIf="showDeleteAccount" class="card mt-3">
            <div class="card-header">
              <h5 class="mb-0">Delete Account</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-danger">
                <strong>Warning:</strong> This action cannot be undone. You will be removed from all groups and channels.
              </div>
              <form (ngSubmit)="deleteAccount()" class="vstack gap-3">
                <div>
                  <label class="form-label">Confirm Password</label>
                  <input class="form-control" type="password" [(ngModel)]="deletePassword" name="deletePassword" required>
                </div>
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-danger">Delete Account</button>
                  <button type="button" class="btn btn-secondary" (click)="showDeleteAccount = false">Cancel</button>
                </div>
                <div *ngIf="deleteError" class="text-danger">{{ deleteError }}</div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  groups: Group[] = [];
  allGroups: Group[] = [];
  showCreateGroup = false;
  newGroupName = '';
  groupError = '';
  groupSuccess = '';
  
  showBrowseGroups = false;
  browseError = '';
  browseSuccess = '';
  
  showDeleteAccount = false;
  deletePassword = '';
  deleteError = '';

  constructor(
    private auth: AuthService, 
    private api: ApiService, 
    private router: Router
  ) {
    this.user = this.auth.currentUser();
  }

  ngOnInit() {
    this.loadGroups();
    this.loadAllGroups();
  }

  loadGroups() {
    if (this.user) {
      this.api.getUserGroups(this.user.id).subscribe({
        next: (groups) => {
          this.groups = groups;
        },
        error: (error) => {
          console.error('Error loading groups:', error);
        }
      });
    }
  }

  createGroup() {
    if (!this.newGroupName.trim()) {
      this.groupError = 'Group name is required';
      return;
    }

    if (!this.user) {
      this.groupError = 'User not found';
      return;
    }

    this.groupError = '';
    this.api.createGroup(this.newGroupName.trim(), this.user.id).subscribe({
      next: (group) => {
        this.groupSuccess = 'Group created successfully!';
        this.newGroupName = '';
        this.showCreateGroup = false;
        this.loadGroups(); // Reload groups
        setTimeout(() => this.groupSuccess = '', 3000);
      },
      error: (error) => {
        this.groupError = error.error?.msg || 'Failed to create group';
      }
    });
  }

  viewGroup(groupId: string) {
    this.router.navigate(['/group', groupId]);
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  canCreateGroups(): boolean {
    return this.user ? (this.user.roles.includes('super') || this.user.roles.includes('groupAdmin')) : false;
  }

  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }

  loadAllGroups() {
    this.api.getAllGroups().subscribe({
      next: (groups) => {
        this.allGroups = groups;
      },
      error: (error) => {
        console.error('Error loading all groups:', error);
      }
    });
  }

  get availableGroups(): Group[] {
    if (!this.user) return [];
    return this.allGroups.filter(group => !group.memberIds.includes(this.user!.id));
  }

  requestToJoinGroup(groupId: string) {
    if (!this.user) return;
    
    this.browseError = '';
    this.api.registerGroupInterest(groupId, this.user.id).subscribe({
      next: (result) => {
        this.browseSuccess = 'Request sent to group admin!';
        setTimeout(() => this.browseSuccess = '', 3000);
      },
      error: (error) => {
        this.browseError = error.error?.msg || 'Failed to send request';
      }
    });
  }

  leaveGroup(groupId: string) {
    if (!this.user) return;
    
    if (confirm('Are you sure you want to leave this group?')) {
      this.api.leaveGroup(this.user.id, groupId).subscribe({
        next: (result) => {
          this.groupSuccess = 'Left group successfully!';
          this.loadGroups(); // Reload groups
          setTimeout(() => this.groupSuccess = '', 3000);
        },
        error: (error) => {
          this.groupError = error.error?.msg || 'Failed to leave group';
        }
      });
    }
  }

  deleteAccount() {
    if (!this.user) return;
    
    if (!this.deletePassword) {
      this.deleteError = 'Password is required';
      return;
    }
    
    if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      this.api.deleteUserSelf(this.user.id, this.deletePassword).subscribe({
        next: (result) => {
          alert('Account deleted successfully. You will be logged out.');
          this.auth.logout();
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.deleteError = error.error?.msg || 'Failed to delete account';
        }
      });
    }
  }

  getPrimaryRole(): string {
    if (!this.user || !this.user.roles || this.user.roles.length === 0) {
      return 'User';
    }
    
    // Priority order: super_admin > super > group_admin > groupAdmin > user
    if (this.user.roles.includes('super_admin')) return 'Super Admin';
    if (this.user.roles.includes('super')) return 'Super Admin';
    if (this.user.roles.includes('group_admin')) return 'Group Admin';
    if (this.user.roles.includes('groupAdmin')) return 'Group Admin';
    return 'User';
  }
}