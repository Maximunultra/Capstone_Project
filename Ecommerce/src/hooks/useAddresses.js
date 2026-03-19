import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "http://localhost:5000/api"; // Adjust as needed

// ─── Safe JSON parser ─────────────────────────────────────────────────────────
// Prevents "Unexpected token '<'" crash when the server returns an HTML error page
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned HTML (e.g. 404 page, 500 nginx error)
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
}

// ─── useAddresses hook ────────────────────────────────────────────────────────
const useAddresses = (userId) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE_URL}/addresses/user/${userId}`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to load addresses");
      setAddresses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const addAddress = async (formData) => {
    const res  = await fetch(`${API_BASE_URL}/addresses`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...formData, user_id: userId }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to add address");
    await fetchAddresses();
    return data;
  };

  // ── Update ───────────────────────────────────────────────────────────────────
  const updateAddress = async (addressId, formData) => {
    const res  = await fetch(`${API_BASE_URL}/addresses/${addressId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...formData, user_id: userId }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to update address");
    await fetchAddresses();
    return data;
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteAddress = async (addressId) => {
    const res  = await fetch(`${API_BASE_URL}/addresses/${addressId}`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id: userId }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to delete address");
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  };

  // ── Set default ──────────────────────────────────────────────────────────────
  const setDefault = async (addressId) => {
    const res  = await fetch(`${API_BASE_URL}/addresses/${addressId}/default`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id: userId }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to set default");
    await fetchAddresses();
    return data;
  };

  return { addresses, loading, error, refetch: fetchAddresses, addAddress, updateAddress, deleteAddress, setDefault };
};

export default useAddresses;