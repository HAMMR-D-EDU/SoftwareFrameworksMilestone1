import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h1 class="mb-3">Dashboard</h1>
      <p>Welcome, {{ user?.username }}!</p>
      <p>Role: {{ user?.roles?.join(', ') }}</p>
      <button class="btn btn-secondary" (click)="logout()">Logout</button>
    </div>
  `,
})
export class DashboardComponent {
  user: User | null = null;

  constructor(private auth: AuthService) {
    this.user = this.auth.currentUser();
  }

  logout() {
    this.auth.logout();
  }
}