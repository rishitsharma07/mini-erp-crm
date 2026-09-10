import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

interface Customer { id: string; name: string; businessName?: string; }
interface Product { id: string; name: string; sku: string; currentStock: number; }

interface LineItem { productId: string; quantity: number; }

export default function ChallanCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.items));
    api.get("/products", { params: { pageSize: 100 } }).then((res) => setProducts(res.data.items));
  }, []);

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function addLine() {
    setItems([...items, { productId: "", quantity: 1 }]);
  }

  function removeLine(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerId) return setError("Select a customer");
    if (items.some((i) => !i.productId || i.quantity < 1)) return setError("Every line needs a product and quantity ≥ 1");

    setSubmitting(true);
    try {
      const res = await api.post("/challans", { customerId, items });
      navigate(`/challans?highlight=${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create challan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>New Sales Challan</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Customer </label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">-- select --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.businessName ? ` (${c.businessName})` : ""}</option>
            ))}
          </select>
        </div>

        <h4>Line Items</h4>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <select
              value={item.productId}
              onChange={(e) => updateItem(i, "productId", e.target.value)}
              required
              style={{ flex: 1 }}
            >
              <option value="">-- select product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock: {p.currentStock}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
              style={{ width: 80 }}
              required
            />
            {items.length > 1 && (
              <button type="button" onClick={() => removeLine(i)}>Remove</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addLine}>+ Add line</button>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}