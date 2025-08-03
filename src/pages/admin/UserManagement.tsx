import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Shield, Search, Filter, ChevronLeft, ChevronRight, Calendar, Mail, User as UserIcon, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
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
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'customer',
    status: 'active'
  });
  const [showAddForm, setShowAddForm] = useState(false);

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
              status: newUser.status,
            },
          ]);

        if (profileError) throw profileError;
      }

      // Reset form and refresh
      setNewUser({ email: '', password: '', role: 'customer', status: 'active' });
      setShowAddForm(false);
      fetchUsers();
      alert('User created successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert(`Error adding user: ${error.message}`);
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
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error.message}`);
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
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="worker">Worker</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg touch-target"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </motion.button>
        </div>

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
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors touch-target"
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
                      className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors touch-target"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
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
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-4 font-medium text-neutral-900">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 hover:text-primary transition-colors touch-target"
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
                      className="flex items-center gap-2 hover:text-primary transition-colors touch-target"
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
                      className="flex items-center gap-2 hover:text-primary transition-colors touch-target"
                    >
                      <Calendar className="w-4 h-4" />
                      Joined
                      {sortBy === 'created_at' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-neutral-900">Orders</th>
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
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{user.email}</p>
                          <p className="text-sm text-neutral-500">ID: {user.id.slice(0, 8)}...</p>
                          <div className="flex items-center gap-2 mt-1">
                            {user.status === 'active' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              user.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {user.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-0 focus:ring-2 focus:ring-primary/20 touch-target ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-700' 
                              : user.role === 'worker'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <option value="customer">Customer</option>
                          <option value="worker">Worker</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div className="text-xs text-neutral-500">
                          Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-neutral-900">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(user.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm">
                        {user.orders?.[0]?.count || 0}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(user.id, user.status)}
                          className={`p-2 rounded-lg transition-colors touch-target ${
                            user.status === 'active' 
                              ? 'hover:bg-red-50 text-red-500' 
                              : 'hover:bg-green-50 text-green-500'
                          }`}
                          title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.status === 'active' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowUserDetails(showUserDetails === user.id ? null : user.id)}
                          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-target"
                          title="View details"
                        >
                          {showUserDetails === user.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors touch-target"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {currentUsers.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Users Found</h3>
              <p className="text-neutral-600">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'No users have been created yet'
                }
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-200">
              <div className="text-sm text-neutral-600">
                Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors touch-target ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'hover:bg-neutral-100 text-neutral-700'
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
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;