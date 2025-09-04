import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.auth.currentUser();
    if (user && (user.roles.includes('super') || user.roles.includes('groupAdmin'))) {
      return true;
    }
    this.router.navigateByUrl('/');
    return false;
  }
} 