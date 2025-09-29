import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, CheckCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear general error when user modifies any field
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setSuccess(true);
      
      // Add a small delay to show success state
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: any) {
      let errorMessage = "Failed to sign in. Please try again.";
      
      // Handle different Firebase error types
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address";
          setErrors({ email: errorMessage });
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          setErrors({ password: errorMessage });
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          setErrors({ email: errorMessage });
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          setErrors({ general: errorMessage });
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later";
          setErrors({ general: errorMessage });
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          setErrors({ general: errorMessage });
          break;
        default:
          setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };


  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600 mb-4">Successfully signed in. Redirecting...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 p-4">
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{errors.general}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.email
                    ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.password
                    ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <button
             
              onClick={() => navigate("/signup")}
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors duration-200"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}