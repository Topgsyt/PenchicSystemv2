import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Shield, Search, Filter, ChevronLeft, ChevronRight, Calendar, Mail, User as UserIcon, Eye, EyeOff, CheckCircle, XCircle, CreditCard as Edit3, X, Save, AlertTriangle, Users, Crown, Briefcase, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showUserDetails, setShowUserDetails] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    role: 'customer',
    status: 'active',
    permissions: []
  });
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'customer',
    status: 'active',
    permissions: []
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkActions, setBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          orders(count),
          created_at
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      
      // Add status based on last activity or default to active
      const usersWithStatus = (data || []).map(user => ({
        ...user,
        status: user.status || 'active', // Default to active if no status
        last_login: user.last_login || user.created_at
      }));
      
      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!newUser.email || !newUser.password) {
        throw new Error('Email and password are required');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (newUser.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create user using Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile for the new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: newUser.email,
              role: newUser.role,
            },
          ]);

        if (profileError) throw profileError;
      }

      // Reset form and refresh
      setNewUser({ email: '', password: '', role: 'customer', status: 'active', permissions: [] });
      setShowAddForm(false);
      fetchUsers();
      alert('User created successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert(`Error adding user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      role: user.role,
      status: user.status || 'active',
      permissions: user.permissions || []
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: editForm.email,
          role: editForm.role,
          status: editForm.status,
          permissions: editForm.permissions
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error updating user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
      alert(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Error updating status: ${error.message}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!confirm('Are you sure you want to change this user\'s role?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Error updating role:', error);
      alert(`Error updating role: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage(`Error deleting user: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedUsers.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .in('id', selectedUsers);

      if (error) throw error;
      
      setSelectedUsers([]);
      fetchUsers();
      alert(`${selectedUsers.length} users updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating users:', error);
      alert('Error updating users. Please try again.');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'worker': return <Briefcase className="w-4 h-4" />;
      case 'customer': return <ShoppingBag className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'worker': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'customer': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    fetchUsers();
  };

  if (loading && !showAddForm) {
    return (
      <AdminLayout title="User Management" subtitle="Manage system users and permissions">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Management" subtitle="Manage system users and permissions">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="worker">Worker</option>
              <option value="customer">Customer</option>
            </select>
            
            <button
              onClick={() => setBulkActions(!bulkActions)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                bulkActions ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Bulk Actions
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </motion.button>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {bulkActions && selectedUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-primary/10 border border-primary/20 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">
                    {selectedUsers.length} user(s) selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('active')}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('inactive')}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add User Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6 text-neutral-900">Add New User</h2>
                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Role
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
                      >
                        <option value="customer">Customer</option>
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Status
                      </label>
                      <select
                        value={newUser.status}
                        onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {bulkActions && (
                    <th className="text-left p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(currentUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-neutral-300 text-primary focus:ring-primary"
                      />
                    </th>
                  )}
                  <th className="text-left p-4 font-medium text-neutral-900">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                      {sortBy === 'email' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-neutral-900">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Role
                      {sortBy === 'role' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-neutral-900">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Joined
                      {sortBy === 'created_at' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-neutral-900">Orders</th>
                  <th className="text-left p-4 font-medium text-neutral-900">Last Activity</th>
                  <th className="text-right p-4 font-medium text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {currentUsers.map((user: any, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    {bulkActions && (
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-neutral-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          user.status === 'active' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <UserIcon className={`w-6 h-6 ${
                            user.status === 'active' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{user.email}</p>
                          <p className="text-xs text-neutral-500">ID: {user.id.slice(0, 8)}...</p>
                          <div className="flex items-center gap-2 mt-2">
                            {user.status === 'active' ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs font-medium text-green-600">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-medium text-red-600">Inactive</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="font-medium text-sm">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </div>
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                          <option value="customer">Customer</option>
                          <option value="worker">Worker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(user.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm font-medium">
                          {user.orders?.[0]?.count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-neutral-900">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Never'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {user.last_login ? new Date(user.last_login).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'No activity'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors group"
                          title="Edit user"
                        >
                          <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(user.id, user.status)}
                          className={`p-2 rounded-lg transition-colors group ${
                            user.status === 'active' 
                              ? 'hover:bg-red-50 text-red-500' 
                              : 'hover:bg-green-50 text-green-500'
                          }`}
                          title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.status === 'active' ? (
                            <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          ) : (
                            <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowUserDetails(showUserDetails === user.id ? null : user.id)}
                          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors group"
                          title="View details"
                        >
                          {showUserDetails === user.id ? 
                            <EyeOff className="w-4 h-4 group-hover:scale-110 transition-transform" /> : 
                            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          }
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors group"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced User Details Expansion */}
          <AnimatePresence>
            {showUserDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-neutral-200 bg-neutral-50 p-6"
              >
                {(() => {
                  const user = currentUsers.find(u => u.id === showUserDetails);
                  if (!user) return null;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-neutral-900">User Information</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-neutral-500">Email:</span>
                            <p className="font-medium">{user.email}</p>
                          </div>
                          <div>
                            <span className="text-sm text-neutral-500">Role:</span>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${getRoleColor(user.role)} mt-1`}>
                              {getRoleIcon(user.role)}
                              <span className="font-medium text-sm">
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-neutral-500">Status:</span>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg mt-1 ${
                              user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              <span className="font-medium text-sm">
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-neutral-900">Activity</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-neutral-500">Joined:</span>
                            <p className="font-medium">
                              {new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-neutral-500">Last Login:</span>
                            <p className="font-medium">
                              {user.last_login ? new Date(user.last_login).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Never'}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-neutral-500">Total Orders:</span>
                            <p className="font-medium">{user.orders?.[0]?.count || 0}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-neutral-900">Quick Actions</h4>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit User
                          </button>
                          <button
                            onClick={() => handleStatusToggle(user.id, user.status)}
                            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              user.status === 'active'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {user.status === 'active' ? (
                              <>
                                <XCircle className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {currentUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Users Found</h3>
            <p className="text-neutral-600 mb-4">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No users have been created yet'
              }
            </p>
            {!searchTerm && roleFilter === 'all' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Add First User
              </button>
            )}
          </div>
        )}

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-neutral-200 bg-neutral-50">
            <div className="text-sm text-neutral-600 mb-4 sm:mb-0">
              Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
              <span className="font-medium">{filteredUsers.length}</span> users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Edit User Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900">Edit User</h2>
                        <p className="text-sm text-neutral-600">Modify user details and permissions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        User Role
                      </label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        <option value="customer">Customer</option>
                        <option value="worker">Worker</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <p className="text-xs text-neutral-500 mt-1">
                        {editForm.role === 'admin' && 'Full system access and user management'}
                        {editForm.role === 'worker' && 'POS access and inventory management'}
                        {editForm.role === 'customer' && 'Shopping and order management only'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Account Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={editingUser?.id || ''}
                        disabled
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-500"
                      />
                    </div>
                  </div>

                  {/* Role-based Permissions */}
                  {editForm.role !== 'customer' && (
                    <div className="border-t border-neutral-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-neutral-900">Permissions & Access</h4>
                        <button
                          type="button"
                          onClick={() => setShowPermissions(!showPermissions)}
                          className="text-sm text-primary hover:text-primary-dark transition-colors"
                        >
                          {showPermissions ? 'Hide' : 'Show'} Details
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showPermissions && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-neutral-50 rounded-lg p-4 space-y-3"
                          >
                            {editForm.role === 'admin' && (
                              <div className="space-y-2">
                                <p className="font-medium text-neutral-900">Administrator Permissions:</p>
                                <ul className="text-sm text-neutral-600 space-y-1 ml-4">
                                  <li>• Full system access and configuration</li>
                                  <li>• User management and role assignment</li>
                                  <li>• Product catalog management</li>
                                  <li>• Order processing and fulfillment</li>
                                  <li>• Analytics and reporting access</li>
                                  <li>• POS system operation</li>
                                </ul>
                              </div>
                            )}
                            {editForm.role === 'worker' && (
                              <div className="space-y-2">
                                <p className="font-medium text-neutral-900">Worker Permissions:</p>
                                <ul className="text-sm text-neutral-600 space-y-1 ml-4">
                                  <li>• POS system operation</li>
                                  <li>• Inventory management</li>
                                  <li>• Order processing</li>
                                  <li>• Stock level updates</li>
                                  <li>• Basic reporting access</li>
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Updating...' : 'Update User'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;