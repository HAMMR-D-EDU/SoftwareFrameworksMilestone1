const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());           // allow :4200 → :3000 during dev
app.use(express.json());   // parse JSON bodies

// In-memory data storage with JSON file persistence
let users = [
  { id: 'u_1', username: 'super', password: '123', email: '', roles: ['super', 'super_admin'], groups: [] },
  { id: 'u_2', username: '1', password: '123', email: '', roles: ['user'], groups: [] },
  { id: 'u_3', username: '2', password: '123', email: '', roles: ['user'], groups: [] },
];
let groups = [];
let channels = [];
let groupInterests = []; // For users requesting to join groups
let reports = []; // For group admin reports to super admins

const DATA_FILE = path.join(__dirname, 'data.json');

function loadDataFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.users)) users = parsed.users;
      if (Array.isArray(parsed.groups)) groups = parsed.groups;
      if (Array.isArray(parsed.channels)) channels = parsed.channels;
      if (Array.isArray(parsed.groupInterests)) groupInterests = parsed.groupInterests;
      if (Array.isArray(parsed.reports)) reports = parsed.reports;
    }
  } catch (err) {
    console.error('Failed to load data.json:', err);
  }
}

function saveDataToDisk() {
  const payload = {
    users,
    groups,
    channels,
    groupInterests,
    reports,
  };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write data.json:', err);
  }
}

// Load existing data on server startup
loadDataFromDisk();

// Health check (quick test)
app.get('/health', (req, res) => res.json({ ok: true }));

// Simple API route
app.post('/api/echo', (req, res) => {
  // echoes back whatever JSON you sent
  res.status(200).json({ youSent: req.body });
});

// ==================== AUTH ENDPOINTS ====================

// Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Return a sanitised object (no password)
  const { password: _, ...safe } = user;
  res.json(safe);
});

// Register API
app.post('/api/register', (req, res) => {
  const { username, password, email = '' } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  if (users.some(u => u.username === username)) return res.status(409).json({ ok: false, msg: 'Username exists' });
  const id = `u_${users.length + 1}`;
  users.push({ id, username, password, email, roles: ['user'], groups: [] });
  saveDataToDisk();
  res.status(201).json({ ok: true, id });
});

// ==================== USER ENDPOINTS ====================
// ADMIN: list all users (super only)
app.get('/admin/users', (req, res) => {
  const adminId = req.query.adminId;
  const admin = users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can view users' });
  }
  const safe = users.map(({ password, ...u }) => u);
  res.json(safe);
});

// ADMIN: create user (super only)
app.post('/admin/users', (req, res) => {
  const { adminId, username, email = '', password = '123' } = req.body || {};
  const admin = users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can create users' });
  }
  if (!username) return res.status(400).json({ ok: false, msg: 'Username is required' });
  if (users.some(u => u.username === username)) return res.status(409).json({ ok: false, msg: 'Username exists' });
  const id = `u_${users.length + 1}`;
  users.push({ id, username, password, email, roles: ['user'], groups: [] });
  saveDataToDisk();
  const { password: _pw, ...safe } = users.find(u => u.id === id) || {};
  return res.status(201).json({ ok: true, user: safe });
});

// ADMIN: toggle group_admin role (add/remove) (super only)
app.patch('/admin/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { add, remove, adminId } = req.body || {};
  const admin = users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can modify roles' });
  }
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

  if (add === 'group_admin') {
    if (!user.roles.includes('group_admin')) user.roles.push('group_admin');
    if (!user.roles.includes('groupAdmin')) user.roles.push('groupAdmin'); // legacy alias
    // Add as admin to all groups the user is already a member of
    groups.forEach(g => {
      if (g.memberIds.includes(user.id) && !g.adminIds.includes(user.id)) {
        g.adminIds.push(user.id);
      }
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User promoted to group_admin' });
  }
  if (remove === 'group_admin') {
    user.roles = user.roles.filter(r => r !== 'group_admin' && r !== 'groupAdmin');
    // Remove admin privileges from all groups (keep membership)
    groups.forEach(g => {
      g.adminIds = g.adminIds.filter(aid => aid !== user.id);
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User demoted from group_admin' });
  }
  return res.status(400).json({ ok: false, msg: 'Specify add or remove for role' });
});

// ADMIN: add/remove user to/from any group (super only)
app.post('/admin/groups/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const { userId, adminId } = req.body || {};
  const admin = users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can add members' });
  }
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  if (group.memberIds.includes(userId)) return res.status(409).json({ ok: false, msg: 'Already a member' });
  group.memberIds.push(userId);
  // If the user is a global group admin, grant group admin privileges automatically
  const addedUser = users.find(u => u.id === userId);
  if (addedUser && (addedUser.roles.includes('group_admin') || addedUser.roles.includes('groupAdmin'))) {
    if (!group.adminIds.includes(userId)) group.adminIds.push(userId);
  }
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

app.delete('/admin/groups/:groupId/members/:userId', (req, res) => {
  const { groupId, userId } = req.params;
  const adminId = req.query.adminId;
  const admin = users.find(u => u.id === adminId);
  if (!admin || !(admin.roles.includes('super') || admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can remove members' });
  }
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from group' });
});

// Get all users (for admin panel)
app.get('/api/users', (req, res) => {
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

// Remove user (Super Admin only)
app.delete('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { adminId } = req.body || {};
  
  const admin = users.find(u => u.id === adminId);
  if (!admin || !admin.roles.includes('super')) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can remove users' });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  // Remove user from all groups
  groups.forEach(group => {
    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);
  });
  
  // Remove user from all channels (as banned user)
  channels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  });
  
  users.splice(userIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed successfully' });
});

// Promote user to Super Admin (Super Admin only)
app.post('/api/users/:userId/promote-super', (req, res) => {
  const { userId } = req.params;
  const { promoterId } = req.body || {};
  
  const promoter = users.find(u => u.id === promoterId);
  if (!promoter || !(promoter.roles.includes('super') || promoter.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can promote to super admin' });
  }
  
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (!user.roles.includes('super') && !user.roles.includes('super_admin')) {
    user.roles.push('super');
    user.roles.push('super_admin');
    // Add new super admin to all existing groups as member and admin
    groups.forEach(g => {
      if (!g.memberIds.includes(user.id)) g.memberIds.push(user.id);
      if (!g.adminIds.includes(user.id)) g.adminIds.push(user.id);
    });
    saveDataToDisk();
    return res.json({ ok: true, msg: 'User promoted to super admin' });
  }
  return res.json({ ok: true, msg: 'User is already a super admin' });
});

// User deletes themselves
app.delete('/api/users/:userId/self', (req, res) => {
  const { userId } = req.params;
  const { password } = req.body || {};
  
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (user.password !== password) {
    return res.status(401).json({ ok: false, msg: 'Incorrect password' });
  }
  
  // Remove user from all groups
  groups.forEach(group => {
    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);
  });
  
  // Remove user from all channels (as banned user)
  channels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  });
  
  const userIndex = users.findIndex(u => u.id === userId);
  users.splice(userIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User account deleted successfully' });
});

// ==================== GROUP ENDPOINTS ====================

// Create group (Group Admin only). ownerId is the creator; only owner can manage.
app.post('/api/groups', (req, res) => {
  const { name, creatorId } = req.body || {};
  if (!name || !creatorId) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  if (groups.some(g => g.name === name)) return res.status(409).json({ ok: false, msg: 'Group name exists' });

  const creator = users.find(u => u.id === creatorId);
  if (!creator) return res.status(404).json({ ok: false, msg: 'Creator not found' });
  const isGroupAdmin = creator.roles.includes('groupAdmin') || creator.roles.includes('group_admin');
  const isSuperAdmin = creator.roles.includes('super') || creator.roles.includes('super_admin');
  if (!isGroupAdmin && !isSuperAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create groups' });
  }

  const group = {
    id: `g_${groups.length + 1}`,
    name,
    ownerId: creatorId,
    creatorId, // keep legacy for compatibility
    memberIds: [creatorId],
    adminIds: [creatorId]
  };
  
  // Ensure all super admins have access and admin privileges to every new group
  const superAdmins = users.filter(u => u.roles.includes('super') || u.roles.includes('super_admin'));
  superAdmins.forEach(sa => {
    if (!group.memberIds.includes(sa.id)) group.memberIds.push(sa.id);
    if (!group.adminIds.includes(sa.id)) group.adminIds.push(sa.id);
  });
  groups.push(group);
  saveDataToDisk();
  res.status(201).json(group);
});

// Get groups for user
app.get('/api/users/:userId/groups', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (user && (user.roles.includes('super') || user.roles.includes('super_admin'))) {
    // Super admins see all groups
    return res.json(groups);
  }
  const userGroups = groups.filter(g => g.memberIds.includes(userId));
  res.json(userGroups);
});

// Get all groups (for admin panel)
app.get('/api/groups', (req, res) => {
  res.json(groups);
});

// Add user to group
app.post('/api/groups/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const { userId, adminId } = req.body || {};
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can add members' });
  }
  
  if (group.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already a member' });
  }
  
  group.memberIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

// Remove user from group (Group Admin or Super Admin)
app.delete('/api/groups/:groupId/members/:userId', (req, res) => {
  const { groupId, userId } = req.params;
  const { adminId } = req.body || {};
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  const isAdminSuper = admin.roles.includes('super') || admin.roles.includes('super_admin');
  
  // Check if admin can remove users from this group
  if (!isAdminSuper && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admin or super admin can remove users' });
  }
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }

  // Prevent group admins from removing super admins
  const targetUser = users.find(u => u.id === userId);
  const isTargetSuper = targetUser && (targetUser.roles.includes('super') || targetUser.roles.includes('super_admin'));
  if (isTargetSuper && !isAdminSuper) {
    return res.status(403).json({ ok: false, msg: 'Group admins cannot remove super admins from groups' });
  }
  
  // Remove user from group
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  
  // Remove user from all channels in this group (as banned user)
  const groupChannels = channels.filter(c => c.groupId === groupId);
  groupChannels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
    channel.memberIds = (channel.memberIds || []).filter(id => id !== userId);
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from group successfully' });
});

// User leaves group (self-removal)
app.delete('/api/users/:userId/groups/:groupId', (req, res) => {
  const { userId, groupId } = req.params;
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }
  
  // Remove user from group
  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.adminIds = group.adminIds.filter(id => id !== userId);
  
  // Remove user from all channels in this group (as banned user)
  const groupChannels = channels.filter(c => c.groupId === groupId);
  groupChannels.forEach(channel => {
    channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
    channel.memberIds = (channel.memberIds || []).filter(id => id !== userId);
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'User left group successfully' });
});

// Remove group (Only owner or super admin)
app.delete('/api/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { adminId } = req.body || {};
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  // Check if admin can delete this group
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner or super admin can delete group' });
  }
  
  // Remove all channels in this group
  const groupChannels = channels.filter(c => c.groupId === groupId);
  groupChannels.forEach(channel => {
    const channelIndex = channels.findIndex(c => c.id === channel.id);
    if (channelIndex !== -1) channels.splice(channelIndex, 1);
  });
  
  // Remove group
  const groupIndex = groups.findIndex(g => g.id === groupId);
  groups.splice(groupIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Group and all its channels removed successfully' });
});

// Promote user to group admin
app.post('/api/groups/:groupId/promote', (req, res) => {
  const { groupId } = req.params;
  const { userId, promoterId } = req.body || {};
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const promoter = users.find(u => u.id === promoterId);
  if (!promoter) return res.status(404).json({ ok: false, msg: 'Promoter not found' });
  
  // Check if promoter is super admin or group admin of this group
  const isSuperAdmin = promoter.roles.includes('super');
  const isGroupAdmin = group.adminIds.includes(promoterId);
  
  if (!isSuperAdmin && !isGroupAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only super admins or group admins can promote users' });
  }
  
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a member of this group' });
  }
  
  if (group.adminIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is already a group admin' });
  }
  
  // Add groupAdmin role if not already present
  if (!user.roles.includes('groupAdmin')) {
    user.roles.push('groupAdmin');
  }
  
  group.adminIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User promoted to group admin' });
});

// Register interest in group (user requests to join)
app.post('/api/groups/:groupId/interest', (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body || {};
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  if (group.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already a member of this group' });
  }
  
  if (groupInterests.some(i => i.groupId === groupId && i.userId === userId)) {
    return res.status(409).json({ ok: false, msg: 'Interest already registered' });
  }
  
  groupInterests.push({
    id: `i_${groupInterests.length + 1}`,
    groupId,
    userId,
    timestamp: new Date().toISOString()
  });
  saveDataToDisk();
  res.json({ ok: true, msg: 'Interest registered. Group admin will review your request.' });
});

// Get group interests (for group admins)
app.get('/api/groups/:groupId/interests', (req, res) => {
  const { groupId } = req.params;
  const interests = groupInterests.filter(i => i.groupId === groupId);
  res.json(interests);
});

// Approve a group interest (add user to group)
app.post('/api/groups/:groupId/interests/:interestId/approve', (req, res) => {
  const { groupId, interestId } = req.params;
  const { adminId } = req.body || {};

  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });

  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can approve requests' });
  }

  const interestIndex = groupInterests.findIndex(i => i.id === interestId && i.groupId === groupId);
  if (interestIndex === -1) {
    return res.status(404).json({ ok: false, msg: 'Interest not found' });
  }

  const interest = groupInterests[interestIndex];
  if (group.memberIds.includes(interest.userId)) {
    // Already a member; just remove interest
    groupInterests.splice(interestIndex, 1);
    return res.json({ ok: true, msg: 'User already a member; request removed' });
  }

  group.memberIds.push(interest.userId);
  // If the user is a global group admin, grant group admin privileges automatically
  const addedUser = users.find(u => u.id === interest.userId);
  if (addedUser && (addedUser.roles.includes('group_admin') || addedUser.roles.includes('groupAdmin'))) {
    if (!group.adminIds.includes(interest.userId)) group.adminIds.push(interest.userId);
  }
  groupInterests.splice(interestIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to group' });
});

// Reject a group interest (remove without adding)
app.delete('/api/groups/:groupId/interests/:interestId', (req, res) => {
  const { groupId, interestId } = req.params;
  const { adminId } = req.body || {};

  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });

  if (!admin.roles.includes('super') && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can reject requests' });
  }

  const interestIndex = groupInterests.findIndex(i => i.id === interestId && i.groupId === groupId);
  if (interestIndex === -1) {
    return res.status(404).json({ ok: false, msg: 'Interest not found' });
  }

  groupInterests.splice(interestIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Request rejected' });
});

// Get group members (safe user objects)
app.get('/api/groups/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });

  const safeMembers = users
    .filter(u => group.memberIds.includes(u.id))
    .map(({ password, ...safe }) => safe);
  res.json(safeMembers);
});

// ==================== CHANNEL ENDPOINTS ====================

// Create channel (group admin or super admin)
app.post('/api/groups/:groupId/channels', (req, res) => {
  const { groupId } = req.params;
  const { name, creatorId } = req.body || {};
  
  if (!name || !creatorId) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  const creator = users.find(u => u.id === creatorId);
  const isSuperAdmin = creator && (creator.roles.includes('super') || creator.roles.includes('super_admin'));
  const isGroupAdmin = group.adminIds.includes(creatorId);
  if (!isSuperAdmin && !isGroupAdmin) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create channels' });
  }
  
  const existingChannels = channels.filter(c => c.groupId === groupId);
  if (existingChannels.some(c => c.name === name)) {
    return res.status(409).json({ ok: false, msg: 'Channel name exists in this group' });
  }
  
  const channel = {
    id: `c_${channels.length + 1}`,
    name,
    groupId,
    creatorId,
    bannedUserIds: [],
    memberIds: [creatorId]
  };
  // also ensure group owner and super admins have access
  if (!channel.memberIds.includes(group.ownerId)) channel.memberIds.push(group.ownerId);
  users.filter(u => u.roles.includes('super') || u.roles.includes('super_admin')).forEach(sa => {
    if (!channel.memberIds.includes(sa.id)) channel.memberIds.push(sa.id);
  });
  channels.push(channel);
  saveDataToDisk();
  res.status(201).json(channel);
});

// Get channels for group
app.get('/api/groups/:groupId/channels', (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.query;
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  const requester = users.find(u => u.id === userId);
  const isSuperAdmin = requester && (requester.roles.includes('super') || requester.roles.includes('super_admin'));
  const isGroupAdmin = group.adminIds.includes(userId);
  let groupChannels = channels.filter(c => c.groupId === groupId);
  if (!isSuperAdmin && !isGroupAdmin) {
    groupChannels = groupChannels.filter(c => Array.isArray(c.memberIds) && c.memberIds.includes(userId));
  }
  res.json(groupChannels);
});

// Remove channel (owner or super admin)
app.delete('/api/groups/:groupId/channels/:channelId', (req, res) => {
  const { groupId, channelId } = req.params;
  const { adminId } = req.body || {};
  
  const channel = channels.find(c => c.id === channelId && c.groupId === groupId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admin or super admin can delete channel' });
  }
  
  const channelIndex = channels.findIndex(c => c.id === channelId && c.groupId === groupId);
  channels.splice(channelIndex, 1);
  saveDataToDisk();
  res.json({ ok: true, msg: 'Channel removed successfully' });
});

// Add user to channel (group admin or super admin)
app.post('/api/channels/:channelId/members', (req, res) => {
  const { channelId } = req.params;
  const { userId, adminId } = req.body || {};
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  const group = groups.find(g => g.id === channel.groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can add channel members' });
  }
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User must be a group member to be added to channel' });
  }
  channel.memberIds = channel.memberIds || [];
  if (channel.memberIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User already a channel member' });
  }
  channel.memberIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User added to channel' });
});

// Remove user from channel (group admin or super admin)
app.delete('/api/channels/:channelId/members/:userId', (req, res) => {
  const { channelId, userId } = req.params;
  const { adminId } = req.body || {};
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  const group = groups.find(g => g.id === channel.groupId);
  if (!group) return res.status(404).json({ ok: false, msg: 'Group not found' });
  const admin = users.find(u => u.id === adminId);
  if (!admin) return res.status(403).json({ ok: false, msg: 'Admin not found' });
  const isSuperAdmin = admin.roles.includes('super') || admin.roles.includes('super_admin');
  if (!isSuperAdmin && !group.adminIds.includes(adminId)) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can remove channel members' });
  }
  channel.memberIds = channel.memberIds || [];
  if (!channel.memberIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not a channel member' });
  }
  channel.memberIds = channel.memberIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User removed from channel' });
});

// Ban user from channel (owner only)
app.post('/api/channels/:channelId/ban', (req, res) => {
  const { channelId } = req.params;
  const { userId, adminId } = req.body || {};
  
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = groups.find(g => g.id === channel.groupId);
  if (!group || group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner can ban users' });
  }
  
  // Prevent banning super admins
  const target = users.find(u => u.id === userId);
  if (target && (target.roles.includes('super') || target.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Super admins cannot be banned from channels' });
  }
  
  if (channel.bannedUserIds.includes(userId)) {
    return res.status(409).json({ ok: false, msg: 'User is already banned' });
  }
  
  channel.bannedUserIds.push(userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User banned from channel' });
});

// Unban user from channel (owner only)
app.delete('/api/channels/:channelId/ban/:userId', (req, res) => {
  const { channelId, userId } = req.params;
  const { adminId } = req.body || {};
  
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ ok: false, msg: 'Channel not found' });
  
  const group = groups.find(g => g.id === channel.groupId);
  if (!group || group.ownerId !== adminId) {
    return res.status(403).json({ ok: false, msg: 'Only group owner can unban users' });
  }
  
  if (!channel.bannedUserIds.includes(userId)) {
    return res.status(400).json({ ok: false, msg: 'User is not banned from this channel' });
  }
  
  channel.bannedUserIds = channel.bannedUserIds.filter(id => id !== userId);
  saveDataToDisk();
  res.json({ ok: true, msg: 'User unbanned from channel' });
});

// ==================== REPORTING ENDPOINTS ====================

// Report to super admin (Group Admin feature)
app.post('/api/reports', (req, res) => {
  const { reporterId, subject, message, type, relatedUserId } = req.body || {};
  
  const reporter = users.find(u => u.id === reporterId);
  if (!reporter || (!reporter.roles.includes('groupAdmin') && !reporter.roles.includes('group_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only group admins can create reports' });
  }
  
  const report = {
    id: `r_${reports.length + 1}`,
    reporterId,
    subject,
    message,
    type, // 'ban', 'user_issue', 'group_issue', etc.
    relatedUserId,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  reports.push(report);
  saveDataToDisk();
  res.status(201).json({ ok: true, msg: 'Report submitted to super admins' });
});

// Get all reports (Super Admin only)
app.get('/api/reports', (req, res) => {
  const { adminId } = req.query;
  
  const admin = users.find(u => u.id === adminId);
  if (!admin || (!admin.roles.includes('super') && !admin.roles.includes('super_admin'))) {
    return res.status(403).json({ ok: false, msg: 'Only super admins can view reports' });
  }
  
  res.json(reports);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Express listening on http://localhost:${PORT}`));
