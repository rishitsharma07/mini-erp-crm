import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CustomerList from "./pages/customers/CustomerList";
import ProductList from "./pages/products/ProductList";
import ChallanList from "./pages/challans/ChallanList";
import ChallanCreate from "./pages/challans/ChallanCreate";

function Dashboard() {
  return <h1>Dashboard</h1>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/challans" element={<ChallanList />} />
              <Route path="/challans/new" element={<ChallanCreate />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}