import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package2, Download, Search, Calendar, Filter, 
  ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertCircle, Truck, RefreshCcw
} from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<string>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    totalRevenue: 0,
    averageOrder: 0,
    revenueChange: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (email),
          order_items (
            *,
            products (name, price)
          ),
          payments (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate order statistics
      const stats = ordersData?.reduce((acc, order) => {
        // Count by status
        acc[order.status] = (acc[order.status] || 0) + 1;
        acc.total++;

        // Calculate revenue
        const orderTotal = order.order_items.reduce((sum, item) => 
          sum + (item.quantity * item.products.price), 0);
        acc.totalRevenue += orderTotal;

        return acc;
      }, { total: 0, pending: 0, processing: 0, completed: 0, totalRevenue: 0 });

      setOrderStats({
        ...stats,
        averageOrder: stats.total > 0 ? stats.totalRevenue / stats.total : 0,
        revenueChange: 0 // You can calculate this by comparing with previous period
      });

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      
      // Show success feedback
      const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
      if (orderElement) {
        orderElement.classList.add('bg-green-50');
        setTimeout(() => orderElement.classList.remove('bg-green-50'), 2000);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'processing':
        return 'bg-blue-500/20 text-blue-500';
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
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
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    
    switch (reportPeriod) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'weekly':
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        return { start, end: now };
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1);
        return { start, end: now };
      case 'custom':
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
        };
      default:
        return { start, end: now };
    }
  };

  const downloadReport = () => {
    const { start, end } = getDateRange();
    
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= start && orderDate <= end;
    });

    const csvContent = [
      'PENCHIC FARM - ORDER REPORT',
      `Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      '',
      ['Order ID', 'Customer Email', 'Items', 'Total Amount', 'Payment Method', 'Status', 'Date'].join(','),
      ...filteredOrders.map(order => [
        order.id,
        order.profiles?.email || 'N/A',
        order.order_items.map(item => `${item.products.name} (${item.quantity})`).join('; '),
        `KES ${order.total.toLocaleString('en-KE')}`,
        order.payments?.[0]?.payment_method.toUpperCase() || 'N/A',
        order.status,
        new Date(order.created_at).toLocaleString()
      ].join(',')),
      '',
      `Total Orders,${filteredOrders.length}`,
      `Total Revenue,KES ${orderStats.totalRevenue.toLocaleString('en-KE')}`,
      `Average Order Value,KES ${orderStats.averageOrder.toLocaleString('en-KE')}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `penchic-farm-orders-${reportPeriod}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const filteredOrders = orders
    .filter(order => filter === 'all' || order.status === filter)
    .filter(order => 
      searchTerm === '' || 
      order.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-neutral-900">Orders Management</h1>
                <p className="text-neutral-600">Manage and track all orders</p>
              </div>
              <button
                onClick={downloadReport}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              {/* Total Orders */}
              <div className="bg-neutral-50 p-4 md:p-6 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <Package2 className="w-8 h-8 text-blue-500" />
                  <span className="text-sm text-neutral-500 font-medium">Total Orders</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">{orderStats.total}</p>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">+12% from last period</span>
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-neutral-50 p-4 md:p-6 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <span className="text-sm text-neutral-500 font-medium">Total Revenue</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
                  KES {orderStats.totalRevenue.toLocaleString('en-KE')}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">+8% from last period</span>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="bg-neutral-50 p-4 md:p-6 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <span className="text-sm text-neutral-500 font-medium">Average Order</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
                  KES {orderStats.averageOrder.toLocaleString('en-KE')}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">+5% from last period</span>
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-neutral-50 p-4 md:p-6 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <Truck className="w-8 h-8 text-orange-500" />
                  <span className="text-sm text-neutral-500 font-medium">Order Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600 font-medium">Pending</span>
                    <span className="text-neutral-900 font-medium">{orderStats.pending}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 font-medium">Processing</span>
                    <span className="text-neutral-900 font-medium">{orderStats.processing}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Completed</span>
                    <span className="text-neutral-900 font-medium">{orderStats.completed}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6 md:mb-8">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="daily">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                  <option value="yearly">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                {reportPeriod === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4 md:space-y-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-neutral-50 rounded-lg p-4 md:p-6 border border-neutral-200">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-900">Order #{order.id.slice(0, 8)}</h3>
                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-neutral-600">{order.profiles?.email || 'N/A'}</p>
                      <p className="text-neutral-500 text-sm">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="w-full lg:w-auto">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="w-full lg:w-auto px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 pt-4">
                    <div className="space-y-2">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Package2 className="w-4 h-4 text-neutral-400" />
                            <span className="text-neutral-900">{item.products.name}</span>
                            <span className="text-neutral-500">x {item.quantity}</span>
                          </div>
                          <span className="font-medium text-neutral-900">
                            KES {(item.products.price * item.quantity).toLocaleString('en-KE')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-neutral-200 gap-2">
                      <div className="text-sm text-neutral-500">
                        Payment via {order.payments?.[0]?.payment_method.toUpperCase() || 'N/A'}
                      </div>
                      <div className="text-lg md:text-xl font-bold text-neutral-900">
                        Total: KES {order.total.toLocaleString('en-KE')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
                  <Package2 className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Orders Found</h3>
                  <p className="text-neutral-600">No orders match your current filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;