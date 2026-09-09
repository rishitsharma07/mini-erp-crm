import { useEffect, useState, type FormEvent } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
  customerType: string;
  status: string;
}

export default function CustomerList() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  // Only Admin/Sales can create customers per the backend's role rules
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  async function fetchCustomers() {
    const res = await api.get("/customers", { params: { search } });
    setCustomers(res.data.items);
  }

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/customers", {
        name: form.get("name"),
        mobile: form.get("mobile"),
        businessName: form.get("businessName") || undefined,
        customerType: form.get("customerType"),
        status: "LEAD",
      });
      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create customer");
    }
  }

  return (
    <div>
      <h2>Customers</h2>
      <input
        placeholder="Search by name, mobile, business..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 8, width: 300, marginBottom: 12 }}
      />
      {canCreate && (
        <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: 12 }}>
          {showForm ? "Cancel" : "+ Add Customer"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: "1px solid #ccc", padding: 16, margin: "12px 0" }}>
          <div><label>Name </label><input name="name" required /></div>
          <div><label>Mobile </label><input name="mobile" required /></div>
          <div><label>Business Name </label><input name="businessName" /></div>
          <div>
            <label>Type </label>
            <select name="customerType" required>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit">Save</button>
        </form>
      )}

      <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr><th>Name</th><th>Mobile</th><th>Business</th><th>Type</th><th>Status</th></tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.mobile}</td>
              <td>{c.businessName || "-"}</td>
              <td>{c.customerType}</td>
              <td>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}