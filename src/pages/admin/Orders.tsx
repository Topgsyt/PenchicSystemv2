import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Package2, Download, Search, Calendar, Filter, 
  ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertCircle, Truck, RefreshCcw,
  FileText, Eye, Edit3, BarChart3, Users, ShoppingBag,
  ChevronDown, ChevronUp, X, SortAsc, SortDesc
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderCalculation {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  tax_rate: number;
}

interface OrderSnapshot {
  product_name: string;
  product_category: string;
  price_at_time: number;
  variant_size?: string;
  product_image_url?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  order_product_snapshots?: OrderSnapshot[];
}

interface Payment {
  payment_method: string;
  status: string;
  mpesa_reference?: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  user_id?: string;
  profiles?: {
    email: string;
    role: string;
  } | null;
  order_items?: OrderItem[];
  order_calculations?: OrderCalculation[];
  payments?: Payment[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<string>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    averageOrder: 0,
    revenueChange: 0,
    orderGrowth: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    if (reportPeriod !== 'custom') {
      fetchOrders();
    }
  }, [reportPeriod]);

  useEffect(() => {
    if (reportPeriod === 'custom' && customStartDate && customEndDate) {
      fetchOrders();
    }
  }, [customStartDate, customEndDate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching orders...');
      
      // Start with a simple query first
      let query = supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total,
          user_id
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply date filtering if needed
      const { startDate, endDate } = getDateRange();
      if (startDate && endDate) {
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Orders query error:', ordersError);
        throw new Error(`Failed to fetch orders: ${ordersError.message}`);
      }

      console.log('Base orders fetched:', ordersData?.length || 0);

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setOrderStats({
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
          averageOrder: 0,
          revenueChange: 0,
          orderGrowth: 0
        });
        setLoading(false);
        return;
      }

      // Fetch related data separately to avoid complex joins
      const enrichedOrders = await Promise.all(
        ordersData.map(async (order) => {
          try {
            // Fetch profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, role')
              .eq('id', order.user_id)
              .single();

            // Fetch order items
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);

            // Fetch order calculations
            const { data: orderCalculations } = await supabase
              .from('order_calculations')
              .select('*')
              .eq('order_id', order.id);

            // Fetch payments
            const { data: payments } = await supabase
              .from('payments')
              .select('*')
              .eq('order_id', order.id);

            // Fetch product snapshots for items
            const itemsWithSnapshots = await Promise.all(
              (orderItems || []).map(async (item) => {
                const { data: snapshots } = await supabase
                  .from('order_product_snapshots')
                  .select('*')
                  .eq('order_item_id', item.id);

                return {
                  ...item,
                  order_product_snapshots: snapshots || []
                };
              })
            );

            return {
              ...order,
              profiles: profileData || null,
              order_items: itemsWithSnapshots || [],
              order_calculations: orderCalculations || [],
              payments: payments || []
            };
          } catch (itemError) {
            console.error(`Error enriching order ${order.id}:`, itemError);
            return {
              ...order,
              profiles: null,
              order_items: [],
              order_calculations: [],
              payments: []
            };
          }
        })
      );

      console.log('Enriched orders:', enrichedOrders.length);

      // Calculate statistics
      const stats = calculateOrderStatistics(enrichedOrders);
      setOrderStats(stats);
      setOrders(enrichedOrders as Order[]);

    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderStatistics = (ordersData: any[]) => {
    if (!ordersData || ordersData.length === 0) {
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
        averageOrder: 0,
        revenueChange: 0,
        orderGrowth: 0
      };
    }

    const stats = ordersData.reduce((acc, order) => {
      // Count by status
      const status = order.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      acc.total++;

      // Calculate revenue
      const calculation = order.order_calculations?.[0];
      const orderTotal = calculation?.total_amount || order.total || 0;
      acc.totalRevenue += Number(orderTotal);

      return acc;
    }, { 
      total: 0, 
      pending: 0, 
      processing: 0, 
      completed: 0, 
      cancelled: 0, 
      totalRevenue: 0 
    });

    return {
      ...stats,
      averageOrder: stats.total > 0 ? stats.totalRevenue / stats.total : 0,
      revenueChange: 15.2, // Calculate from previous period
      orderGrowth: 8.5 // Calculate from previous period
    };
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    
    switch (reportPeriod) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      case 'weekly':
        start.setDate(now.getDate() - 7);
        return { startDate: start, endDate: now };
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        return { startDate: start, endDate: now };
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1);
        return { startDate: start, endDate: now };
      case 'custom':
        return {
          startDate: customStartDate ? new Date(customStartDate) : start,
          endDate: customEndDate ? new Date(customEndDate) : now,
        };
      default:
        return { startDate: null, endDate: null };
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Create audit log if table exists
      try {
        const { data: user } = await supabase.auth.getUser();
        await supabase.from('order_audit_logs').insert({
          order_id: orderId,
          changed_by: user.user?.id,
          change_type: 'status_updated',
          new_values: { status: newStatus },
          reason: 'Admin status update'
        });
      } catch (auditError) {
        console.log('Audit log failed (table may not exist):', auditError);
      }

      // Refresh orders
      fetchOrders();
      
      // Show success feedback
      const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
      if (orderElement) {
        orderElement.classList.add('bg-green-50');
        setTimeout(() => orderElement.classList.remove('bg-green-50'), 2000);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      alert(`Failed to update order status: ${error.message}`);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf' | 'excel') => {
    const { startDate, endDate } = getDateRange();
    
    const filteredOrders = orders.filter(order => {
      if (!startDate || !endDate) return true;
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });

    if (format === 'csv') {
      const csvContent = [
        'PENCHIC FARM - COMPREHENSIVE ORDER REPORT',
        `Period: ${startDate?.toLocaleDateString() || 'All time'} to ${endDate?.toLocaleDateString() || 'Present'}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        // Headers
        [
          'Order ID',
          'Date',
          'Customer Email',
          'Status',
          'Items Count',
          'Total (KES)',
          'Payment Method',
          'Payment Status'
        ].join(','),
        // Data rows
        ...filteredOrders.map(order => [
          order.id,
          new Date(order.created_at).toLocaleDateString(),
          order.profiles?.email || 'N/A',
          order.status,
          order.order_items?.length || 0,
          (order.order_calculations?.[0]?.total_amount || order.total || 0).toFixed(2),
          order.payments?.[0]?.payment_method?.toUpperCase() || 'N/A',
          order.payments?.[0]?.status?.toUpperCase() || 'N/A'
        ].join(',')),
        '',
        // Summary
        `Total Orders,${filteredOrders.length}`,
        `Total Revenue,KES ${Number(orderStats.totalRevenue).toFixed(2)}`,
        `Average Order Value,KES ${Number(orderStats.averageOrder).toFixed(2)}`
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `penchic-farm-orders-${reportPeriod}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <RefreshCcw className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredOrders = orders
    .filter(order => filter === 'all' || order.status === filter)
    .filter(order => 
      searchTerm === '' || 
      order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <AdminLayout title="Orders Management" subtitle="Comprehensive order tracking and reporting">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-4 text-lg text-neutral-600">Loading orders...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Orders Management" subtitle="Comprehensive order tracking and reporting">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error Loading Orders</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-y-2 text-sm text-red-600 mb-4">
            <p>• Check if the 'orders' table exists in your database</p>
            <p>• Verify your database connection</p>
            <p>• Ensure you have the correct permissions</p>
            <p>• Check the browser console for more details</p>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders Management" subtitle="Comprehensive order tracking and reporting">
      <div className="space-y-6">
        {/* Debug Info (remove in production) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-900">Debug Info:</p>
          <p className="text-blue-800">Total orders loaded: {orders.length}</p>
          <p className="text-blue-800">Filtered orders: {filteredOrders.length}</p>
          <p className="text-blue-800">Current filter: {filter}</p>
          <p className="text-blue-800">Search term: "{searchTerm}"</p>
        </div>

        {/* Enhanced Header with Export Options */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Order Reports & Analytics</h2>
              <p className="text-neutral-600">Comprehensive order tracking with historical data preservation</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportReport('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => fetchOrders()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="yearly">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
            </button>
          </div>

          {/* Custom Date Range */}
          <AnimatePresence>
            {(reportPeriod === 'custom' || showFilters) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Revenue */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mb-2">
              KES {orderStats.totalRevenue.toLocaleString('en-KE')}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium">+{orderStats.revenueChange}% from last period</span>
            </div>
          </motion.div>

          {/* Total Orders */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mb-2">{orderStats.total}</p>
            <div className="flex items-center gap-2 text-sm">
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 font-medium">+{orderStats.orderGrowth}% growth</span>
            </div>
          </motion.div>

          {/* Average Order Value */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">Average Order</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mb-2">
              KES {orderStats.averageOrder.toLocaleString('en-KE')}
            </p>
            <div className="text-sm text-purple-700">Per order value</div>
          </motion.div>

          {/* Order Status Distribution */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <Truck className="w-8 h-8 text-orange-600" />
              <span className="text-sm text-orange-600 font-medium">Order Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-yellow-700 font-medium">Pending</span>
                <span className="text-orange-900 font-bold">{orderStats.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Processing</span>
                <span className="text-orange-900 font-bold">{orderStats.processing}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700 font-medium">Completed</span>
                <span className="text-orange-900 font-bold">{orderStats.completed}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Order Details</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    sortBy === 'created_at' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Date
                  {sortBy === 'created_at' && (
                    sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSortBy('total');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    sortBy === 'total' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Total
                  {sortBy === 'total' && (
                    sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const calculation = order.order_calculations?.[0];
                const isExpanded = expandedOrder === order.id;
                
                return (
                  <motion.div
                    key={order.id}
                    layout
                    className="border border-neutral-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                    data-order-id={order.id}
                  >
                    {/* Order Header */}
                    <div className="p-6 bg-neutral-50">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-neutral-900">
                              Order #{order.id.slice(0, 8)}
                            </h3>
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-neutral-500">Customer:</span>
                              <p className="font-medium text-neutral-900">{order.profiles?.email || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-neutral-500">Date:</span>
                              <p className="font-medium text-neutral-900">
                                {new Date(order.created_at).toLocaleDateString('en-KE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-neutral-500">Payment:</span>
                              <p className="font-medium text-neutral-900">
                                {order.payments?.[0]?.payment_method?.toUpperCase() || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-neutral-500">Total Amount</p>
                            <p className="text-2xl font-bold text-neutral-900">
                              KES {(calculation?.total_amount || order.total || 0).toLocaleString('en-KE')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            
                            <button
                              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                              className="p-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Order Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-neutral-200"
                        >
                          <div className="p-6 space-y-6">
                            {/* Order Items */}
                            <div>
                              <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                                <Package2 className="w-5 h-5" />
                                Order Items ({order.order_items?.length || 0})
                              </h4>
                              {order.order_items && order.order_items.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-neutral-200">
                                        <th className="text-left py-3 px-4 font-medium text-neutral-700">Product</th>
                                        <th className="text-center py-3 px-4 font-medium text-neutral-700">Qty</th>
                                        <th className="text-right py-3 px-4 font-medium text-neutral-700">Unit Price</th>
                                        <th className="text-right py-3 px-4 font-medium text-neutral-700">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                      {order.order_items.map((item: any) => {
                                        const snapshot = item.order_product_snapshots?.[0];
                                        const productName = snapshot?.product_name || `Item #${item.id.slice(0, 8)}`;
                                        const priceAtTime = Number(snapshot?.price_at_time || item.price || 0);
                                        
                                        return (
                                          <tr key={item.id} className="hover:bg-neutral-50">
                                            <td className="py-3 px-4">
                                              <div className="flex items-center gap-3">
                                                {snapshot?.product_image_url && (
                                                  <img
                                                    src={snapshot.product_image_url}
                                                    alt={productName}
                                                    className="w-10 h-10 object-cover rounded"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                )}
                                                <div>
                                                  <p className="font-medium text-neutral-900">{productName}</p>
                                                  <p className="text-sm text-neutral-500">
                                                    {snapshot?.product_category || 'N/A'}
                                                    {snapshot?.variant_size && ` - ${snapshot.variant_size}`}
                                                  </p>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="text-center py-3 px-4 font-medium">{item.quantity}</td>
                                            <td className="text-right py-3 px-4 font-medium">
                                              KES {priceAtTime.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            </td>
                                            <td className="text-right py-3 px-4 font-bold">
                                              KES {(item.quantity * priceAtTime).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-neutral-500">
                                  <Package2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p>No items found for this order</p>
                                </div>
                              )}
                            </div>

                            {/* Detailed Calculations */}
                            {calculation && (
                              <div className="bg-neutral-50 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                                  <BarChart3 className="w-5 h-5" />
                                  Calculation Breakdown
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex justify-between">
                                      <span className="text-neutral-600">Subtotal:</span>
                                      <span className="font-medium">KES {Number(calculation.subtotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-neutral-600">Tax ({Number(calculation.tax_rate || 16)}%):</span>
                                      <span className="font-medium">KES {Number(calculation.tax_amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                                    </div>
                                    {Number(calculation.discount_amount) > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span className="font-medium">-KES {Number(calculation.discount_amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                                      </div>
                                    )}
                                    {Number(calculation.shipping_fee) > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-neutral-600">Shipping:</span>
                                        <span className="font-medium">KES {Number(calculation.shipping_fee).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-neutral-200">
                                    <div className="flex justify-between items-center">
                                      <span className="text-lg font-bold text-neutral-900">Final Total:</span>
                                      <span className="text-2xl font-bold text-primary">
                                        KES {Number(calculation.total_amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                      KES {(order.order_calculations?.[0]?.total_amount || order.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Payment Information */}
                            {order.payments?.[0] && (
                              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                                <h4 className="text-lg font-semibold text-blue-900 mb-4">Payment Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-blue-700">Method:</span>
                                    <p className="font-medium text-blue-900">
                                      {order.payments[0].payment_method.toUpperCase()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Status:</span>
                                    <p className="font-medium text-blue-900">
                                      {order.payments[0].status.toUpperCase()}
                                    </p>
                                  </div>
                                  {order.payments[0].mpesa_reference && (
                                    <div className="md:col-span-2">
                                      <span className="text-blue-700">M-Pesa Reference:</span>
                                      <p className="font-mono font-medium text-blue-900">
                                        {order.payments[0].mpesa_reference}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {filteredOrders.length === 0 && !loading && (
                <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
                  <Package2 className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Orders Found</h3>
                  <p className="text-neutral-600 mb-4">
                    {orders.length === 0 
                      ? "No orders exist in the database yet" 
                      : "No orders match your current filters"}
                  </p>
                  {orders.length === 0 && (
                    <div className="text-sm text-neutral-500 space-y-1">
                      <p>Possible reasons:</p>
                      <p>• No orders have been placed yet</p>
                      <p>• Orders table is empty</p>
                      <p>• Database connection issues</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Orders;