import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Channel } from '../../services/api.service';

@Component({
  selector: 'app-channel-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1>{{ channel?.name || 'Loading...' }}</h1>
        <button class="btn btn-outline-secondary" (click)="goBack()">Back to Group</button>
      </div>

      <div class="row">
        <div class="col-md-8">
          <!-- Channel Info -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Channel Information</h5>
            </div>
            <div class="card-body">
              <div *ngIf="!channel" class="text-muted">Loading channel information...</div>
              <div *ngIf="channel">
                <p><strong>Channel ID:</strong> {{ channel.id }}</p>
                <p><strong>Group ID:</strong> {{ channel.groupId }}</p>
                <p><strong>Creator ID:</strong> {{ channel.creatorId }}</p>
                <p><strong>Banned Users:</strong> {{ channel.bannedUserIds.length }}</p>
              </div>
            </div>
          </div>

          <!-- Coming Soon Placeholder -->
          <div class="text-center py-5">
            coming soon
          </div>
        </div>
        
        <div class="col-md-4">
          <!-- Channel Actions -->
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Channel Actions</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button *ngIf="canBanUsers()" class="btn btn-outline-warning">
                  Manage Bans
                </button>
                <button class="btn btn-outline-info">
                  Channel Settings
                </button>
                <button class="btn btn-outline-secondary" (click)="goBack()">
                  Back to Group
                </button>
              </div>
            </div>
          </div>

          <!-- Banned Users -->
          <div *ngIf="channel && channel.bannedUserIds.length > 0" class="card mt-3">
            <div class="card-header">
              <h5 class="mb-0">Banned Users</h5>
            </div>
            <div class="card-body">
              <div *ngFor="let bannedUserId of channel.bannedUserIds" class="d-flex justify-content-between align-items-center mb-2">
                <span>{{ bannedUserId }}</span>
                <button *ngIf="canBanUsers()" class="btn btn-outline-success btn-sm">
                  Unban
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ChannelViewComponent implements OnInit {
  groupId = '';
  channelId = '';
  channel: Channel | null = null;
  currentUser: User | null = null;

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
    this.channelId = this.route.snapshot.paramMap.get('cid') ?? '';
    
    if (this.groupId && this.channelId) {
      this.loadChannelData();
    }
  }

  loadChannelData() {
    // Load channel information
    this.api.getGroupChannels(this.groupId).subscribe({
      next: (channels) => {
        this.channel = channels.find(c => c.id === this.channelId) || null;
        
        // Check if user is banned from this channel
        if (this.channel && this.currentUser && this.channel.bannedUserIds.includes(this.currentUser.id)) {
          // Redirect to group page with access denied message
          this.router.navigate(['/group', this.groupId]);
        }
      },
      error: (error) => {
        console.error('Error loading channel:', error);
      }
    });
  }

  goBack() {
    this.router.navigate(['/group', this.groupId]);
  }

  canBanUsers(): boolean {
    // This would need to check if the current user is a group admin
    // For now, we'll return false as this is a placeholder
    return false;
  }
}