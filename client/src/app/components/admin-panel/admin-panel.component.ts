import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h1 class="mb-3">Admin Panel</h1>
      <p>Admin features coming soon...</p>
    </div>
  `,
})
export class AdminPanelComponent {}