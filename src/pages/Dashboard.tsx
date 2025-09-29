
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Package,
  DollarSign,
  Download,
  BarChart3,
  Users,
  AlertTriangle,
} from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

function exportToCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    alert("⚠️ No data to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

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
    totalRevenue: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    todayRevenue: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("id, product_id, product_name, quantity, unit_price, total, profit, timestamp, payment_method")
          .order("timestamp", { ascending: false });

        if (salesError) throw new Error(`Sales fetch error: ${salesError.message}`);

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, category, price, sellingPrice");

        if (productsError) throw new Error(`Products fetch error: ${productsError.message}`);

        let totalRevenue = 0,
          totalProfit = 0,
          todayRevenue = 0;

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const productSalesMap: Record<string, any> = {};
        const salesByDate: Record<string, number> = {};
        const transactionGroups: Record<string, { timestamp: string; total: number }> = {};

        salesData?.forEach((sale) => {
          totalRevenue += Number(sale.total || 0);
          totalProfit += Number(sale.profit || 0);

          const saleDate = new Date(sale.timestamp).toISOString().split("T")[0];
          if (saleDate === todayStr) todayRevenue += Number(sale.total || 0);

          salesByDate[saleDate] = (salesByDate[saleDate] || 0) + Number(sale.total || 0);

          // Group sales by timestamp proximity (within 1 minute) to count transactions
          const timestamp = new Date(sale.timestamp).toISOString();
          const minuteKey = new Date(Math.floor(new Date(timestamp).getTime() / 60000) * 60000).toISOString();
          if (!transactionGroups[minuteKey]) {
            transactionGroups[minuteKey] = { timestamp, total: 0 };
          }
          transactionGroups[minuteKey].total += Number(sale.total || 0);

          // Calculate top products
          const product = productsData?.find((p) => p.id === sale.product_id);
          const name = sale.product_name || "Unnamed";
          const qty = sale.quantity || 0;
          const revenue = qty * Number(sale.unit_price || 0);
          const profit = qty * Number(sale.profit || 0) / qty; // Per-unit profit
          if (!productSalesMap[name]) {
            productSalesMap[name] = {
              name,
              qty: 0,
              revenue: 0,
              profit: 0,
              category: product?.category || "Unknown",
            };
          }
          productSalesMap[name].qty += qty;
          productSalesMap[name].revenue += revenue;
          productSalesMap[name].profit += qty * (Number(sale.unit_price || 0) - Number(product?.price || sale.unit_price * 0.7));
        });

        const totalTransactions = Object.keys(transactionGroups).length;
        const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        const topProducts = Object.values(productSalesMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map((p) => ({
            name: p.name,
            qty: p.qty,
            revenue: Number(p.revenue.toFixed(2)),
            profit: Number(p.profit.toFixed(2)),
            category: p.category,
          }));

        const last30Days = [...Array(30)]
          .map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            return d.toISOString().split("T")[0];
          })
          .reverse();

        const chartData = last30Days.map((date) => ({
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          fullDate: date,
          total: Number((salesByDate[date] || 0).toFixed(2)),
          transactions: Object.values(transactionGroups).filter((t) =>
            t.timestamp.startsWith(date)
          ).length,
        }));

        const trendData = last30Days.slice(-7).map((date) => ({
          date: new Date(date).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          sales: Number((salesByDate[date] || 0).toFixed(2)),
        }));

        const categoryCount: Record<string, number> = {};
        productsData?.forEach((p) => {
          categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
          name,
          value,
        }));

        setStats({
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          totalProducts: productsData?.length || 0,
          totalTransactions,
          averageOrderValue: Number(averageOrderValue.toFixed(2)),
          todayRevenue: Number(todayRevenue.toFixed(2)),
        });
        setChartData(chartData);
        setSalesTrend(trendData);
        setTopProducts(topProducts);
        setCategoryData(categoryData);
      } catch (error: any) {
        console.error("Dashboard fetch error:", error);
        setError(`Failed to load dashboard data: ${error.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to real-time sales updates
    const salesChannel = supabase
      .channel("sales_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-pulse px-2 sm:px-4 lg:px-0">
          <div className="h-8 bg-slate-700 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-slate-800 rounded-2xl p-4 sm:p-6 h-28 sm:h-32 md:h-36"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 h-64 sm:h-72 md:h-80"></div>
            <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 h-64 sm:h-72 md:h-80"></div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 h-56 sm:h-64 md:h-72"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Error Loading Dashboard</h2>
            <p className="text-slate-400 text-sm sm:text-base">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-2 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
        <div className="pt-12 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 sm:h-10 w-8 sm:w-10 text-emerald-400" /> Dashboard Analytics
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            Monitor your business performance in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card
            icon={<DollarSign className="h-5 sm:h-6 w-5 sm:w-6" />}
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            color="emerald"
            info="All time revenue"
          />
          <Card
            icon={<TrendingUp className="h-5 sm:h-6 w-5 sm:w-6" />}
            label="Total Profit"
            value={formatCurrency(stats.totalProfit)}
            color="blue"
            info="Net earnings"
          />
          <Card
            icon={<Package className="h-5 sm:h-6 w-5 sm:w-6" />}
            label="Products"
            value={stats.totalProducts}
            color="purple"
            info="Total inventory"
          />
          <Card
            icon={<Users className="h-5 sm:h-6 w-5 sm:w-6" />}
            label="Transactions"
            value={stats.totalTransactions}
            color="amber"
            info="Total orders"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ChartCard
            title="30-Day Sales Trend"
            exportFilename="sales_trend.csv"
            data={chartData.map((d) => ({
              date: d.fullDate,
              total: d.total,
              transactions: d.transactions,
            }))}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: window.innerWidth < 640 ? 10 : 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={window.innerWidth < 640 ? 10 : 12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={window.innerWidth < 640 ? 10 : 12} tickLine={false} tickFormatter={(v) => `KES ${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                  formatter={(value, name) => [formatCurrency(Number(value)), name === "total" ? "Sales" : "Transactions"]}
                  trigger={window.innerWidth < 640 ? "click" : "hover"}
                />
                <Bar dataKey="total" fill="url(#emeraldGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Product Categories">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      window.innerWidth < 640 ? name : `${name} (${((percent as number) * 100).toFixed(0)}%)`
                    }
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                    trigger={window.innerWidth < 640 ? "click" : "hover"}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<Package className="h-8 w-8" />} text="No category data available" />
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Top Selling Products"
          exportFilename="top_products.csv"
          data={topProducts}
        >
          <div className="sm:overflow-x-auto">
            {window.innerWidth < 640 ? (
              <div className="space-y-4">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? "bg-yellow-500 text-yellow-900"
                            : idx === 1
                            ? "bg-slate-400 text-slate-900"
                            : idx === 2
                            ? "bg-amber-600 text-amber-100"
                            : "bg-slate-600 text-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-white font-medium">{p.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400">Units Sold:</span> {p.qty} units
                      </div>
                      <div>
                        <span className="text-slate-400">Revenue:</span> {formatCurrency(p.revenue)}
                      </div>
                      <div>
                        <span className="text-slate-400">Profit:</span> {formatCurrency(p.profit)}
                      </div>
                      <div>
                        <span className="text-slate-400">Category:</span> {p.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Rank", "Product", "Category", "Units Sold", "Revenue", "Profit"].map((h) => (
                      <th key={h} className="text-left py-4 px-6 text-slate-300 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-400 py-12">
                        <EmptyState
                          icon={<Package className="h-8 w-8" />}
                          text="No sales data available yet"
                          subText="Start making sales to see your top products"
                        />
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors duration-200"
                      >
                        <td className="py-4 px-6">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0
                                ? "bg-yellow-500 text-yellow-900"
                                : idx === 1
                                ? "bg-slate-400 text-slate-900"
                                : idx === 2
                                ? "bg-amber-600 text-amber-100"
                                : "bg-slate-600 text-slate-200"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-white font-medium whitespace-nowrap">{p.name}</td>
                        <td className="py-4 px-6 text-slate-300 whitespace-nowrap">{p.category}</td>
                        <td className="py-4 px-6 text-slate-300 whitespace-nowrap">{p.qty} units</td>
                        <td className="py-4 px-6 text-emerald-400 font-bold whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                        <td className="py-4 px-6 text-blue-400 font-bold whitespace-nowrap">{formatCurrency(p.profit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function Card({ icon, label, value, color, info }: any) {
  const colors: Record<string, string> = {
    emerald: "emerald",
    blue: "blue",
    purple: "purple",
    amber: "amber",
  };
  return (
    <div
      className={`bg-gradient-to-r from-${colors[color]}-500/10 to-${colors[color]}-600/10 backdrop-blur-sm border border-${colors[color]}-500/20 rounded-2xl p-4 sm:p-6 hover:border-${colors[color]}-400/30 transition-all duration-300`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4">
        <div className={`p-3 sm:p-4 bg-${colors[color]}-500/20 rounded-xl mb-2 sm:mb-0`}>{icon}</div>
        <div className="text-left sm:text-right">
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      <div className={`flex items-center text-${colors[color]}-400 text-xs sm:text-sm gap-1`}>
        <TrendingUp className="h-4 w-4" /> {info}
      </div>
    </div>
  );
}

function ChartCard({ title, children, exportFilename, data }: any) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:border-slate-600/50 transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">{title}</h2>
        {exportFilename && data && (
          <button
            onClick={() => exportToCSV(exportFilename, data)}
            className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 sm:px-5 py-3 rounded-xl transition-all duration-300 text-sm"
          >
            <Download className="h-5 w-5" /> Export
          </button>
        )}
      </div>
      <div className="h-64 sm:h-80 w-full">{children}</div>
    </div>
  );
}

function EmptyState({ icon, text, subText }: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 px-4">
      <div className="text-center space-y-2">
        <div className="mb-2">{icon}</div>
        <p className="text-base sm:text-lg font-medium">{text}</p>
        {subText && <p className="text-xs sm:text-sm text-slate-500">{subText}</p>}
      </div>
    </div>
  );
}
