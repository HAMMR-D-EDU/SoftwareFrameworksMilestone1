import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { ChannelViewComponent } from './components/channel-view/channel-view.component';
import { GroupDetailComponent } from './components/group-detail/group-detail.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminPanelComponent, canActivate: [AuthGuard, RoleGuard] },
  { path: 'group/:gid', component: GroupDetailComponent, canActivate: [AuthGuard] },
  { path: 'group/:gid/channel/:cid', component: ChannelViewComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];