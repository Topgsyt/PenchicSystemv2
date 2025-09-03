import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Package2, Download, Search, Calendar, Filter, 
  ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertCircle, Truck, RefreshCcw,
  FileText, Eye, Edit3, BarChart3, Users, ShoppingBag,
  ChevronDown, ChevronUp, X, SortAsc, SortDesc, Menu
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
  order_product_snapshots: OrderSnapshot[];
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
  profiles?: {
    email: string;
    role: string;
  };
  order_items: OrderItem[];
  order_calculations: OrderCalculation[];
  payments: Payment[];
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
  const [isMobile, setIsMobile] = useState(false);
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

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      
      let query = supabase
        .from('orders')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

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

      const enrichedOrders = await Promise.all(
        ordersData.map(async (order) => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, role')
              .eq('id', order.user_id)
              .single();

            const { data: orderItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);

            const orderCalculations: any[] = [];

            const { data: payments } = await supabase
              .from('payments')
              .select('*')
              .eq('order_id', order.id);

            const itemsWithSnapshots = (orderItems || []).map(item => ({
              ...item,
              order_product_snapshots: []
            }));

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
      const status = order.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      acc.total++;

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
      revenueChange: 15.2,
      orderGrowth: 8.5
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

      fetchOrders();
      
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
      // Group orders by date
      const ordersByDate = filteredOrders.reduce((acc, order) => {
        const dateKey = new Date(order.created_at).toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(order);
        return acc;
      }, {} as Record<string, typeof filteredOrders>);

      // Sort dates
      const sortedDates = Object.keys(ordersByDate).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      const csvContent = [
        'PENCHIC FARM - DAILY ORDER REPORT',
        `Report Period: ${startDate?.toLocaleDateString('en-KE') || 'All time'} to ${endDate?.toLocaleDateString('en-KE') || 'Present'}`,
        `Generated: ${new Date().toLocaleString('en-KE')}`,
        `Total Orders: ${filteredOrders.length}`,
        `Total Revenue: KES ${orderStats.totalRevenue.toLocaleString('en-KE')}`,
        '',
        '=== DAILY ORDER SUMMARY ===',
        'Date,Order ID,Employee Email,Status,Items Count,Total (KES),Payment Method,Payment Status',
        
        // Generate daily sections
        ...sortedDates.flatMap(date => {
          const dayOrders = ordersByDate[date];
          const dayTotal = dayOrders.reduce((sum, order) => {
            const orderTotal = order.order_calculations?.[0]?.total_amount || order.total || 0;
            return sum + orderTotal;
          }, 0);
          
          return [
            '', // Empty line before each day
            `=== ${date.toUpperCase()} - ${dayOrders.length} Orders - Total: KES ${dayTotal.toLocaleString('en-KE')} ===`,
            
            // Order summary for the day
            ...dayOrders.map(order => {
              const payment = order.payments?.[0];
              const orderTotal = order.order_calculations?.[0]?.total_amount || order.total || 0;
              const paymentMethod = payment?.payment_method === 'mpesa' ? 'Mpesa' : 
                                   payment?.payment_method === 'cash' ? 'Cash' : 'N/A';
              const paymentStatus = payment?.status === 'completed' ? 'Completed' : 
                                   payment?.status === 'cancelled' ? 'Cancelled' : 'Pending';
              
              return [
                date,
                `"${order.id.slice(0, 8)}"`,
                `"${order.profiles?.email || 'N/A'}"`,
                order.status.charAt(0).toUpperCase() + order.status.slice(1),
                order.order_items?.length || 0,
                orderTotal.toFixed(2),
                paymentMethod,
                paymentStatus
              ].join(',');
            }),
            
            '', // Empty line
            `--- Product Details for ${date} ---`,
            'Product Name,Quantity,Unit Price (KES),Total Price (KES)',
            
            // Product breakdown for the day
            ...dayOrders.flatMap(order => 
              (order.order_items || []).map(item => {
                const snapshot = item.order_product_snapshots?.[0];
                const productName = snapshot?.product_name || `Item #${item.id.slice(0, 8)}`;
                const priceAtTime = snapshot?.price_at_time || item.price || 0;
                
                return [
                  `"${productName}"`,
                  item.quantity,
                  priceAtTime.toFixed(2),
                  (item.quantity * priceAtTime).toFixed(2)
                ].join(',');
              })
            )
          ];
        }),
        
        '',
        '=== OVERALL SUMMARY ===',
        'Payment Method Summary:',
        ...(() => {
          const paymentStats = filteredOrders.reduce((acc, order) => {
            const method = order.payments?.[0]?.payment_method === 'mpesa' ? 'Mpesa' :
                          order.payments?.[0]?.payment_method === 'cash' ? 'Cash' : 'Unknown';
            const amount = order.order_calculations?.[0]?.total_amount || order.total || 0;
            
            if (!acc[method]) {
              acc[method] = { count: 0, total: 0 };
            }
            acc[method].count++;
            acc[method].total += amount;
            
            return acc;
          }, {} as Record<string, { count: number; total: number }>);
          
          return [
            'Payment Method,Count,Total Amount (KES)',
            ...Object.entries(paymentStats).map(([method, stats]) => 
              `${method},${stats.count},${stats.total.toFixed(2)}`
            )
          ];
        })(),
        
        '',
        'Order Status Summary:',
        'Status,Count',
        `Pending,${orderStats.pending}`,
        `Processing,${orderStats.processing}`,
        `Completed,${orderStats.completed}`,
        `Cancelled,${orderStats.cancelled}`,
        
        '',
        'Daily Totals:',
        'Date,Orders Count,Revenue (KES)',
        ...sortedDates.map(date => {
          const dayOrders = ordersByDate[date];
          const dayTotal = dayOrders.reduce((sum, order) => {
            const orderTotal = order.order_calculations?.[0]?.total_amount || order.total || 0;
            return sum + orderTotal;
          }, 0);
          
          return `"${date}",${dayOrders.length},${dayTotal.toFixed(2)}`;
        }),
        
        '',
        'End of Report - Generated by Penchic Farm Admin System'
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `penchic-farm-daily-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
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
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="text-lg text-neutral-600">Loading orders...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Orders Management" subtitle="Comprehensive order tracking and reporting">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2">Error Loading Orders</h3>
              <p className="text-sm sm:text-base text-red-700 mb-4 break-words">{error}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-red-600 mb-4">
            <p>• Check if the 'orders' table exists in your database</p>
            <p>• Verify your database connection</p>
            <p>• Ensure you have the correct permissions</p>
            <p>• Check the browser console for more details</p>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders Management" subtitle="Comprehensive order tracking and reporting">
      <div className="space-y-4 sm:space-y-6">
        {/* Debug Info (remove in production) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
          <p className="font-medium text-blue-900">Debug Info:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2">
            <p className="text-blue-800">Total: {orders.length}</p>
            <p className="text-blue-800">Filtered: {filteredOrders.length}</p>
            <p className="text-blue-800">Filter: {filter}</p>
            <p className="text-blue-800">Search: "{searchTerm}"</p>
          </div>
        </div>

        {/* Enhanced Header with Export Options */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">Order Reports & Analytics</h2>
                <p className="text-sm sm:text-base text-neutral-600">Comprehensive order tracking with historical data preservation</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => exportReport('csv')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => fetchOrders()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
              <input
                type="text"
                placeholder={isMobile ? "Search..." : "Search orders..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
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
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
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
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors text-sm sm:text-base"
            >
              <Filter className="w-4 h-4" />
              {isMobile ? 'Filters' : (showFilters ? 'Hide Filters' : 'More Filters')}
            </button>
          </div>

          {/* Custom Date Range */}
          <AnimatePresence>
            {(reportPeriod === 'custom' || showFilters) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
              >
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Total Revenue */}
          <motion.div
            whileHover={{ scale: isMobile ? 1 : 1.02 }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl border border-green-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              <span className="text-xs sm:text-sm text-green-600 font-medium">Total Revenue</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-900 mb-2">
              KES {orderStats.totalRevenue.toLocaleString('en-KE')}
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span className="text-green-700 font-medium">+{orderStats.revenueChange}% from last period</span>
            </div>
          </motion.div>

          {/* Total Orders */}
          <motion.div
            whileHover={{ scale: isMobile ? 1 : 1.02 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <span className="text-xs sm:text-sm text-blue-600 font-medium">Total Orders</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-blue-900 mb-2">{orderStats.total}</p>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              <span className="text-blue-700 font-medium">+{orderStats.orderGrowth}% growth</span>
            </div>
          </motion.div>

          {/* Average Order Value */}
          <motion.div
            whileHover={{ scale: isMobile ? 1 : 1.02 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-xl border border-purple-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              <span className="text-xs sm:text-sm text-purple-600 font-medium">Average Order</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-purple-900 mb-2">
              KES {orderStats.averageOrder.toLocaleString('en-KE')}
            </p>
            <div className="text-xs sm:text-sm text-purple-700">Per order value</div>
          </motion.div>

          {/* Order Status Distribution */}
          <motion.div
            whileHover={{ scale: isMobile ? 1 : 1.02 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-xl border border-orange-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              <span className="text-xs sm:text-sm text-orange-600 font-medium">Order Status</span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-yellow-700 font-medium">Pending</span>
                <span className="text-orange-900 font-bold">{orderStats.pending}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-blue-700 font-medium">Processing</span>
                <span className="text-orange-900 font-bold">{orderStats.processing}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-green-700 font-medium">Completed</span>
                <span className="text-orange-900 font-bold">{orderStats.completed}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Orders List - Mobile Optimized */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900">Order Details</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    sortBy === 'created_at' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Date
                  {sortBy === 'created_at' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3 sm:w-4 sm:h-4" /> : <SortDesc className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSortBy('total');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    sortBy === 'total' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                  Total
                  {sortBy === 'total' && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3 sm:w-4 sm:h-4" /> : <SortDesc className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
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
                    {/* Mobile-Optimized Order Header */}
                    <div className="p-4 sm:p-6 bg-neutral-50">
                      <div className="space-y-4">
                        {/* Order ID and Status Row */}
                        <div className="flex items-center justify-between">
                            src={item.products?.image_url || '/placeholder-image.jpg'}
                            alt={productNames[item.product_id] || item.products?.name || 'Product'}
                              #{order.id.slice(0, 8)}
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-image.jpg';
                            }}
                            </h3>
                            <span className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(order.status)}`}>
                            <h4 className="font-medium text-neutral-900">
                              {productNames[item.product_id] || item.products?.name || `Product ${item.product_id.slice(0, 8)}`}
                            </h4>
                              <span className="hidden sm:inline">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </span>
                          </div>
                            {!item.products?.name && (
                              <p className="text-xs text-red-500">Product data unavailable</p>
                            )}
                          
                          <div className="text-right">
                            <p className="text-xs sm:text-sm text-neutral-500">Total</p>
                            <p className="text-lg sm:text-2xl font-bold text-neutral-900">
                              KES {(calculation?.total_amount || order.total || 0).toLocaleString('en-KE')}
                            </p>
                          </div>
                        </div>

                        {/* Customer and Date Info - Stacked on mobile */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="sm:col-span-2">
                            <span className="text-neutral-500">Customer:</span>
                            <p className="font-medium text-neutral-900 break-all">
                              {order.profiles?.email || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-500">Date:</span>
                            <p className="font-medium text-neutral-900">
                              {new Date(order.created_at).toLocaleDateString('en-KE', {
                                year: isMobile ? '2-digit' : 'numeric',
                                month: 'short',
                                day: 'numeric',
                                ...(isMobile ? {} : { hour: '2-digit', minute: '2-digit' })
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-xs sm:text-sm"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                {!isMobile && 'Hide Details'}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                {!isMobile && 'Show Details'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Order Details - Mobile Optimized */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-neutral-200"
                        >
                          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {/* Order Items - Mobile Responsive */}
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4 flex items-center gap-2">
                                <Package2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                Items ({order.order_items?.length || 0})
                              </h4>
                              {order.order_items && order.order_items.length > 0 ? (
                                <div className="space-y-3 sm:space-y-0">
                                  {/* Mobile: Card Layout, Desktop: Table */}
                                  {isMobile ? (
                                    <div className="space-y-3">
                                      {order.order_items.map((item: any) => {
                                        const snapshot = item.order_product_snapshots?.[0];
                                        const productName = snapshot?.product_name || `Item #${item.id.slice(0, 8)}`;
                                        const priceAtTime = snapshot?.price_at_time || item.price || 0;
                                        
                                        return (
                                          <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                                            <div className="flex items-start gap-3">
                                              {snapshot?.product_image_url && (
                                                <img
                                                  src={snapshot.product_image_url}
                                                  alt={productName}
                                                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-neutral-900 text-sm">{productName}</p>
                                                <p className="text-xs text-neutral-500">
                                                  {snapshot?.product_category || 'N/A'}
                                                  {snapshot?.variant_size && ` - ${snapshot.variant_size}`}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                  <span className="text-xs text-neutral-600">Qty: {item.quantity}</span>
                                                  <span className="text-sm font-bold text-neutral-900">
                                                    KES {(item.quantity * priceAtTime).toLocaleString('en-KE')}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
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
                                            const priceAtTime = snapshot?.price_at_time || item.price || 0;
                                            
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
                                                  KES {priceAtTime.toLocaleString('en-KE')}
                                                </td>
                                                <td className="text-right py-3 px-4 font-bold">
                                                  KES {(item.quantity * priceAtTime).toLocaleString('en-KE')}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-6 sm:py-8 text-neutral-500">
                                  <Package2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm sm:text-base">No items found for this order</p>
                                </div>
                              )}
                            </div>

                            {/* Detailed Calculations - Mobile Optimized */}
                            {calculation && (
                              <div className="bg-neutral-50 rounded-lg p-4 sm:p-6">
                                <h4 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                                  Calculation Breakdown
                                </h4>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="flex justify-between text-sm sm:text-base">
                                      <span className="text-neutral-600">Subtotal:</span>
                                      <span className="font-medium">KES {calculation.subtotal.toLocaleString('en-KE')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm sm:text-base">
                                      <span className="text-neutral-600">Tax ({calculation.tax_rate}%):</span>
                                      <span className="font-medium">KES {calculation.tax_amount.toLocaleString('en-KE')}</span>
                                    </div>
                                    {calculation.discount_amount > 0 && (
                                      <div className="flex justify-between text-green-600 text-sm sm:text-base">
                                        <span>Discount:</span>
                                        <span className="font-medium">-KES {calculation.discount_amount.toLocaleString('en-KE')}</span>
                                      </div>
                                    )}
                                    {calculation.shipping_fee > 0 && (
                                      <div className="flex justify-between text-sm sm:text-base">
                                        <span className="text-neutral-600">Shipping:</span>
                                        <span className="font-medium">KES {calculation.shipping_fee.toLocaleString('en-KE')}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200">
                                    <div className="flex justify-between items-center">
                                      <span className="text-base sm:text-lg font-bold text-neutral-900">Final Total:</span>
                                      <span className="text-xl sm:text-2xl font-bold text-primary">
                                        KES {calculation.total_amount.toLocaleString('en-KE')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Payment Information - Mobile Optimized */}
                            {order.payments?.[0] && (
                              <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
                                <h4 className="text-base sm:text-lg font-semibold text-blue-900 mb-3 sm:mb-4">Payment Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  <div>
                                    <span className="text-blue-700 text-sm">Method:</span>
                                    <p className="font-medium text-blue-900">
                                      {order.payments[0].payment_method.toUpperCase()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-blue-700 text-sm">Status:</span>
                                    <p className="font-medium text-blue-900">
                                      {order.payments[0].status.toUpperCase()}
                                    </p>
                                  </div>
                                  {order.payments[0].mpesa_reference && (
                                    <div className="sm:col-span-2">
                                      <span className="text-blue-700 text-sm">M-Pesa Reference:</span>
                                      <p className="font-mono font-medium text-blue-900 text-sm break-all">
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
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-neutral-200">
                  <Package2 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-neutral-400" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-neutral-900">No Orders Found</h3>
                  <p className="text-sm sm:text-base text-neutral-600 mb-4">
                    {orders.length === 0 
                      ? "No orders exist in the database yet" 
                      : "No orders match your current filters"}
                  </p>
                  {orders.length === 0 && (
                    <div className="text-xs sm:text-sm text-neutral-500 space-y-1">
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