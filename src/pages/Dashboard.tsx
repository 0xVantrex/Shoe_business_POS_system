import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Download, 
  Trophy, 
  BarChart3, 
  Users,
  ShoppingCart,
  Calendar,
  AlertTriangle
} from "lucide-react";

// CSV Export Helper
function exportToCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    alert("⚠️ No data to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent =
    [headers.join(","), ...rows.map((row) => headers.map((h) => `"${row[h]}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    todayRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch sales with profit data
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("total, profit, created_at, items, payment_method, customer");

        if (salesError) throw salesError;

        // Fetch product count and categories
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, category, stock");

        if (productsError) throw productsError;

        // Calculate statistics
        const totalSales = salesData?.reduce((sum, s) => sum + s.total, 0) || 0;
        const totalProfit = salesData?.reduce((sum, s) => sum + (s.profit || 0), 0) || 0;
        const totalTransactions = salesData?.length || 0;
        const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // Today's revenue
        const today = new Date().toISOString().split("T")[0];
        const todaySales = salesData?.filter((s) => s.created_at.startsWith(today));
        const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total, 0) || 0;

        // Chart data (last 30 days)
        const last30Days = [...Array(30)].map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        }).reverse();

        const salesByDate: { [date: string]: number } = {};
        salesData?.forEach((s) => {
          const date = s.created_at.split("T")[0];
          if (last30Days.includes(date)) {
            salesByDate[date] = (salesByDate[date] || 0) + s.total;
          }
        });

        const chartData = last30Days.map(date => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date,
          total: salesByDate[date] || 0,
        }));

        // Sales trend for line chart (last 7 days)
        const last7Days = last30Days.slice(-7);
        const trendData = last7Days.map(date => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: salesByDate[date] || 0,
        }));

        // Top products leaderboard
        const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
        salesData?.forEach((sale) => {
          sale.items?.forEach((item: any) => {
            if (item.name) {
              if (!productSales[item.name]) {
                productSales[item.name] = { 
                  name: item.name, 
                  qty: 0, 
                  revenue: 0, 
                  profit: (item.price - (item.costPrice || item.price * 0.7)) * item.qty 
                };
              }
              productSales[item.name].qty += item.qty || item.quantity || 0;
              productSales[item.name].revenue += (item.qty || item.quantity || 0) * (item.price || item.unit_price || 0);
            }
          });
        });

        const sortedProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Category distribution
        const categoryDistribution: Record<string, number> = {};
        productsData?.forEach(product => {
          categoryDistribution[product.category] = (categoryDistribution[product.category] || 0) + 1;
        });

        const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
          name,
          value,
        }));

        setStats({ 
          totalSales, 
          totalProducts: productsData?.length || 0, 
          todayRevenue, 
          totalProfit,
          totalTransactions,
          averageOrderValue
        });
        setChartData(chartData);
        setTopProducts(sortedProducts);
        setSalesTrend(trendData);
        setCategoryData(categoryData);

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error.message);
        alert("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-slate-800 rounded-2xl p-6 h-32"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-slate-800 rounded-2xl p-6 h-96"></div>
              <div className="bg-slate-800 rounded-2xl p-6 h-96"></div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-emerald-400" />
            Dashboard Analytics
          </h1>
          <p className="text-slate-400 text-lg">Monitor your business performance in real-time</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalSales)}</p>
              </div>
            </div>
            <div className="flex items-center text-emerald-400 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              All time revenue
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 hover:border-blue-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium">Total Profit</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalProfit)}</p>
              </div>
            </div>
            <div className="flex items-center text-blue-400 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Net earnings
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Package className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium">Products</p>
                <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
              </div>
            </div>
            <div className="flex items-center text-purple-400 text-sm">
              <Package className="h-4 w-4 mr-1" />
              Total inventory
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6 hover:border-amber-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Users className="h-6 w-6 text-amber-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium">Transactions</p>
                <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
              </div>
            </div>
            <div className="flex items-center text-amber-400 text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              Total orders
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">30-Day Sales Trend</h2>
                <p className="text-slate-400 text-sm">Daily revenue overview</p>
              </div>
              <button
                onClick={() => exportToCSV("sales_trend.csv", chartData)}
                className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `KES ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f8fafc'
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="url(#emeraldGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Product Categories</h2>
                <p className="text-slate-400 text-sm">Inventory distribution</p>
              </div>
            </div>
            <div className="h-80">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(Number(percent) * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map(( index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                    <p>No category data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-white">Top Selling Products</h2>
                <p className="text-slate-400">Your best performing items</p>
              </div>
            </div>
            <button
              onClick={() => exportToCSV("top_products.csv", topProducts)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          
          <div className="bg-slate-900/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Rank</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Product</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Units Sold</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Revenue</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Profit</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Package className="h-12 w-12 text-slate-600" />
                        <p className="text-lg">No sales data available yet</p>
                        <p className="text-sm text-slate-500">Start making sales to see your top products</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors duration-200"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-900' :
                            index === 1 ? 'bg-slate-400 text-slate-900' :
                            index === 2 ? 'bg-amber-600 text-amber-100' :
                            'bg-slate-600 text-slate-200'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white font-medium">{product.name}</td>
                      <td className="py-4 px-6 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                            {product.qty} units
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="py-4 px-6 text-blue-400 font-bold">
                        {formatCurrency(product.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}