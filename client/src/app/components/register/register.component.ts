import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h1 class="mb-3">Register</h1>
      <form (ngSubmit)="submit()" class="vstack gap-3">
        <div>
          <label class="form-label">Username</label>
          <input class="form-control" name="username" [(ngModel)]="username" required>
        </div>
        <div>
          <label class="form-label">Password</label>
          <input class="form-control" type="password" name="password" [(ngModel)]="password" required>
        </div>
        <div>
          <label class="form-label">Email (Optional)</label>
          <input class="form-control" type="email" name="email" [(ngModel)]="email">
        </div>
        <button class="btn btn-primary" type="submit">Register</button>
        <div class="text-danger">{{ error }}</div>
        <div class="text-success">{{ success }}</div>
      </form>
    </div>
  `,
})
export class RegisterComponent {
  username = '';
  password = '';
  email = '';
  error = '';
  success = '';

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  submit() {
    this.error = '';
    this.success = '';
    
    this.api.register({ username: this.username, password: this.password, email: this.email }).subscribe({
      next: (result) => {
        if (result.ok) {
          this.success = 'Account created! Please login.';
          setTimeout(() => this.router.navigateByUrl('/login'), 2000);
        } else {
          this.error = result.msg || 'Registration failed';
        }
      },
      error: (error) => {
        this.error = error.error?.msg || 'Registration failed';
      }
    });
  }
}