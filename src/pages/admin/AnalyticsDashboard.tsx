import React, { useState, useEffect } from 'react';
import {
  Package2,
  ShoppingCart,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';

const AnalyticsDashboard: React.FC = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [allStockProducts, setAllStockProducts] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [showAllStock, setShowAllStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestOrders, setLatestOrders] = useState([]);
  const [timeRange, setTimeRange] = useState('current');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [monthlyComparison, setMonthlyComparison] = useState({
    currentMonth: { revenue: 0, orders: 0 },
    previousMonth: { revenue: 0, orders: 0 },
    percentageChange: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get current and previous month dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Fetch products data
        const { data: allData, error: allError } = await supabase
          .from('products')
          .select('id, name, stock, price');

        if (allError) throw allError;

        setAllStockProducts(allData || []);
        const lowStock = allData.filter((item) => item.stock < 5);
        setLowStockProducts(lowStock);

        // Fetch current month orders with inner join to ensure products exist
        const { data: currentMonthOrders, error: currentError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items!inner (
              quantity,
              products!inner (
                name,
                price
              )
            )
          `)
          .gte('created_at', currentMonthStart.toISOString())
          .lte('created_at', now.toISOString())
          .order('created_at', { ascending: false });

        if (currentError) throw currentError;

        // Fetch previous month orders with inner join
        const { data: previousMonthOrders, error: previousError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items!inner (
              quantity,
              products!inner (
                name,
                price
              )
            )
          `)
          .gte('created_at', previousMonthStart.toISOString())
          .lte('created_at', previousMonthEnd.toISOString())
          .order('created_at', { ascending: false });

        if (previousError) throw previousError;

        // Calculate current month metrics with null checks
        const currentRevenue = (currentMonthOrders || []).reduce((acc, order) => {
          const orderTotal = (order.order_items || []).reduce((itemAcc, item) => {
            if (!item?.products?.price) return itemAcc;
            return itemAcc + (item.quantity * item.products.price);
          }, 0);
          return acc + orderTotal;
        }, 0);

        // Calculate previous month metrics with null checks
        const prevRevenue = (previousMonthOrders || []).reduce((acc, order) => {
          const orderTotal = (order.order_items || []).reduce((itemAcc, item) => {
            if (!item?.products?.price) return itemAcc;
            return itemAcc + (item.quantity * item.products.price);
          }, 0);
          return acc + orderTotal;
        }, 0);

        // Calculate percentage change
        const percentageChange = prevRevenue > 0 
          ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
          : 100;

        setMonthlyComparison({
          currentMonth: {
            revenue: currentRevenue,
            orders: currentMonthOrders?.length || 0
          },
          previousMonth: {
            revenue: prevRevenue,
            orders: previousMonthOrders?.length || 0
          },
          percentageChange
        });

        setTotalOrders(currentMonthOrders?.length || 0);
        setTotalRevenue(currentRevenue);
        setPreviousRevenue(prevRevenue);
        setRevenueChange(percentageChange);
        setAvgOrderValue(currentMonthOrders?.length > 0 ? currentRevenue / currentMonthOrders.length : 0);

        // Calculate top selling products with null checks
        const productSales = {};
        (currentMonthOrders || []).forEach(order => {
          (order.order_items || []).forEach(item => {
            if (!item?.products?.name) return;
            const productId = item.products.name;
            productSales[productId] = (productSales[productId] || 0) + (item.quantity || 0);
          });
        });

        const topProducts = Object.entries(productSales)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, quantity]) => ({ name, quantity }));

        setTopSellingProducts(topProducts);
        setLatestOrders(currentMonthOrders?.slice(0, 5) || []);

      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, customStartDate, customEndDate]);

  if (loading) {
    return (
      <AdminLayout title="Analytics Dashboard" subtitle="Business insights and performance metrics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Analytics Dashboard" subtitle="Business insights and performance metrics">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-center">{error}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics Dashboard" subtitle="Business insights and performance metrics">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neutral-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="current">Current Month</option>
                <option value="previous">Previous Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {timeRange === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Revenue Card */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-sm text-neutral-500 font-medium">Revenue</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              KES {totalRevenue.toLocaleString('en-KE')}
            </p>
            <div className="flex items-center text-sm mb-2">
              {revenueChange > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`font-medium ${revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(revenueChange).toFixed(1)}% from last month
              </span>
            </div>
            <p className="text-neutral-500 text-sm">
              Last Month: KES {previousRevenue.toLocaleString('en-KE')}
            </p>
          </div>

          {/* Orders Card */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <ShoppingCart className="w-8 h-8 text-blue-500" />
              <span className="text-sm text-neutral-500 font-medium">Orders</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              {monthlyComparison.currentMonth.orders}
            </p>
            <div className="flex items-center text-sm mb-2">
              {monthlyComparison.currentMonth.orders > monthlyComparison.previousMonth.orders ? (
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`font-medium ${
                monthlyComparison.currentMonth.orders > monthlyComparison.previousMonth.orders 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.abs(
                  ((monthlyComparison.currentMonth.orders - monthlyComparison.previousMonth.orders) / 
                  (monthlyComparison.previousMonth.orders || 1)) * 100
                ).toFixed(1)}% from last month
              </span>
            </div>
            <p className="text-neutral-500 text-sm">
              Last Month: {monthlyComparison.previousMonth.orders} orders
            </p>
          </div>

          {/* Average Order Value */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <span className="text-sm text-neutral-500 font-medium">Avg. Order</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              KES {avgOrderValue.toLocaleString('en-KE')}
            </p>
            <p className="text-neutral-500 text-sm">Per order value</p>
          </div>

          {/* Stock Alerts */}
          <div
            className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setShowAllStock(!showAllStock)}
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <span className="text-sm text-neutral-500 font-medium">Stock Alerts</span>
            </div>
            {!showAllStock ? (
              lowStockProducts.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {lowStockProducts.map((product) => (
                    <li key={product.id} className="text-red-600">
                      ⚠️ <strong>{product.name}</strong> ({product.stock} left)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600 font-medium">All products in stock ✅</p>
              )
            ) : (
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {allStockProducts.map((product) => (
                  <li
                    key={product.id}
                    className={`flex justify-between ${
                      product.stock < 5 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    <span className="truncate mr-2">{product.name}</span>
                    <span className="font-medium">{product.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Top Selling Products */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">Top Selling Products</h2>
              <Package2 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <div className="space-y-4">
              {topSellingProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-neutral-400 mr-4">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">{product.name}</p>
                      <p className="text-sm text-neutral-600">
                        {product.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-20 md:w-24 bg-neutral-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(product.quantity / topSellingProducts[0].quantity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {topSellingProducts.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  <Package2 className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No sales data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Latest Orders */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">Latest Orders</h2>
              <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <div className="space-y-4">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-2 text-neutral-900">Order #{order.id.slice(0, 8)}</h3>
                      <div className="space-y-1">
                        {order.order_items.map((item, index) => (
                          <p key={index} className="text-neutral-600 text-sm">
                            {item.products.name} x {item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">
                        KES {order.order_items.reduce((acc, item) => 
                          acc + (item.quantity * item.products.price), 0
                        ).toLocaleString('en-KE')}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {latestOrders.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No recent orders</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;