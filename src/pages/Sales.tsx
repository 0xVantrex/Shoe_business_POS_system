import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ShoppingCart, Plus, Package, Search, Filter } from "lucide-react";
import Cart from "../components/Cart";
import SalesHistory from "../components/SalesHistory";
import SalesForm from "../components/SalesForm";

export default function Sales() {
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Fetch products from Supabase
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((item: any) => item.id === product.id);
      if (existing) {
        return prev.map((item: any) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <ShoppingCart className="h-10 w-10 text-emerald-400" />
            Sales Center
          </h1>
          <p className="text-slate-400 text-lg">Manage your sales and transactions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products List */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl hover:border-slate-600/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Products</h2>
              </div>
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900/70 transition-all duration-300"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-slate-700/50 rounded-xl h-32"></div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">
                  {searchTerm ? "No products found" : "No products available"}
                </p>
                <p className="text-slate-500 text-sm">
                  {searchTerm ? "Try adjusting your search terms" : "Add some products to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all duration-300 cursor-pointer transform hover:scale-105"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1 mb-4">
                        <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-emerald-300 transition-colors duration-300">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(product.price)}
                          </span>
                          {product.stock && (
                            <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
                              Stock: {product.stock}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium group-hover:scale-105 transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Cart cart={cart} setCart={setCart} />
          </div>

          {/* Manual Sale Form */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
              <SalesForm />
            </div>
          </div>

          {/* Sales History */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
              <SalesHistory />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}