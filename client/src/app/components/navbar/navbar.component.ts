import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" routerLink="/">MACRO-HARD Teams</a>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
          <div class="navbar-nav ms-auto">
            <!-- Not logged in -->
            <a *ngIf="!user" class="nav-link" routerLink="/login">Login</a>
            <a *ngIf="!user" class="nav-link" routerLink="/register">Register</a>
            
            <!-- Logged in -->
            <div *ngIf="user" class="d-flex align-items-center">
              <span class="navbar-text me-3">Welcome, {{ user.username }}</span>
              <span class="navbar-text me-3">
                <small class="text-light">({{ user.roles.join(', ') }})</small>
              </span>
              <a class="nav-link me-3" routerLink="/">Dashboard</a>
              <a *ngIf="isSuperAdmin()" class="nav-link me-3" routerLink="/admin">Admin Panel</a>
              <button class="btn btn-outline-light btn-sm" (click)="logout()">Logout</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  constructor(private auth: AuthService, private router: Router) {}

  get user() {
    return this.auth.currentUser();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }
}