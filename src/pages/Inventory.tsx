import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Star,
  Plus,
  Upload,
  DollarSign,
  BarChart3,
  ImageIcon,
  Loader,
  ShoppingCart,
  Zap,
  X,
  CheckCircle,
  FileText,
  Menu,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  sellingPrice: number;
  stock: number;
  category: string;
  images: string[];
  description?: string;
  supplier?: string;
  lowStockThreshold?: number;
  created_at: string;
}

interface Sale {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  profit: number;
  payment_method: string;
  customer: string;
  discount: number;
  timestamp: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  sellingPrice: number;
  quantity: number;
  stock: number;
}

export default function ProfessionalInventoryPOS() {
  const { role } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "idle" | "uploading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    sellingPrice: "",
    stock: "",
    category: "Sneakers",
    images: [] as File[],
    description: "",
    supplier: "",
    lowStockThreshold: 5,
  });

  const [cartForm, setCartForm] = useState({
    payment_method: "Cash",
    customer: "Walk-in",
    discount: 0,
  });

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    if (role === "admin") {
      fetchProducts();
      fetchSales();
    }
  }, [role]);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Fetch products error:", error);
      setUploadStatus({
        type: "error",
        message: `Failed to load products: ${error.message || "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales
  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error("Fetch sales error:", error);
      setUploadStatus({
        type: "error",
        message: `Failed to load sales: ${error.message || "Unknown error"}`,
      });
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setUploadStatus({
            type: "error",
            message: `Cannot add more ${product.name}: only ${product.stock} in stock`,
          });
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  };

  // Update cart quantity
  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: Math.max(1, Math.min(quantity, item.stock)),
            }
          : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setUploadStatus({ type: "error", message: "Cart is empty" });
      return;
    }

    if (!["Cash", "M-Pesa"].includes(cartForm.payment_method)) {
      setUploadStatus({ type: "error", message: "Invalid payment method" });
      return;
    }

    if (cartForm.discount < 0 || cartForm.discount > 100) {
      setUploadStatus({ type: "error", message: "Discount must be between 0 and 100" });
      return;
    }

    setLoading(true);
    try {
      const salesData = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: Number(item.sellingPrice.toFixed(2)),
        total: Number((item.sellingPrice * item.quantity).toFixed(2)),
        profit: Number(((item.sellingPrice - item.price) * item.quantity).toFixed(2)),
        payment_method: cartForm.payment_method,
        customer: cartForm.customer || "Walk-in",
        discount: cartForm.discount || 0,
        timestamp: new Date().toISOString(),
      }));

      // Insert sales
      const { error: salesError } = await supabase.from("sales").insert(salesData);
      if (salesError) throw salesError;

      // Update product stock
      const stockUpdates = cart.map((item) => ({
        id: item.id,
        stock: item.stock - item.quantity,
      }));

      for (const update of stockUpdates) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: update.stock })
          .eq("id", update.id);
        if (stockError) throw stockError;
      }

      // Reset cart and form
      setCart([]);
      setCartForm({ payment_method: "Cash", customer: "Walk-in", discount: 0 });
      setShowCart(false);
      setUploadStatus({ type: "success", message: "Sale completed successfully!" });

      // Refresh data
      await Promise.all([fetchProducts(), fetchSales()]);
    } catch (error: any) {
      console.error("Checkout error:", error);
      setUploadStatus({
        type: "error",
        message: `Failed to complete sale: ${error.message || "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection with preview
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 5) {
      setUploadStatus({ type: "error", message: "Maximum 5 images allowed" });
      return;
    }

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        invalidFiles.push(`${file.name} - Not an image file`);
      } else if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} - File too large (max 5MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setUploadStatus({
        type: "error",
        message: `Invalid files: ${invalidFiles.join(", ")}`,
      });
    }

    if (validFiles.length > 0) {
      setNewProduct((prev) => ({
        ...prev,
        images: [...prev.images, ...validFiles],
      }));
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      setUploadStatus({
        type: "success",
        message: `Added ${validFiles.length} image(s)`,
      });
    }
  };

  // Remove selected image
  const removeImage = (index: number) => {
    const updatedImages = [...newProduct.images];
    const updatedPreviews = [...imagePreviews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);
    setNewProduct((prev) => ({ ...prev, images: updatedImages }));
    setImagePreviews(updatedPreviews);
  };

  // Upload images
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    let uploaded = 0;

    setUploadStatus({ type: "uploading", message: "Starting image upload..." });

    for (const [index, file] of files.entries()) {
      try {
        setUploadStatus({
          type: "uploading",
          message: `Uploading image ${index + 1} of ${files.length}...`,
        });

        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileName = `product-${timestamp}-${randomStr}.${fileExt}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          urls.push(urlData.publicUrl);
        } else {
          throw new Error("Could not get public URL for uploaded file");
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / files.length) * 100));
      } catch (error: any) {
        console.error(`Image upload failed for ${file.name}:`, error);
        setUploadStatus({
          type: "error",
          message: `Upload failed for ${file.name}. Please try again.`,
        });
        continue;
      }
    }

    return urls;
  };

  // Clear preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Add product
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.name.trim()) {
      setUploadStatus({ type: "error", message: "Please enter a product name" });
      return;
    }

    const costPrice = Number(newProduct.price);
    const sellingPrice = Number(newProduct.sellingPrice);
    const stock = Number(newProduct.stock) || 0;

    if (costPrice <= 0 || sellingPrice <= 0) {
      setUploadStatus({ type: "error", message: "Prices must be greater than 0" });
      return;
    }

    if (sellingPrice < costPrice) {
      setUploadStatus({
        type: "error",
        message: "Selling price cannot be less than cost price",
      });
      return;
    }

    if (stock < 0) {
      setUploadStatus({ type: "error", message: "Stock cannot be negative" });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStatus({ type: "uploading", message: "Starting product creation..." });

    try {
      let imageUrls: string[] = [];
      if (newProduct.images.length > 0) {
        imageUrls = await uploadImages(newProduct.images);
        if (imageUrls.length === 0 && newProduct.images.length > 0) {
          throw new Error("All image uploads failed. Please try again.");
        }
      }

      const productData = {
        name: newProduct.name.trim(),
        price: Number(costPrice.toFixed(2)),
        sellingPrice: Number(sellingPrice.toFixed(2)),
        stock,
        category: newProduct.category,
        images: imageUrls,
        description: newProduct.description.trim() || null,
        supplier: newProduct.supplier.trim() || null,
        lowStockThreshold: newProduct.lowStockThreshold || 5,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("products").insert([productData]);
      if (error) throw error;

      setNewProduct({
        name: "",
        price: "",
        sellingPrice: "",
        stock: "",
        category: "Sneakers",
        images: [],
        description: "",
        supplier: "",
        lowStockThreshold: 5,
      });
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);
      setUploadProgress(0);
      setUploadStatus({ type: "success", message: "Product added successfully!" });
      setShowAddForm(false);
      await fetchProducts();
    } catch (error: any) {
      console.error("Add product error:", error);
      setUploadStatus({
        type: "error",
        message: `Failed to add product: ${error.message || "Unknown error"}`,
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Cancel product form
  const handleCancel = () => {
    setNewProduct({
      name: "",
      price: "",
      sellingPrice: "",
      stock: "",
      category: "Sneakers",
      images: [],
      description: "",
      supplier: "",
      lowStockThreshold: 5,
    });
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setUploadProgress(0);
    setUploadStatus({ type: "idle", message: "" });
    setShowAddForm(false);
  };

  // Analytics
  const analytics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold || 5));
    const topSelling = sales.reduce((acc, s) => {
      acc[s.product_name] = (acc[s.product_name] || 0) + s.quantity;
      return acc;
    }, {} as Record<string, number>);

    return { totalRevenue, totalProfit, lowStock, topSelling };
  }, [sales, products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="p-6 bg-red-500/20 rounded-2xl border border-red-500/30 mb-4">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400">Administrator privileges required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 sm:p-3 bg-emerald-500/20 rounded-xl">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">SteppInStyle Inventory</h1>
                  <p className="text-slate-400 text-sm sm:text-lg">Inventory & POS System</p>
                </div>
              </div>
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 bg-slate-700/50 rounded-lg sm:hidden"
                >
                  <Menu className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
            <div className={`${isMobile && !showMobileMenu ? "hidden" : "flex"} flex-col sm:flex-row gap-3 sm:gap-4 justify-end`}>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowCart(false);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium w-full sm:w-auto justify-center text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Add Product
              </button>
              <button
                onClick={() => {
                  setShowCart(!showCart);
                  setShowAddForm(false);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium w-full sm:w-auto justify-center text-sm sm:text-base"
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {cart.length > 0 ? `Cart (${cart.reduce((sum, item) => sum + item.quantity, 0)})` : "Cart"}
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-4 sm:p-6 hover:border-emerald-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">Total Revenue</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
            </div>
            <div className="flex items-center text-emerald-400 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              All time sales
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 sm:p-6 hover:border-blue-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">Total Profit</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{formatCurrency(analytics.totalProfit)}</p>
              </div>
            </div>
            <div className="flex items-center text-blue-400 text-xs sm:text-sm">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Net earnings
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-4 sm:p-6 hover:border-red-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">Low Stock Items</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{analytics.lowStock.length}</p>
              </div>
            </div>
            <div className="flex items-center text-red-400 text-xs sm:text-sm">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Needs restocking
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-6 hover:border-purple-400/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">Top Sellers</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-white truncate" title={Object.keys(analytics.topSelling).slice(0, 2).join(", ") || "No data"}>
                  {Object.keys(analytics.topSelling).slice(0, 2).join(", ") || "No data"}
                </p>
              </div>
            </div>
            <div className="flex items-center text-purple-400 text-xs sm:text-sm">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Best performers
            </div>
          </div>
        </div>

        {/* Cart Section */}
        {showCart && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">Cart</h2>
                <span className="bg-blue-500/20 text-blue-400 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 sm:p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
                <p className="text-slate-400 text-base sm:text-lg mb-2">Cart is empty</p>
                <p className="text-slate-500 text-sm">Add products to start a sale</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-800/50 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm sm:text-base">{item.name}</p>
                          <p className="text-slate-400 text-xs sm:text-sm">
                            {formatCurrency(item.sellingPrice)} × {item.quantity} = {formatCurrency(item.sellingPrice * item.quantity)}
                          </p>
                          <p className="text-slate-500 text-xs">Stock: {item.stock}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="p-1 sm:p-2 hover:bg-slate-700/50 rounded-l-lg"
                            disabled={item.quantity <= 1}
                          >
                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateCartQuantity(item.id, Number(e.target.value))}
                            className="w-12 sm:w-16 bg-transparent text-center text-white text-xs sm:text-sm border-x border-slate-700/50"
                            min="1"
                            max={item.stock}
                          />
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="p-1 sm:p-2 hover:bg-slate-700/50 rounded-r-lg"
                            disabled={item.quantity >= item.stock}
                          >
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 sm:p-2 hover:bg-red-500/20 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Payment Method</label>
                    <select
                      value={cartForm.payment_method}
                      onChange={(e) => setCartForm({ ...cartForm, payment_method: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    >
                      <option value="Cash">Cash</option>
                      <option value="M-Pesa">M-Pesa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Customer</label>
                    <input
                      type="text"
                      placeholder="Walk-in"
                      value={cartForm.customer}
                      onChange={(e) => setCartForm({ ...cartForm, customer: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Discount (%)</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      value={cartForm.discount}
                      onChange={(e) => setCartForm({ ...cartForm, discount: Number(e.target.value) })}
                      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed justify-center text-sm sm:text-base"
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {loading ? "Processing..." : "Complete Sale"}
                  </button>
                  <button
                    onClick={() => setCart([])}
                    disabled={loading}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 font-medium disabled:opacity-50 text-sm sm:text-base"
                  >
                    Clear Cart
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Add Product Form */}
        {showAddForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">Add New Product</h2>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 sm:p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              </button>
            </div>

            {uploadStatus.type !== "idle" && (
              <div
                className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border ${
                  uploadStatus.type === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : uploadStatus.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {uploadStatus.type === "uploading" && <Loader className="h-4 w-4 animate-spin" />}
                  {uploadStatus.type === "success" && <CheckCircle className="h-4 w-4" />}
                  {uploadStatus.type === "error" && <AlertTriangle className="h-4 w-4" />}
                  <span className="text-xs sm:text-sm font-medium break-words">{uploadStatus.message}</span>
                </div>
              </div>
            )}

            <form onSubmit={addProduct}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Product Name *</label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Cost Price (KES) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Selling Price (KES) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Initial Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                  >
                    <option value="Sneakers">Sneakers</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Supplier</label>
                  <input
                    type="text"
                    placeholder="Supplier name"
                    value={newProduct.supplier}
                    onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Low Stock Threshold</label>
                  <input
                    type="number"
                    placeholder="5"
                    min="1"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-slate-300">Description</label>
                  <textarea
                    placeholder="Product description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all duration-300 resize-none text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-slate-300">Product Images</label>
                  {imagePreviews.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-xs sm:text-sm text-slate-400">
                          {imagePreviews.length} image(s) selected • Max 5 images
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 sm:h-24 object-cover rounded-lg border border-slate-600/30"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <X className="h-2 w-2 sm:h-3 sm:w-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                              {newProduct.images[index]?.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-3 sm:px-4 py-4 sm:py-6 text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 border-dashed text-sm sm:text-base"
                    >
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
                      <span className="text-center">
                        <div>Click to upload images</div>
                        <div className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB each</div>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4 sm:mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Loader className="h-4 w-4 text-emerald-400 animate-spin" />
                      <span className="text-slate-300 text-xs sm:text-sm">Uploading images...</span>
                    </div>
                    <span className="text-slate-300 text-xs sm:text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed justify-center text-sm sm:text-base"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {loading ? "Adding Product..." : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 font-medium disabled:opacity-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product Grid */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-6 md:p-8 hover:border-slate-600/50 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Product Inventory</h2>
            <span className="bg-blue-500/20 text-blue-400 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              {products.length} items
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-700/50 rounded-2xl h-60 sm:h-80"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-slate-400 text-base sm:text-lg mb-2">No products in inventory</p>
              <p className="text-slate-500 text-sm">Add your first product to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => {
                const profitPerItem = product.sellingPrice - product.price;
                const profitMargin = ((profitPerItem / product.sellingPrice) * 100).toFixed(1);
                const isLowStock = product.stock <= (product.lowStockThreshold || 5);

                return (
                  <div
                    key={product.id}
                    className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 sm:p-6 hover:border-slate-600/50 transition-all duration-300 group"
                  >
                    <div className="mb-3 sm:mb-4">
                      {product.images.length > 0 ? (
                        <div className="relative">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-40 sm:h-48 object-cover rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                          <div className="hidden w-full h-40 sm:h-48 bg-slate-800/50 rounded-xl flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-slate-600" />
                          </div>
                          {product.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-slate-800/80 text-white px-2 py-1 rounded-lg text-xs">
                              +{product.images.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-40 sm:h-48 bg-slate-800/50 rounded-xl flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-slate-600" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-white text-base sm:text-lg group-hover:text-emerald-300 transition-colors duration-300 line-clamp-2">
                          {product.name}
                        </h3>
                        {isLowStock && (
                          <div className="flex items-center gap-1 p-1 bg-red-500/20 rounded-lg flex-shrink-0 ml-2" title="Low Stock">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
                          <p className="text-slate-400 text-xs">Cost Price</p>
                          <p className="text-white font-bold text-sm sm:text-base">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
                          <p className="text-slate-400 text-xs">Selling Price</p>
                          <p className="text-emerald-400 font-bold text-sm sm:text-base">{formatCurrency(product.sellingPrice)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
                          <p className="text-slate-400 text-xs">Stock</p>
                          <p className={`font-bold text-sm sm:text-base ${isLowStock ? "text-red-400" : "text-white"}`}>
                            {product.stock} units
                          </p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
                          <p className="text-slate-400 text-xs">Profit Margin</p>
                          <p className="text-blue-400 font-bold text-sm sm:text-base">{profitMargin}%</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg p-2 sm:p-3 border border-emerald-500/20">
                        <p className="text-slate-400 text-xs">Profit per Item</p>
                        <p className="text-emerald-400 font-bold text-base sm:text-lg">{formatCurrency(profitPerItem)}</p>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        <ShoppingCart className="h-4 w-4 inline-block mr-2" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}