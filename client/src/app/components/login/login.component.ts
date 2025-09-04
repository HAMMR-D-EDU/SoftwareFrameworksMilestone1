import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h1 class="mb-3">Login</h1>
      <form (ngSubmit)="submit()" class="vstack gap-3">
        <div>
          <label class="form-label">Username</label>
          <input class="form-control" name="username" [(ngModel)]="username" required>
        </div>
        <div>
          <label class="form-label">Password</label>
          <input class="form-control" type="password" name="password" [(ngModel)]="password" required>
        </div>
        <button class="btn btn-primary" type="submit">Login</button>
        <div class="text-danger">{{ error }}</div>
      </form>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  submit() {
    this.error = '';
    this.api.login({ username: this.username, password: this.password }).subscribe({
      next: (user) => {
        // Store the user in LocalStorage for the frontend
        this.auth.storeUser(user);
        this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.error = 'Those credentials do not match';
      }
    });
  }
}