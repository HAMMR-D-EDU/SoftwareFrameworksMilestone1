import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group, Channel } from '../../services/api.service';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <div class="row">
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h1>{{ group?.name || 'Loading...' }}</h1>
            <div class="d-flex gap-2">
              <button *ngIf="canDeleteGroup()" class="btn btn-outline-danger" (click)="deleteGroup()">
                Delete Group
              </button>
              <button class="btn btn-outline-secondary" (click)="goBack()">Back to Dashboard</button>
            </div>
          </div>

          <!-- Group Info -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Group Information</h5>
            </div>
            <div class="card-body">
              <div *ngIf="!group" class="text-muted">Loading group information...</div>
              <div *ngIf="group">
                <p><strong>Group ID:</strong> {{ group.id }}</p>
                <p><strong>Members:</strong> {{ group.memberIds.length }}</p>
                <p><strong>Admins:</strong> {{ group.adminIds.length }}</p>
                <p><strong>Your Role:</strong> {{ getUserRole() }}</p>
              </div>
            </div>
          </div>

          <!-- Channels -->
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Channels</h5>
              <button *ngIf="canCreateChannels()" class="btn btn-primary btn-sm" (click)="showCreateChannel = true">
                Create Channel
              </button>
            </div>
            <div class="card-body">
              <div *ngIf="channels.length === 0" class="text-muted">
                No channels yet. {{ canCreateChannels() ? 'Create your first channel!' : 'Ask a group admin to create a channel.' }}
              </div>
              <div *ngFor="let channel of channels" class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                  <h6 class="mb-1">{{ channel.name }}</h6>
                  <small class="text-muted">
                    ID: {{ channel.id }} | 
                    Banned Users: {{ channel.bannedUserIds.length }}
                  </small>
                </div>
                <div class="d-flex gap-2">
                  <button 
                    *ngIf="!isBannedFromChannel(channel)" 
                    class="btn btn-outline-primary btn-sm" 
                    (click)="viewChannel(channel.id)">
                    View Channel
                  </button>
                  <span *ngIf="isBannedFromChannel(channel)" class="text-danger">
                    Access Denied
                  </span>
                  <button 
                    *ngIf="canBanUsers(channel)" 
                    class="btn btn-outline-warning btn-sm" 
                    (click)="openBanForm(channel)">
                    Ban User
                  </button>
                  <button 
                    *ngIf="canDeleteChannels()" 
                    class="btn btn-outline-danger btn-sm" 
                    (click)="deleteChannel(channel.id)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Create Channel Form -->
          <div *ngIf="showCreateChannel" class="card mt-4">
            <div class="card-header">
              <h5 class="mb-0">Create New Channel</h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="createChannel()" class="vstack gap-3">
                <div>
                  <label class="form-label">Channel Name</label>
                  <input class="form-control" [(ngModel)]="newChannelName" name="channelName" required>
                </div>
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-primary">Create Channel</button>
                  <button type="button" class="btn btn-secondary" (click)="showCreateChannel = false">Cancel</button>
                </div>
                <div *ngIf="channelError" class="text-danger">{{ channelError }}</div>
                <div *ngIf="channelSuccess" class="text-success">{{ channelSuccess }}</div>
              </form>
            </div>
          </div>

          <!-- Pending Join Requests (Group Admins) -->
          <div *ngIf="canManageRequests()" class="card mt-4">
            <div class="card-header">
              <h5 class="mb-0">Pending Join Requests</h5>
            </div>
            <div class="card-body">
              <div *ngIf="interests.length === 0" class="text-muted">No pending requests.</div>
              <div *ngFor="let interest of interests" class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                  <div><strong>Request ID:</strong> {{ interest.id }}</div>
                  <small class="text-muted">User: {{ interest.user?.username || interest.userId }} | {{ interest.timestamp }}</small>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-success btn-sm" (click)="approveInterest(interest.id)">Approve</button>
                  <button class="btn btn-outline-danger btn-sm" (click)="rejectInterest(interest.id)">Reject</button>
                </div>
              </div>
              <div *ngIf="requestError" class="text-danger">{{ requestError }}</div>
              <div *ngIf="requestSuccess" class="text-success">{{ requestSuccess }}</div>
            </div>
          </div>

          <!-- Ban User Form -->
          <div *ngIf="showBanForm" class="card mt-4">
            <div class="card-header">
              <h5 class="mb-0">Ban User from {{ selectedChannel?.name }}</h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="banUser()" class="vstack gap-3">
                <div>
                  <label class="form-label">Select User to Ban</label>
                  <select class="form-select" [(ngModel)]="selectedUserId" name="userId" required>
                    <option value="">Choose a user...</option>
                    <option *ngFor="let member of groupMembers" [value]="member.id">
                      {{ member.username }}
                    </option>
                  </select>
                </div>
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-warning">Ban User</button>
                  <button type="button" class="btn btn-secondary" (click)="cancelBan()">Cancel</button>
                </div>
                <div *ngIf="banError" class="text-danger">{{ banError }}</div>
                <div *ngIf="banSuccess" class="text-success">{{ banSuccess }}</div>
              </form>
            </div>
          </div>


        </div>
        
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Group Members</h5>
            </div>
            <div class="card-body">
              <div *ngIf="groupMembers.length === 0" class="text-muted">
                No members found.
              </div>
              <div *ngFor="let member of groupMembers" class="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <strong>{{ member.username }}</strong>
                  <br>
                  <small class="text-muted">{{ member.roles.join(', ') }}</small>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  <span *ngIf="isGroupAdmin(member.id)" class="badge bg-warning">Admin</span>
                  <button 
                    *ngIf="canPromoteToGroupAdmin(member.id)" 
                    class="btn btn-outline-warning btn-sm" 
                    (click)="promoteToGroupAdmin(member.id)">
                    Promote to Admin
                  </button>
                  <button 
                    *ngIf="canReportUser(member)" 
                    class="btn btn-outline-secondary btn-sm" 
                    (click)="reportUser(member.id)">
                    Report User
                  </button>
                  <button 
                    *ngIf="canRemoveUsers() && member.id !== currentUser?.id && !isSuperUser(member)" 
                    class="btn btn-outline-danger btn-sm" 
                    (click)="removeUserFromGroup(member.id)">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GroupDetailComponent implements OnInit {
  groupId = '';
  group: Group | null = null;
  channels: Channel[] = [];
  groupMembers: any[] = [];
  currentUser: User | null = null;
  interests: any[] = [];
  
  showCreateChannel = false;
  newChannelName = '';
  channelError = '';
  channelSuccess = '';
  
  showBanForm = false;
  selectedChannel: Channel | null = null;
  selectedUserId = '';
  banError = '';
  banSuccess = '';
  requestError = '';
  requestSuccess = '';


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private api: ApiService
  ) {
    this.currentUser = this.auth.currentUser();
  }

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('gid') ?? '';
    if (this.groupId) {
      this.loadGroupData();
    }
  }

  loadGroupData() {
    // Load group information
    this.api.getUserGroups(this.currentUser?.id || '').subscribe({
      next: (groups) => {
        this.group = groups.find(g => g.id === this.groupId) || null;
        if (this.group) {
          this.loadChannels();
          this.loadGroupMembers();
          this.loadInterests();
        }
      },
      error: (error) => {
        console.error('Error loading group:', error);
      }
    });
  }

  loadChannels() {
    if (this.group) {
      const uid = this.currentUser?.id || '';
      this.api.getGroupChannelsForUser(this.group.id, uid).subscribe({
        next: (channels) => {
          this.channels = channels;
        },
        error: (error) => {
          console.error('Error loading channels:', error);
        }
      });
    }
  }

  loadGroupMembers() {
    if (!this.group) return;
    this.api.getGroupMembers(this.group.id).subscribe({
      next: (members) => {
        this.groupMembers = members;
      },
      error: (error) => {
        console.error('Error loading members:', error);
      }
    });
  }

  loadInterests() {
    if (!this.group) return;
    this.api.getGroupInterests(this.group.id).subscribe({
      next: (interests) => {
        this.interests = interests;
      },
      error: (error) => {
        console.error('Error loading interests:', error);
      }
    });
  }

  createChannel() {
    if (!this.newChannelName.trim()) {
      this.channelError = 'Channel name is required';
      return;
    }

    if (!this.currentUser || !this.group) {
      this.channelError = 'User or group not found';
      return;
    }

    this.channelError = '';
    this.api.createChannel(this.group.id, this.newChannelName.trim(), this.currentUser.id).subscribe({
      next: (channel) => {
        this.channelSuccess = 'Channel created successfully!';
        this.newChannelName = '';
        this.showCreateChannel = false;
        this.loadChannels(); // Reload channels
        setTimeout(() => this.channelSuccess = '', 3000);
      },
      error: (error) => {
        this.channelError = error.error?.msg || 'Failed to create channel';
      }
    });
  }

  viewChannel(channelId: string) {
    this.router.navigate(['/group', this.groupId, 'channel', channelId]);
  }

  openBanForm(channel: Channel) {
    this.selectedChannel = channel;
    this.showBanForm = true;
  }

  banUser() {
    if (!this.selectedUserId || !this.selectedChannel || !this.currentUser) {
      this.banError = 'Please select a user to ban';
      return;
    }

    this.banError = '';
    this.api.banUserFromChannel(this.selectedChannel.id, this.selectedUserId, this.currentUser.id).subscribe({
      next: (result) => {
        this.banSuccess = 'User banned successfully!';
        this.selectedUserId = '';
        this.showBanForm = false;
        this.loadChannels(); // Reload channels
        setTimeout(() => this.banSuccess = '', 3000);
      },
      error: (error) => {
        this.banError = error.error?.msg || 'Failed to ban user';
      }
    });
  }

  cancelBan() {
    this.showBanForm = false;
    this.selectedChannel = null;
    this.selectedUserId = '';
    this.banError = '';
  }

  goBack() {
    this.router.navigate(['/']);
  }

  getUserRole(): string {
    if (!this.group || !this.currentUser) return 'Unknown';
    if (this.group.adminIds.includes(this.currentUser.id)) return 'Group Admin';
    return 'Member';
  }

  canCreateChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.group.adminIds.includes(this.currentUser.id);
  }

  canBanUsers(channel: Channel): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.group.adminIds.includes(this.currentUser.id);
  }

  isGroupAdmin(userId: string): boolean {
    return this.group?.adminIds.includes(userId) || false;
  }

  isBannedFromChannel(channel: Channel): boolean {
    if (!this.currentUser) return false;
    return channel.bannedUserIds.includes(this.currentUser.id);
  }

  canDeleteGroup(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.creatorId === this.currentUser.id;
  }

  canDeleteChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  canRemoveUsers(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  canManageRequests(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  approveInterest(interestId: string) {
    if (!this.group || !this.currentUser) return;
    this.requestError = '';
    this.api.approveGroupInterest(this.group.id, interestId, this.currentUser.id).subscribe({
      next: () => {
        this.requestSuccess = 'Request approved and user added!';
        this.loadGroupData();
        setTimeout(() => this.requestSuccess = '', 3000);
      },
      error: (error) => {
        this.requestError = error.error?.msg || 'Failed to approve request';
      }
    });
  }

  rejectInterest(interestId: string) {
    if (!this.group || !this.currentUser) return;
    this.requestError = '';
    this.api.rejectGroupInterest(this.group.id, interestId, this.currentUser.id).subscribe({
      next: () => {
        this.requestSuccess = 'Request rejected';
        this.loadInterests();
        setTimeout(() => this.requestSuccess = '', 3000);
      },
      error: (error) => {
        this.requestError = error.error?.msg || 'Failed to reject request';
      }
    });
  }

  isSuperUser(member: any): boolean {
    return Array.isArray(member?.roles) && (member.roles.includes('super') || member.roles.includes('super_admin'));
  }

  isSuperAdmin(): boolean {
    return this.currentUser ? (this.currentUser.roles.includes('super') || this.currentUser.roles.includes('super_admin' as any)) : false;
  }

  canReportUser(member: any): boolean {
    if (!this.currentUser || !this.group) return false;
    // Only group admins can report users
    const isGroupAdmin = this.group.adminIds.includes(this.currentUser.id);
    // Can only report regular users (not group admins or super admins)
    const isRegularUser = !this.isGroupAdmin(member.id) && !this.isSuperUser(member);
    return isGroupAdmin && isRegularUser;
  }

  reportUser(userId: string) {
    if (!this.currentUser) return;
    
    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;
    
    console.log('Reporting user:', member.username, 'by:', this.currentUser.username);
    
    this.api.createReport(
      this.currentUser.id,
      `Report: ${member.username}`,
      `User ${member.username} reported by group admin`,
      'user_report'
    ).subscribe({
      next: () => {
        console.log('Report created successfully');
        alert(`User ${member.username} reported to super admins`);
      },
      error: (error) => {
        console.error('Report creation failed:', error);
        alert(error.error?.msg || 'Failed to report user');
      }
    });
  }



  deleteGroup() {
    if (!this.group || !this.currentUser) return;
    
    if (confirm(`Are you sure you want to delete the group "${this.group.name}"? This will also delete all channels and cannot be undone.`)) {
      this.api.removeGroup(this.group.id, this.currentUser.id).subscribe({
        next: (result) => {
          alert('Group deleted successfully!');
          this.router.navigate(['/']);
        },
        error: (error) => {
          alert(error.error?.msg || 'Failed to delete group');
        }
      });
    }
  }

  deleteChannel(channelId: string) {
    if (!this.currentUser) return;
    
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;
    
    if (confirm(`Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`)) {
      this.api.removeChannel(channelId, this.currentUser.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'Channel deleted successfully!';
          this.loadChannels(); // Reload channels
          setTimeout(() => this.channelSuccess = '', 3000);
        },
        error: (error) => {
          this.channelError = error.error?.msg || 'Failed to delete channel';
        }
      });
    }
  }

  removeUserFromGroup(userId: string) {
    if (!this.group || !this.currentUser) return;
    
    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;
    
    if (confirm(`Are you sure you want to remove "${member.username}" from this group?`)) {
      this.api.removeUserFromGroup(this.group.id, userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'User removed from group successfully!';
          this.loadGroupData(); // Reload group data
          setTimeout(() => this.channelSuccess = '', 3000);
        },
        error: (error) => {
          this.channelError = error.error?.msg || 'Failed to remove user from group';
        }
      });
    }
  }

  promoteToGroupAdmin(userId: string) {
    if (!this.group || !this.currentUser) return;

    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;

    if (confirm(`Are you sure you want to promote "${member.username}" to Group Admin of "${this.group.name}"?`)) {
      this.api.promoteUserToGroupAdmin(this.group.id, userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'User promoted to Group Admin successfully!';
          this.loadGroupData(); // Reload group data
          setTimeout(() => this.channelSuccess = '', 3000);
        },
        error: (error) => {
          this.channelError = error.error?.msg || 'Failed to promote user to Group Admin';
        }
      });
    }
  }

  canPromoteToGroupAdmin(userId: string): boolean {
    if (!this.group || !this.currentUser) return false;
    // Only super admins or group admins can promote, and only if the user is not already a group admin
    return (this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id)) && 
           !this.isGroupAdmin(userId);
  }
}