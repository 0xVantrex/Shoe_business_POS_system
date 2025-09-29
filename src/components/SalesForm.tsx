import { useState } from "react";
import { supabase } from "../supabaseClient";
import { User, DollarSign, Save, FileText, CreditCard, Tag } from "lucide-react";

interface SaleData {
  customer: string;
  total: number;
  payment_method: string;
  discount: number;
  items: any[];
  timestamp: string;
}

const quickAmounts = [500, 1000, 2500, 5000, 10000];

export default function SalesForm() {
  const [saleData, setSaleData] = useState<SaleData>({
    customer: "Walk-in",
    total: 0,
    payment_method: "Cash",
    discount: 0,
    items: [],
    timestamp: new Date().toISOString(),
  });
  const [customAmount, setCustomAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

  const calculateFinalAmount = () => {
    const base = customAmount ? parseFloat(customAmount) || 0 : saleData.total;
    return base - (base * saleData.discount) / 100;
  };

  const finalAmount = calculateFinalAmount();

  const resetForm = () => {
    setSaleData({
      customer: "Walk-in",
      total: 0,
      payment_method: "Cash",
      discount: 0,
      items: [],
      timestamp: new Date().toISOString(),
    });
    setCustomAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleData.customer.trim() || finalAmount <= 0) {
      alert("Please fill in all required fields with a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const saleRecord = {
        ...saleData,
        total: finalAmount,
        timestamp: new Date().toISOString(),
        profit: finalAmount * 0.3,
        quantity: 1,
        unit_price: finalAmount,
      };

      const { error } = await supabase.from("sales").insert([saleRecord]);
      if (error) throw error;

      alert("✅ Sale recorded successfully!");
      resetForm();
    } catch (err: any) {
      console.error("Error saving sale:", err.message || err);
      alert("❌ Failed to save sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof SaleData, value: any) =>
    setSaleData({ ...saleData, [field]: value });

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 transition-all duration-300 hover:border-slate-600/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          <FileText className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Record Manual Sale</h2>
          <p className="text-slate-400 text-sm">Add sales not processed through the cart</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Name */}
        <FormField
          icon={<User className="h-4 w-4 text-slate-400" />}
          label="Customer Name"
          value={saleData.customer}
          onChange={(v: string) => updateField("customer", v)}
          disabled={isSubmitting}
          placeholder="Enter customer name"
        />

        {/* Payment Method */}
        <FormSelect
          icon={<CreditCard className="h-4 w-4 text-slate-400" />}
          label="Payment Method"
          value={saleData.payment_method}
          onChange={(v: string) => updateField("payment_method", v)}
          options={["Cash", "M-Pesa"]}
          disabled={isSubmitting}
        />

        

        {/* Custom Amount */}
        <FormField
          icon={<DollarSign className="h-4 w-4 text-slate-400" />}
          label="Amount (KES)"
          type="number"
          value={customAmount}
          onChange={(v: string) => {
            setCustomAmount(v);
            if (v) updateField("total", 0);
          }}
          disabled={isSubmitting}
        />

        {/* Discount */}
        <FormField
          icon={<Tag className="h-4 w-4 text-slate-400" />}
          label="Discount (%)"
          type="number"
          value={saleData.discount}
          onChange={(v: string) => updateField("discount", parseFloat(v) || 0)}
          disabled={isSubmitting}
        />

        {/* Amount Summary */}
        {finalAmount > 0 && <AmountSummary total={saleData.total} discount={saleData.discount} customAmount={customAmount} formatCurrency={formatCurrency} />}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !saleData.customer.trim() || finalAmount <= 0}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              isSubmitting || !saleData.customer.trim() || finalAmount <= 0
                ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving Sale...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Sale {finalAmount > 0 && `- ${formatCurrency(finalAmount)}`}
              </>
            )}
          </button>

          {/* Clear Form */}
          {(!isSubmitting && (saleData.customer !== "Walk-in" || saleData.total > 0 || customAmount || saleData.discount > 0)) && (
            <button type="button" onClick={resetForm} className="flex-shrink-0 px-6 py-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 font-medium">
              Clear Form
            </button>
          )}
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30 text-slate-400 text-sm">
        <strong className="text-slate-300">Note:</strong> Manual sales are recorded without inventory items. Use this for cash sales, services, or transactions not processed through the product catalog.
      </div>
    </div>
  );
}

// --------------------------
// Subcomponents
// --------------------------
const FormField = ({ icon, label, value, onChange, disabled, type = "text", placeholder = "" }: any) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">{icon} {label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900/70 transition-all duration-300"
    />
  </div>
);

const FormSelect = ({ icon, label, value, onChange, options, disabled }: any) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">{icon} {label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-slate-900/50 border border-slate-600/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all duration-300"
    >
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const AmountSummary = ({ total, discount, customAmount, formatCurrency }: any) => {
  const base = customAmount ? parseFloat(customAmount) || 0 : total;
  const discountAmount = (base * discount) / 100;
  const final = base - discountAmount;

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-4 border border-emerald-500/20 space-y-2">
      <div className="flex justify-between items-center"><span className="text-slate-300">Subtotal:</span> <span className="text-white font-medium">{formatCurrency(base)}</span></div>
      {discount > 0 && <div className="flex justify-between items-center"><span className="text-slate-300">Discount ({discount}%):</span> <span className="text-red-400 font-medium">-{formatCurrency(discountAmount)}</span></div>}
      <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2"><span className="text-slate-300 font-semibold">Total:</span> <span className="text-emerald-400 font-bold text-lg">{formatCurrency(final)}</span></div>
    </div>
  );
};
