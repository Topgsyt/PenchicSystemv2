import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('worker');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!email) return;
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (error || !user?.user) {
      console.error('Error creating user:', error);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.user.id,
      email,
      role,
      full_name: fullName,
    });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
    } else {
      fetchUsers();
      setEmail('');
      setRole('worker');
      setFullName('');
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) {
      console.error('Error updating role:', error);
    } else {
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user:', error);
    } else {
      fetchUsers();
    }
  };

  return (
    <AdminLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>

        <div className="mb-6 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Add New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded">
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser}>Add User</Button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">User List</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <table className="min-w-full table-auto">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Email</th>
                  <th className="border px-4 py-2">Full Name</th>
                  <th className="border px-4 py-2">Role</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="border px-4 py-2">{user.email}</td>
                    <td className="border px-4 py-2">{user.full_name || 'N/A'}</td>
                    <td className="border px-4 py-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="p-1 border rounded"
                      >
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="border px-4 py-2">
                      <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
