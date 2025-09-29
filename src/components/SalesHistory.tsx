import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  History,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  User,
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



// Main Component
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
      const productName = sale.product_name.toLowerCase();
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
      sale.product_name,
      sale.quantity,
      formatCurrency(sale.unit_price),
      formatCurrency(sale.total),
      formatCurrency(sale.profit),
      sale.payment_method || "Cash",
      sale.discount || 0,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
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
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <History className="h-6 w-6 text-purple-400" />
          <span className="text-white text-2xl font-bold">Loading Sales History...</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 transition-all duration-300">
      {/* Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Sales History</h2>
            <p className="text-slate-400 text-sm">
              {filteredSales.length} of {sales.length} transactions
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 w-full transition-all duration-300"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1); // Reset to first page on filter change
            }}
            className="px-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 min-w-[120px] transition-all duration-300"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          {/* Buttons */}
          {filteredSales.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 rounded-xl text-sm font-medium min-w-[110px] transition-all duration-300"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}

          <button
            onClick={fetchSales}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-sm font-medium min-w-[110px] transition-all duration-300"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {filteredSales.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
          <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-2">
            {filteredSales.map((sale, index) => (
              <SaleCard key={sale.id} sale={sale} index={index} />
            ))}
          </div>
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all duration-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-slate-300 text-sm">Page {page}</span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={filteredSales.length < itemsPerPage}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all duration-300"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Subcomponents
const Card = ({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string | number; valueColor?: string }) => (
  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-slate-400 text-sm">{label}</span>
    </div>
    <div className={`text-lg font-bold ${valueColor || "text-white"}`}>{value}</div>
  </div>
);

const EmptyState = ({ searchTerm }: { searchTerm: string }) => (
  <div className="text-center py-12">
    <ShoppingBag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
    <p className="text-slate-400 text-lg mb-2">
      {searchTerm ? "No matching sales found" : "No sales recorded yet"}
    </p>
    <p className="text-slate-500 text-sm">
      {searchTerm ? "Try adjusting your search terms" : "Your sales transactions will appear here"}
    </p>
  </div>
);

const SaleCard = ({ sale, index }: { sale: Sale; index: number }) => (
  <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-300">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <span className="text-purple-400 font-bold text-sm">#{index + 1}</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400">{formatCurrency(sale.total)}</span>
            <span className="text-blue-400 text-sm font-medium">(+{formatCurrency(sale.profit)})</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(sale.timestamp)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs bg-slate-700/50 px-2 py-1 rounded">{sale.payment_method || "Cash"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Item */}
    <div className="border-t border-slate-700/50 pt-4">
      <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <span className="text-white font-medium">{sale.product_name}</span>
            <div className="text-slate-400 text-xs">
              {sale.quantity} × {formatCurrency(sale.unit_price)}
            </div>
          </div>
        </div>
        <div className="text-right text-slate-300 font-medium">
          {formatCurrency(sale.quantity * sale.unit_price)}
        </div>
      </div>
    </div>
  </div>
);