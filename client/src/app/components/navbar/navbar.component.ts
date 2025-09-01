import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" href="#">3813ICT Chat App</a>
        <div class="navbar-nav ms-auto">
          <a *ngIf="!user" class="nav-link" routerLink="/login">Login</a>
          <a *ngIf="!user" class="nav-link" routerLink="/register">Register</a>
          <span *ngIf="user" class="navbar-text me-3">Welcome, {{ user?.username }}</span>
          <button *ngIf="user" class="btn btn-outline-light btn-sm" (click)="logout()">Logout</button>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  user = this.auth.currentUser();

  constructor(private auth: AuthService) {}

  logout() {
    this.auth.logout();
  }
}