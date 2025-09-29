
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  History,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  Download,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Types
interface Sale {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  profit: number;
  payment_method?: string;
  customer?: string;
  discount?: number;
  timestamp: string;
}

// Utility Functions
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } else if (diffInHours < 168) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
};

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch Sales
  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sales")
        .select("*")
        .order("timestamp", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filter !== "all") {
        const now = new Date();
        let startDate = new Date();

        switch (filter) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        query = query.gte("timestamp", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      console.error("Fetch sales error:", err.message || err);
      alert(`Failed to fetch sales: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filter, page]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const productName = sale.product_name?.toLowerCase() || "";
      const customer = sale.customer?.toLowerCase() || "";
      return productName.includes(searchLower) || customer.includes(searchLower);
    });
  }, [sales, searchTerm]);

  // Analytics
  const analytics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
    const totalTransactions = filteredSales.length;
    const totalItems = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
    const averageSale = totalTransactions ? totalRevenue / totalTransactions : 0;

    return { totalRevenue, totalProfit, totalTransactions, totalItems, averageSale };
  }, [filteredSales]);

  // CSV Export
  const exportToCSV = () => {
    const headers = ["Date", "Customer", "Product", "Quantity", "Unit Price", "Total", "Profit", "Payment Method", "Discount"];
    const csvData = filteredSales.map((sale) => [
      new Date(sale.timestamp).toLocaleDateString(),
      sale.customer || "N/A",
      sale.product_name,
      sale.quantity,
      formatCurrency(sale.unit_price),
      formatCurrency(sale.total),
      formatCurrency(sale.profit),
      sale.payment_method || "Cash",
      sale.discount || 0,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16 p-4 overflow-x-hidden">
        <div className="max-w-full mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-purple-400" />
              <span className="text-white text-lg font-bold">Loading Sales History...</span>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-700/50 rounded-xl h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16 p-4 overflow-x-hidden">
      <div className="max-w-full mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 transition-all duration-300">
          {/* Header + Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Sales History</h2>
                <p className="text-slate-400 text-xs">
                  {filteredSales.length} of {sales.length} transactions
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative w-full max-w-full">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-full pl-8 pr-3 py-2 bg-slate-900/50 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm"
                />
              </div>

              <div className="flex flex-col gap-3">
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full max-w-full px-3 py-2 bg-slate-900/50 border border-slate-600/30 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>

                <div className="flex flex-col gap-3">
                  {filteredSales.length > 0 && (
                    <button
                      onClick={exportToCSV}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-medium transition-all duration-300"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  )}
                  <button
                    onClick={fetchSales}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          {filteredSales.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <Card
                icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
                label="Revenue"
                value={formatCurrency(analytics.totalRevenue)}
              />
              <Card
                icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
                label="Profit"
                value={formatCurrency(analytics.totalProfit)}
                valueColor="text-blue-400"
              />
              <Card
                icon={<ShoppingBag className="h-4 w-4 text-purple-400" />}
                label="Transactions"
                value={analytics.totalTransactions}
              />
              <Card
                icon={<Package className="h-4 w-4 text-amber-400" />}
                label="Items Sold"
                value={analytics.totalItems}
                valueColor="text-amber-400"
              />
              <Card
                icon={<DollarSign className="h-4 w-4 text-amber-400" />}
                label="Average Sale"
                value={formatCurrency(analytics.averageSale)}
                valueColor="text-amber-400"
              />
            </div>
          )}

          {/* Sales List */}
          {filteredSales.length === 0 ? (
            <EmptyState searchTerm={searchTerm} />
          ) : (
            <>
              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {filteredSales.map((sale, index) => (
                  <SaleCard key={sale.id} sale={sale} index={index} />
                ))}
              </div>
              {/* Pagination */}
              <div className="flex flex-wrap justify-between items-center gap-3 mt-3">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-xs font-medium disabled:opacity-50 transition-all duration-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-slate-300 text-xs">Page {page}</span>
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={filteredSales.length < itemsPerPage}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-xs font-medium disabled:opacity-50 transition-all duration-300"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function Card({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-slate-400 text-xs truncate">{label}</span>
      </div>
      <div className={`text-sm font-bold ${valueColor || "text-white"} truncate`}>{value}</div>
    </div>
  );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="text-center py-8">
      <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400 text-sm mb-1">
        {searchTerm ? "No matching sales found" : "No sales recorded yet"}
      </p>
      <p className="text-slate-500 text-xs">
        {searchTerm ? "Try adjusting your search terms" : "Your sales transactions will appear here"}
      </p>
    </div>
  );
}

function SaleCard({ sale, index }: { sale: Sale; index: number }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all duration-300">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-purple-400 font-bold text-xs">#{index + 1}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400 truncate">{formatCurrency(sale.total)}</span>
              <span className="text-blue-400 text-xs font-medium truncate">(+{formatCurrency(sale.profit)})</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-xs">
              <div className="flex items-center gap-1 min-w-0">
                <Calendar className="h-3 w-3" />
                <span className="truncate">{formatDate(sale.timestamp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs bg-slate-700/50 px-2 py-1 rounded truncate">
                  {sale.payment_method || "Cash"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700/50 pt-3">
          <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="h-3 w-3 text-slate-400" />
              </div>
              <div className="min-w-0">
                <span className="text-white font-medium text-sm truncate">{sale.product_name}</span>
                <div className="text-slate-400 text-xs">
                  {sale.quantity} × {formatCurrency(sale.unit_price)}
                </div>
              </div>
            </div>
            <div className="text-right text-slate-300 font-medium text-sm truncate">
              {formatCurrency(sale.quantity * sale.unit_price)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
