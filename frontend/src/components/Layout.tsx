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
      <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid #ccc", alignItems: "center" }}>
        <strong>Mini ERP + CRM</strong>
        <Link to="/">Dashboard</Link>
        <Link to="/customers">Customers</Link>
        <Link to="/products">Products</Link>
        <Link to="/challans">Challans</Link>
        <span style={{ marginLeft: "auto" }}>
          {user?.name} ({user?.role})
        </span>
        <button onClick={handleLogout}>Logout</button>
      </nav>
      <div style={{ padding: 24 }}>
        <Outlet />
      </div>
    </div>
  );
}