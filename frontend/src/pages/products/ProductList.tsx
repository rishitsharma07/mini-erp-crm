import { useEffect, useState, type FormEvent } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location?: string;
}

export default function ProductList() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [stockModalFor, setStockModalFor] = useState<Product | null>(null);
  const [error, setError] = useState("");

  // Only Admin/Warehouse can create products or adjust stock per backend role rules
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  async function fetchProducts() {
    const res = await api.get("/products", { params: { search } });
    setProducts(res.data.items);
  }

  useEffect(() => {
    fetchProducts();
  }, [search]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/products", {
        name: form.get("name"),
        sku: form.get("sku"),
        category: form.get("category") || undefined,
        unitPrice: Number(form.get("unitPrice")),
        currentStock: Number(form.get("currentStock") || 0),
        minStockAlert: Number(form.get("minStockAlert") || 0),
        location: form.get("location") || undefined,
      });
      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create product");
    }
  }

  async function handleStockMovement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api.post(`/products/${stockModalFor!.id}/stock-movements`, {
        quantity: Number(form.get("quantity")),
        movementType: form.get("movementType"),
        reason: form.get("reason"),
      });
      setStockModalFor(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Stock movement failed");
    }
  }

  return (
    <div>
      <h2>Products</h2>
      <input
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 8, width: 300 }}
      />
      {canManage && (
        <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: 12 }}>
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: "1px solid #ccc", padding: 16, margin: "12px 0" }}>
          <div><label>Name </label><input name="name" required /></div>
          <div><label>SKU </label><input name="sku" required /></div>
          <div><label>Category </label><input name="category" /></div>
          <div><label>Unit Price </label><input name="unitPrice" type="number" step="0.01" required /></div>
          <div><label>Opening Stock </label><input name="currentStock" type="number" defaultValue={0} /></div>
          <div><label>Min Stock Alert </label><input name="minStockAlert" type="number" defaultValue={0} /></div>
          <div><label>Location </label><input name="location" /></div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit">Save</button>
        </form>
      )}

      <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr>
            <th>Name</th><th>SKU</th><th>Category</th><th>Price</th>
            <th>Stock</th><th>Location</th>{canManage && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const low = p.currentStock <= p.minStockAlert;
            return (
              <tr key={p.id} style={{ background: low ? "#fff3cd" : undefined }}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category || "-"}</td>
                <td>₹{p.unitPrice}</td>
                <td>{p.currentStock}{low && " ⚠ low"}</td>
                <td>{p.location || "-"}</td>
                {canManage && (
                  <td>
                    <button onClick={() => setStockModalFor(p)}>Adjust Stock</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {stockModalFor && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <form onSubmit={handleStockMovement} style={{ background: "#fff", color: "#000", padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3>Adjust Stock — {stockModalFor.name}</h3>
            <p>Current stock: {stockModalFor.currentStock}</p>
            <div>
              <label>Type </label>
              <select name="movementType" required>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>
            <div><label>Quantity </label><input name="quantity" type="number" min={1} required /></div>
            <div><label>Reason </label><input name="reason" required /></div>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div style={{ marginTop: 12 }}>
              <button type="submit">Submit</button>
              <button type="button" onClick={() => setStockModalFor(null)} style={{ marginLeft: 8 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}