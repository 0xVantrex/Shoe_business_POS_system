import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (no sidebar) */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes (with sidebar layout) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}