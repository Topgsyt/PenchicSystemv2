import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Package2,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    recentOrders: []
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('orders').select(`
          *,
          order_items (
            quantity,
            products (name, price)
          ),
          profiles (email)
        `).order('created_at', { ascending: false }).limit(5)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];

      const lowStock = products.filter(p => p.stock < 5).length;

      const revenue = orders.reduce((acc, order) => {
        const orderTotal = (order.order_items || []).reduce((sum, item) => {
          const price = item.products?.price || 0;
          return sum + (item.quantity * price);
        }, 0);
        return acc + orderTotal;
      }, 0);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: revenue,
        lowStockItems: lowStock,
        recentOrders: orders
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Welcome to your admin dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome to your admin dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <Package2 className="w-8 h-8 text-blue-500" />
              <span className="text-sm text-neutral-500 font-medium">Products</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              {stats.totalProducts}
            </p>
            <p className="text-neutral-500 text-sm">Total products</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <ShoppingCart className="w-8 h-8 text-green-500" />
              <span className="text-sm text-neutral-500 font-medium">Orders</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              {stats.totalOrders}
            </p>
            <p className="text-neutral-500 text-sm">Recent orders</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <DollarSign className="w-8 h-8 text-purple-500" />
              <span className="text-sm text-neutral-500 font-medium">Revenue</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              KES {stats.totalRevenue.toLocaleString('en-KE')}
            </p>
            <p className="text-neutral-500 text-sm">Total revenue</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <span className="text-sm text-neutral-500 font-medium">Stock Alerts</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              {stats.lowStockItems}
            </p>
            <p className="text-neutral-500 text-sm">Low stock items</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-neutral-900">Recent Orders</h2>
            <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2 text-neutral-900">
                      Order #{order.id.slice(0, 8)}
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      {order.profiles?.email || 'N/A'}
                    </p>
                    <div className="space-y-1 mt-2">
                      {order.order_items?.map((item, index) => (
                        <p key={index} className="text-neutral-600 text-sm">
                          {item.products?.name || 'Product'} x {item.quantity}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900">
                      KES {((order.order_items || []).reduce((acc, item) => {
                        const price = item.products?.price || 0;
                        return acc + (item.quantity * price);
                      }, 0)).toLocaleString('en-KE')}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {stats.recentOrders.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
