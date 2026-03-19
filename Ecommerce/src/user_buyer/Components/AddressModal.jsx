import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

const PSGC = "https://psgc.cloud/api";

// ─── Field component (must stay outside AddressModal) ─────────────────────────
const Field = ({ label, field, placeholder, half = false, value, onChange, error }) => (
  <div className={half ? "flex-1 min-w-0" : "w-full"}>
    <label className="block text-xs font-semibold text-[#5c5042] mb-1">{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(field, e.target.value)}
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition
        focus:border-[#c08a4b] focus:ring-2 focus:ring-[#c08a4b]/20
        ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
    />
    {error && <FieldError msg={error} />}
  </div>
);

// ─── Select dropdown component ────────────────────────────────────────────────
const SelectField = ({ label, half = false, value, onChange, options, placeholder, disabled, loading, error }) => (
  <div className={half ? "flex-1 min-w-0" : "w-full"}>
    <label className="block text-xs font-semibold text-[#5c5042] mb-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition appearance-none pr-8
          focus:border-[#c08a4b] focus:ring-2 focus:ring-[#c08a4b]/20
          ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.name}</option>
        ))}
      </select>
      {/* Chevron icon */}
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        {loading
          ? <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          : <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        }
      </div>
    </div>
    {error && <FieldError msg={error} />}
  </div>
);

const FieldError = ({ msg }) => (
  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    {msg}
  </p>
);

// ─── AddressModal ─────────────────────────────────────────────────────────────
const AddressModal = ({ onClose, onSave, editAddress = null }) => {
  const [form, setForm] = useState({
    label: "", full_name: "", phone: "",
    street: "", city: "", province: "", zip_code: "", is_default: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // PSGC cascading state
  const [provinces,    setProvinces]    = useState([]);
  const [cities,       setCities]       = useState([]);
  const [barangays,    setBarangays]    = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(""); // PSGC code
  const [selectedCity,     setSelectedCity]     = useState(""); // PSGC code
  const [selectedBarangay, setSelectedBarangay] = useState(""); // name only

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities,    setLoadingCities]    = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // ── Load all provinces on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const res = await fetch(`${PSGC}/provinces`);
        const data = await res.json();
        // Sort alphabetically
        const sorted = data
          .map((p) => ({ code: p.code, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setProvinces(sorted);
      } catch {
        // silently fail — user can still type manually
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  // ── Load cities when province changes ───────────────────────────────
  useEffect(() => {
    if (!selectedProvince) { setCities([]); setBarangays([]); setSelectedCity(""); setSelectedBarangay(""); return; }
    const fetchCities = async () => {
      setLoadingCities(true);
      setCities([]);
      setBarangays([]);
      setSelectedCity("");
      setSelectedBarangay("");
      try {
        const res = await fetch(`${PSGC}/provinces/${selectedProvince}/cities-municipalities`);
        const data = await res.json();
        const sorted = data
          .map((c) => ({ code: c.code, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCities(sorted);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [selectedProvince]);

  // ── Load barangays when city changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedCity) { setBarangays([]); setSelectedBarangay(""); return; }
    const fetchBarangays = async () => {
      setLoadingBarangays(true);
      setBarangays([]);
      setSelectedBarangay("");
      try {
        const res = await fetch(`${PSGC}/cities-municipalities/${selectedCity}/barangays`);
        const data = await res.json();
        const sorted = data
          .map((b) => ({ code: b.code, name: b.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setBarangays(sorted);
      } catch {
        setBarangays([]);
      } finally {
        setLoadingBarangays(false);
      }
    };
    fetchBarangays();
  }, [selectedCity]);

  // ── Pre-fill when editing ────────────────────────────────────────────
  useEffect(() => {
    if (editAddress) {
      setForm({
        label:      editAddress.label      || "",
        full_name:  editAddress.full_name  || "",
        phone:      editAddress.phone      || "",
        street:     editAddress.street     || "",
        city:       editAddress.city       || "",
        province:   editAddress.province   || "",
        zip_code:   editAddress.zip_code   || "",
        is_default: editAddress.is_default || false,
      });
      // Note: when editing, province/city/barangay show as plain text
      // (matching stored names). Dropdowns start blank; user can re-pick
      // if they want to change the address.
    }
  }, [editAddress]);

  // ── Sync dropdown selections → form fields ───────────────────────────
  const handleProvinceSelect = (code) => {
    setSelectedProvince(code);
    const found = provinces.find((p) => p.code === code);
    setForm((f) => ({ ...f, province: found ? found.name : "", city: "", zip_code: "" }));
    if (errors.province) setErrors((e) => ({ ...e, province: undefined }));
  };

  const handleCitySelect = (code) => {
    setSelectedCity(code);
    const found = cities.find((c) => c.code === code);
    setForm((f) => ({ ...f, city: found ? found.name : "" }));
    if (errors.city) setErrors((e) => ({ ...e, city: undefined }));
  };

  const handleBarangaySelect = (code) => {
    setSelectedBarangay(code);
    const found = barangays.find((b) => b.code === code);
    // Append barangay to street field for convenience
    if (found) {
      setForm((f) => ({
        ...f,
        street: f.street
          ? f.street.replace(/,?\s*Brgy\.[^,]*/i, "") + `, Brgy. ${found.name}`
          : `Brgy. ${found.name}`,
      }));
    }
  };

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.phone.trim()) {
      e.phone = "Phone number is required";
    } else {
      const d = form.phone.replace(/\D/g, "");
      if (d.length !== 11)          e.phone = "Phone must be exactly 11 digits";
      else if (!d.startsWith("09")) e.phone = "Phone must start with 09";
    }
    if (!form.street.trim())   e.street   = "Street address is required";
    if (!form.city.trim())     e.city     = "City / Municipality is required";
    if (!form.province.trim()) e.province = "Province is required";
    if (!form.zip_code.trim()) e.zip_code = "ZIP code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form, editAddress?.id);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || "Failed to save address. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      data-portal="address-modal"
      style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "32rem", maxHeight: "90vh", overflowY: "auto" }}
        className="bg-white rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[#5c5042]">{editAddress ? "Edit Address" : "Add New Address"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in your delivery details</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-[#5c5042] p-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errors.submit}
            </div>
          )}

          {/* Label chips */}
          <div>
            <label className="block text-xs font-semibold text-[#5c5042] mb-2">
              Address Label <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {[{ key: "Home", icon: "🏠" }, { key: "Work", icon: "🏢" }, { key: "Other", icon: "📍" }].map(({ key, icon }) => (
                <button key={key} type="button"
                  onClick={() => setForm((p) => ({ ...p, label: p.label === key ? "" : key }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition
                    ${form.label === key ? "bg-[#c08a4b] text-white border-[#c08a4b]" : "bg-white text-[#5c5042] border-gray-200 hover:border-[#c08a4b]"}`}
                >
                  {icon} {key}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div className="flex gap-3">
            <Field label="Full Name *"    field="full_name" placeholder="Juan dela Cruz" half value={form.full_name} onChange={handleChange} error={errors.full_name} />
            <Field label="Phone Number *" field="phone"     placeholder="09XX XXX XXXX"  half value={form.phone}     onChange={handleChange} error={errors.phone} />
          </div>

          {/* ── PSGC Cascading Dropdowns ──────────────────────────────── */}
          <div className="bg-[#f8f5f1] rounded-xl p-3.5 space-y-3 border border-[#e8e0d5]">
            <p className="text-xs font-semibold text-[#5c5042] flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#c08a4b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location (powered by PSGC)
            </p>

            {/* Province */}
            <SelectField
              label="Province *"
              value={selectedProvince}
              onChange={handleProvinceSelect}
              options={provinces}
              placeholder={editAddress?.province ? `Current: ${editAddress.province}` : "Select Province"}
              loading={loadingProvinces}
              error={errors.province}
            />

            {/* City / Municipality */}
            <div className="flex gap-3">
              <SelectField
                label="City / Municipality *"
                half
                value={selectedCity}
                onChange={handleCitySelect}
                options={cities}
                placeholder={
                  !selectedProvince
                    ? "Select province first"
                    : editAddress?.city
                    ? `Current: ${editAddress.city}`
                    : "Select City / Municipality"
                }
                disabled={!selectedProvince}
                loading={loadingCities}
                error={errors.city}
              />

              {/* ZIP code — manual input */}
              <Field
                label="ZIP Code *"
                field="zip_code"
                placeholder="e.g. 4500"
                half
                value={form.zip_code}
                onChange={handleChange}
                error={errors.zip_code}
              />
            </div>

            {/* Barangay (optional helper) */}
            {cities.length > 0 && (
              <SelectField
                label="Barangay (optional — adds to street)"
                value={selectedBarangay}
                onChange={handleBarangaySelect}
                options={barangays}
                placeholder={!selectedCity ? "Select city first" : "Pick barangay to auto-fill"}
                disabled={!selectedCity}
                loading={loadingBarangays}
              />
            )}
          </div>

          {/* Street / full address line */}
          <Field
            label="Street / Barangay / House No. *"
            field="street"
            placeholder="123 Rizal St., Brgy. Santo Niño"
            value={form.street}
            onChange={handleChange}
            error={errors.street}
          />

          {/* Read-only summary chips */}
          {(form.province || form.city) && (
            <div className="flex flex-wrap gap-2">
              {form.province && (
                <span className="inline-flex items-center gap-1 bg-[#c08a4b]/10 text-[#c08a4b] text-xs font-semibold px-2.5 py-1 rounded-full">
                  📍 {form.province}
                </span>
              )}
              {form.city && (
                <span className="inline-flex items-center gap-1 bg-[#5c5042]/10 text-[#5c5042] text-xs font-semibold px-2.5 py-1 rounded-full">
                  🏙 {form.city}
                </span>
              )}
            </div>
          )}

          {/* Default toggle */}
          <div className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setForm((p) => ({ ...p, is_default: !p.is_default }))}>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${form.is_default ? "bg-[#c08a4b]" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_default ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#5c5042]">Set as default address</p>
              <p className="text-xs text-gray-400">Used automatically at checkout</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 border border-gray-200 text-[#5c5042] py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-[#c08a4b] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-[#a87940] transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving...
              </>
            ) : editAddress ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddressModal;