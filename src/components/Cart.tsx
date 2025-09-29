import { supabase } from "../supabaseClient";
import { ShoppingCart, Trash2, CreditCard, Plus, Minus, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  sellingPrice?: number;
  costPrice: number;
}

interface CartProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
}

export default function Cart({ cart, setCart }: CartProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const lowStockItems = cart.filter(item => item.stock - item.qty <= 3);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

  const removeFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  const updateQuantity = (id: string, change: number) => {
    setCart(
      cart
        .map(item => {
          if (item.id === id) {
            const newQty = item.qty + change;
            if (newQty > item.stock) {
              alert(`Only ${item.stock} units available in stock`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
        .filter(item => item.qty > 0)
    );
  };

  const checkout = async () => {
    if (!cart.length) return alert("Cart is empty!");

    const outOfStock = cart.filter(item => item.qty > item.stock);
    if (outOfStock.length) return alert("Some items exceed available stock. Please adjust quantities.");

    setIsProcessing(true);

    try {
      // 1. Insert sales
      const salesData = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        total: item.price * item.qty,
        profit: ((item.sellingPrice || item.price) - item.costPrice) * item.qty,
        payment_method: "Cash",
        customer: "Walk-in",
        discount: 0,
        timestamp: new Date().toISOString(),
      }));

      const { error: saleError } = await supabase.from("sales").insert(salesData);
      if (saleError) throw saleError;

      // 2. Update stock
      await Promise.all(
        cart.map(async item => {
          const { error } = await supabase.from("products").update({ stock: item.stock - item.qty }).eq("id", item.id);
          if (error) throw new Error(`Failed to update stock for ${item.name}`);
        })
      );

      setCart([]);
      alert("✅ Sale completed successfully! Stock updated.");
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(`❌ Checkout failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-600/50 h-fit">
      {/* Header */}
      <Header totalItems={totalItems} />

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <AlertBox count={lowStockItems.length} />
      )}

      {/* Cart Items */}
      {cart.length ? (
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-2">
          {cart.map(item => (
            <CartItemCard key={item.id} item={item} removeFromCart={removeFromCart} updateQuantity={updateQuantity} formatCurrency={formatCurrency} />
          ))}
        </div>
      ) : (
        <EmptyCart />
      )}

      {/* Total Section */}
      {cart.length > 0 && <CartTotal total={total} totalItems={totalItems} formatCurrency={formatCurrency} />}

      {/* Checkout Button */}
      <button
        onClick={checkout}
        disabled={isProcessing || cart.length === 0}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
          isProcessing || cart.length === 0
            ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
        }`}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            Checkout {formatCurrency(total)}
          </>
        )}
      </button>
    </div>
  );
}


const Header = ({ totalItems }: { totalItems: number }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-emerald-500/20 rounded-xl">
      <ShoppingCart className="h-6 w-6 text-emerald-400" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-white">Shopping Cart</h2>
      <p className="text-slate-400 text-sm">
        {totalItems} {totalItems === 1 ? "item" : "items"}
      </p>
    </div>
  </div>
);

const AlertBox = ({ count }: { count: number }) => (
  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-amber-400" />
    <span className="text-amber-400 text-sm font-medium">
      Low stock warning for {count} item(s)
    </span>
  </div>
);

const EmptyCart = () => (
  <div className="text-center py-8">
    <ShoppingCart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
    <p className="text-slate-400 text-lg mb-2">Your cart is empty</p>
    <p className="text-slate-500 text-sm">Add some products to get started</p>
  </div>
);

const CartItemCard = ({ item, removeFromCart, updateQuantity, formatCurrency }: any) => {
  const isLowStock = item.stock - item.qty <= 3;
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white text-sm">{item.name}</h3>
          {isLowStock && (
            <span title="Low stock after purchase">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            </span>
          )}
        </div>
        <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors duration-300 group">
          <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-400" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <QuantityControl item={item} updateQuantity={updateQuantity} />
        <div className="text-right">
          <div className="text-emerald-400 font-bold">{formatCurrency(item.price * item.qty)}</div>
          <div className="text-slate-500 text-xs">Stock: {item.stock}</div>
        </div>
      </div>
    </div>
  );
};

const QuantityControl = ({ item, updateQuantity }: any) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => updateQuantity(item.id, -1)}
      disabled={item.qty <= 1}
      className="p-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-300 disabled:opacity-50"
    >
      <Minus className="h-3 w-3 text-slate-300" />
    </button>
    <span className="text-white font-medium w-8 text-center">{item.qty}</span>
    <button
      onClick={() => updateQuantity(item.id, 1)}
      disabled={item.qty >= item.stock}
      className="p-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-300 disabled:opacity-50"
    >
      <Plus className="h-3 w-3 text-slate-300" />
    </button>
  </div>
);

const CartTotal = ({ total, totalItems, formatCurrency }: any) => (
  <div className="border-t border-slate-700/50 pt-4 mb-6">
    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-4 border border-emerald-500/20">
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-300 font-medium">Subtotal:</span>
        <span className="text-white font-bold">{formatCurrency(total)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-300 font-medium">Total Items:</span>
        <span className="text-emerald-400 font-bold">{totalItems}</span>
      </div>
    </div>
  </div>
);
