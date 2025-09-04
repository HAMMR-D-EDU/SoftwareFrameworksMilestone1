import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginDto { 
  username: string; 
  password: string; 
}

export interface RegisterDto { 
  username: string; 
  password: string; 
  email?: string; 
}

export interface ApiUser { 
  id: string; 
  username: string; 
  roles: string[]; 
  groups: string[]; 
  email?: string; 
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  adminIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
  creatorId: string;
  bannedUserIds: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://localhost:3000'; // dev

  constructor(private http: HttpClient) {}

  // Auth endpoints
  login(body: LoginDto): Observable<ApiUser> {
    return this.http.post<ApiUser>(`${this.base}/api/login`, body);
  }

  register(body: RegisterDto): Observable<{ ok: boolean; id?: string; msg?: string }> {
    return this.http.post<{ ok: boolean; id?: string; msg?: string }>(`${this.base}/api/register`, body);
  }

  // User endpoints
  getUsers(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/api/users`);
  }

  // Admin endpoints (super only)
  adminGetUsers(adminId: string): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/admin/users?adminId=${adminId}`);
  }

  adminCreateUser(adminId: string, username: string, email?: string, password?: string): Observable<{ ok: boolean; user?: ApiUser; msg?: string }> {
    return this.http.post<{ ok: boolean; user?: ApiUser; msg?: string }>(`${this.base}/admin/users`, { adminId, username, email, password });
  }

  adminToggleGroupAdmin(userId: string, adminId: string, promote: boolean): Observable<{ ok: boolean; msg?: string }> {
    if (promote) {
      return this.http.patch<{ ok: boolean; msg?: string }>(`${this.base}/admin/users/${userId}/role`, { add: 'group_admin', adminId });
    }
    return this.http.patch<{ ok: boolean; msg?: string }>(`${this.base}/admin/users/${userId}/role`, { remove: 'group_admin', adminId });
  }

  adminAddUserToGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/admin/groups/${groupId}/members`, { userId, adminId });
  }

  adminRemoveUserFromGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/admin/groups/${groupId}/members/${userId}?adminId=${adminId}`);
  }

  // Group endpoints
  createGroup(name: string, creatorId: string): Observable<Group> {
    return this.http.post<Group>(`${this.base}/api/groups`, { name, creatorId });
  }

  getUserGroups(userId: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.base}/api/users/${userId}/groups`);
  }

  addUserToGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/members`, { userId, adminId });
  }

  promoteUserToGroupAdmin(groupId: string, userId: string, promoterId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/promote`, { userId, promoterId });
  }

  // Channel endpoints
  createChannel(groupId: string, name: string, creatorId: string): Observable<Channel> {
    return this.http.post<Channel>(`${this.base}/api/groups/${groupId}/channels`, { name, creatorId });
  }

  getGroupChannels(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.base}/api/groups/${groupId}/channels`);
  }

  getGroupChannelsForUser(groupId: string, userId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.base}/api/groups/${groupId}/channels`, { params: { userId } as any });
  }

  addUserToChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/members`, { userId, adminId });
  }

  removeUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/members/${userId}`, { body: { adminId } });
  }

  banUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/ban`, { userId, adminId });
  }

  // Additional user management endpoints
  removeUser(userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}`, { body: { adminId } });
  }

  promoteToSuperAdmin(userId: string, promoterId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/promote-super`, { promoterId });
  }

  deleteUserSelf(userId: string, password: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/self`, { body: { password } });
  }

  // Additional group management endpoints
  removeGroup(groupId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}`, { body: { adminId } });
  }

  removeUserFromGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/members/${userId}`, { body: { adminId } });
  }

  leaveGroup(userId: string, groupId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/groups/${groupId}`);
  }

  registerGroupInterest(groupId: string, userId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interest`, { userId });
  }

  getGroupInterests(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/groups/${groupId}/interests`);
  }

  approveGroupInterest(groupId: string, interestId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interests/${interestId}/approve`, { adminId });
  }

  rejectGroupInterest(groupId: string, interestId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interests/${interestId}`, { body: { adminId } });
  }

  getGroupMembers(groupId: string): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/api/groups/${groupId}/members`);
  }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.base}/api/groups`);
  }

  // Additional channel management endpoints
  removeChannel(channelId: string, adminId: string, groupId?: string): Observable<{ ok: boolean; msg?: string }> {
    // Prefer new route with groupId if provided
    if (groupId) {
      return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/channels/${channelId}`, { body: { adminId } });
    }
    // legacy fallback (will likely 404 after changes)
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/channels/${channelId}`, { body: { adminId } });
  }

  unbanUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/ban/${userId}`, { body: { adminId } });
  }

  // Reporting endpoints
  createReport(reporterId: string, subject: string, message: string, type: string, relatedUserId?: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/reports`, { reporterId, subject, message, type, relatedUserId });
  }

  getReports(adminId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/reports?adminId=${adminId}`);
  }
} 