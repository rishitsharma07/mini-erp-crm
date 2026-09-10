import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div>
      <nav style={{
        display: "flex", gap: 20, padding: "14px 24px", alignItems: "center",
        background: "#fff", borderBottom: "1px solid #e2e4e8",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
      }}>
        <strong style={{ fontSize: 16 }}>Mini ERP + CRM</strong>
        <Link to="/" style={{ color: "#444", textDecoration: "none" }}>Dashboard</Link>
        <Link to="/customers" style={{ color: "#444", textDecoration: "none" }}>Customers</Link>
        <Link to="/products" style={{ color: "#444", textDecoration: "none" }}>Products</Link>
        <Link to="/challans" style={{ color: "#444", textDecoration: "none" }}>Challans</Link>
        <span style={{ marginLeft: "auto", color: "#666", fontSize: 14 }}>
          {user?.name} · {user?.role}
        </span>
        <button onClick={handleLogout}>Logout</button>
      </nav>
      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <Outlet />
      </div>
    </div>
  );
}