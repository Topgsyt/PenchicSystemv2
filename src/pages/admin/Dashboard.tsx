import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import AdminLayout from '../../components/admin/AdminLayout';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import { 
  Package2, ShoppingCart, AlertCircle, Users, 
  TrendingUp, BarChart3, Settings, Truck,
  ArrowUpRight, ArrowDownRight, Calendar,
  DollarSign, Boxes, UserCheck, Eye, Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const { isConnected } = useRealTimeNotifications();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalOrders: 0,
    totalUsers: 0,
    recentOrders: [],
    stockAlerts: [],
    revenue: {
      current: 0,
      previous: 0
    },
    customerStats: {
      total: 0,
      new: 0,
      returning: 0
    },
    topProducts: [],
    orderStats: {
      pending: 0,
      processing: 0,
      completed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let startDate = today;
      if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (dateRange === 'month') {
        startDate = currentMonthStart;
      }

      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock, price');
      
      const lowStockItems = products?.filter(p => p.stock <= 5) || [];

      const { data: currentOrders } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (email),
          order_items (
            quantity,
            price,
            products (
              name,
              price
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const { data: previousOrders } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (email),
          order_items (
            quantity,
            price,
            products (
              name,
              price
            )
          )
        `)
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      const currentRevenue = currentOrders?.reduce((acc, order) => {
        const orderTotal = order.order_items.reduce((itemAcc, item) => {
          return itemAcc + (item.quantity * (item.products?.price || item.price || 0));
        }, 0);
        return acc + orderTotal;
      }, 0) || 0;

      const previousRevenue = previousOrders?.reduce((acc, order) => {
        const orderTotal = order.order_items.reduce((itemAcc, item) => {
          return itemAcc + (item.quantity * (item.products?.price || item.price || 0));
        }, 0);
        return acc + orderTotal;
      }, 0) || 0;

      const orderStatusCounts = currentOrders?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const productSales = {};
      currentOrders?.forEach(order => {
        order.order_items.forEach(item => {
          const productName = item.products?.name || 'Unknown Product';
          if (!productSales[productName]) {
            productSales[productName] = {
              name: productName,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.quantity * (item.products?.price || item.price || 0);
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString());

      setStats({
        totalProducts: products?.length || 0,
        lowStock: lowStockItems.length,
        totalOrders: currentOrders?.length || 0,
        totalUsers,
        recentOrders: currentOrders?.slice(0, 5) || [],
        stockAlerts: lowStockItems,
        revenue: {
          current: currentRevenue,
          previous: previousRevenue
        },
        customerStats: {
          total: totalUsers || 0,
          new: newUsers || 0,
          returning: totalUsers - newUsers || 0
        },
        topProducts,
        orderStats: {
          pending: orderStatusCounts.pending || 0,
          processing: orderStatusCounts.processing || 0,
          completed: orderStatusCounts.completed || 0
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Welcome back, here's what's happening">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const revenueChange = stats.revenue.previous > 0 
    ? ((stats.revenue.current - stats.revenue.previous) / stats.revenue.previous) * 100 
    : 100;

  const statCards = [
    {
      title: 'Total Revenue',
      value: `KES ${stats.revenue.current.toLocaleString('en-KE')}`,
      change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
      changeType: revenueChange >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      onClick: () => navigate('/admin/analytics')
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      change: '+12%',
      changeType: 'positive',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => navigate('/admin/orders')
    },
    {
      title: 'Products',
      value: stats.totalProducts.toString(),
      change: `${stats.lowStock} low stock`,
      changeType: stats.lowStock > 0 ? 'negative' : 'neutral',
      icon: Package2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      onClick: () => navigate('/admin/products')
    },
    {
      title: 'Customers',
      value: stats.customerStats.total.toString(),
      change: `+${stats.customerStats.new} new`,
      changeType: 'positive',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      onClick: () => navigate('/admin/users')
    }
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back, here's what's happening">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Open POS</span>
          </motion.button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
          
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={stat.onClick}
              className="bg-white p-4 sm:p-6 rounded-xl border border-neutral-200 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
                <Eye className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900 mb-1">{stat.value}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-neutral-500 truncate">{stat.title}</span>
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-neutral-500'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900">Recent Orders</h2>
              <button
                onClick={() => navigate('/admin/orders')}
                className="text-primary hover:text-primary-dark font-medium text-xs sm:text-sm transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {stats.recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer gap-2 sm:gap-0"
                  onClick={() => navigate('/admin/orders')}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-neutral-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs sm:text-sm text-neutral-500">{order.profiles?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-sm sm:text-base font-medium text-neutral-900">
                      KES {(order.order_items || []).reduce((acc, item) => 
                        acc + (item.quantity * (item.products?.price || item.price || 0)), 0
                      ).toLocaleString('en-KE')}
                    </p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </motion.div>
              ))}
              {stats.recentOrders.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-neutral-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm sm:text-base">No recent orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Stock Alerts */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-900">Stock Alerts</h3>
                <button
                  onClick={() => navigate('/admin/stock-management')}
                  className="text-primary hover:text-primary-dark text-xs sm:text-sm font-medium transition-colors"
                >
                  Manage
                </button>
              </div>
              <div className="space-y-3">
                {stats.stockAlerts.slice(0, 5).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 truncate max-w-[120px] sm:max-w-none">{item.name}</p>
                        <p className="text-xs text-red-600">{item.stock} left</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {stats.stockAlerts.length === 0 && (
                  <div className="text-center py-3 sm:py-4 text-neutral-500">
                    <Package2 className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-xs sm:text-sm">All products in stock</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <h3 className="text-sm sm:text-base font-semibold text-neutral-900 mb-4">Top Products</h3>
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="text-lg font-bold text-neutral-400">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-neutral-900 truncate">{product.name}</p>
                        <p className="text-xs text-neutral-500">{product.quantity} sold</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-neutral-900 flex-shrink-0">
                      KES {product.revenue.toLocaleString('en-KE')}
                    </p>
                  </motion.div>
                ))}
                {stats.topProducts.length === 0 && (
                  <div className="text-center py-3 sm:py-4 text-neutral-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-xs sm:text-sm">No sales data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;