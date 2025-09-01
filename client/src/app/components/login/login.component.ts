import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.auth.login(this.username, this.password)) {
      this.router.navigateByUrl('/');
    } else {
      this.error = 'Those credentials do not match';
    }
  }
}