import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/client";

interface ChallanItem {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  customer: { name: string };
  totalQuantity: number;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  items: ChallanItem[];
}

const statusColor: Record<Challan["status"], string> = {
  DRAFT: "#6c757d",
  CONFIRMED: "#198754",
  CANCELLED: "#dc3545",
};

export default function ChallanList() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");

  async function fetchChallans() {
    const res = await api.get("/challans", { params: { pageSize: 100 } });
    setChallans(res.data.items);
  }

  useEffect(() => {
    fetchChallans();
  }, []);

  async function handleConfirm(id: string) {
    setBusy(id);
    setError((e) => ({ ...e, [id]: "" }));
    try {
      await api.post(`/challans/${id}/confirm`);
      fetchChallans();
    } catch (err: any) {
      setError((e) => ({ ...e, [id]: err.response?.data?.error || "Confirm failed" }));
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(id: string) {
    setBusy(id);
    setError((e) => ({ ...e, [id]: "" }));
    try {
      await api.post(`/challans/${id}/cancel`);
      fetchChallans();
    } catch (err: any) {
      setError((e) => ({ ...e, [id]: err.response?.data?.error || "Cancel failed" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Sales Challans</h2>
        <Link to="/challans/new"><button>+ New Challan</button></Link>
      </div>

      {challans.map((c) => (
        <div
          key={c.id}
          style={{
            border: c.id === highlight ? "2px solid #0d6efd" : "1px solid #ccc",
            borderRadius: 6, padding: 16, marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{c.challanNumber}</strong>
            <span style={{
              background: statusColor[c.status], color: "#fff",
              padding: "2px 10px", borderRadius: 12, fontSize: 13,
            }}>
              {c.status}
            </span>
          </div>
          <p style={{ margin: "6px 0" }}>Customer: {c.customer.name} · Total qty: {c.totalQuantity}</p>
          <ul>
            {(c.items || []).map((i) => (
              <li key={i.id}>{i.productNameSnapshot} ({i.skuSnapshot}) × {i.quantity}</li>
            ))}
          </ul>

          {error[c.id] && <p style={{ color: "red" }}>{error[c.id]}</p>}

          {c.status === "DRAFT" && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => handleConfirm(c.id)} disabled={busy === c.id}>
                {busy === c.id ? "Confirming..." : "Confirm"}
              </button>
              <button onClick={() => handleCancel(c.id)} disabled={busy === c.id} style={{ marginLeft: 8 }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}