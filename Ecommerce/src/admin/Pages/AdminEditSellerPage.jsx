import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, MapPin, Store, Save, ArrowLeft,
  CheckCircle, AlertCircle, RefreshCw, Camera, Eye, EyeOff,
  FileText, X, Lock, Upload, Trash2,AtSign
} from "lucide-react";

// const API_BASE_URL = "http://localhost:5000/api";
const API_BASE_URL = "https://capstone-project-1msq.onrender.com/api";

const AdminEditSellerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = currentUser.token || currentUser.access_token || currentUser.accessToken || "";
  const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const [seller, setSeller]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Image state
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [form, setForm] = useState({
  full_name: "", email: "", username: "",   
  phone: "", address: "", store_name: "", birthdate: "", password: "", profile_image: "",
});

  const [formErrors, setFormErrors] = useState({});

  // ── Fetch seller ──────────────────────────────────────────────────────
  const fetchSeller = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE_URL}/users/${id}`, authHeaders);
      const user = res.data.user || res.data;

      if (user.role !== "seller") {
        setError("This user is not a seller.");
        setLoading(false);
        return;
      }

      setSeller(user);

      setForm({
        full_name:     user.full_name     || "",
        email:         user.email         || "",
        username:      user.username      || "",
        phone:         user.phone ? String(user.phone).replace(/\D/g, "") : "",
        address:       user.address       || "",
        store_name:    user.store_name    || "",
        birthdate:     user.birthdate ? user.birthdate.split("T")[0] : "",
        password:      "",
        profile_image: user.profile_image || "",
      });
      if (user.profile_image) setImagePreview(user.profile_image);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load seller.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSeller(); }, [id]);

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.full_name.trim())  e.full_name  = "Full name is required.";
    if (!form.email.trim())      e.email      = "Email is required.";
    if (!form.store_name.trim()) e.store_name = "Store name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email format.";
    if (form.phone) {
      const digits = String(form.phone).replace(/\D/g, "");
      if (digits.length !== 11)          e.phone = "Phone must be exactly 11 digits.";
      else if (!digits.startsWith("09")) e.phone = "Phone must start with 09.";
    }
    if (form.password && form.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (form.birthdate) {
      const birth = new Date(form.birthdate), today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) e.birthdate = "Seller must be at least 18 years old.";
    }
    if (form.username) {
    if (form.username.length < 3)
      e.username = "Username must be at least 3 characters.";
    else if (form.username.length > 30)
      e.username = "Username must be 30 characters or less.";
    else if (!/^[a-z0-9_]+$/.test(form.username))
      e.username = "Username can only contain lowercase letters, numbers, and underscores.";
    }
    return e;
  };

  // ── Image handlers ────────────────────────────────────────────────────
  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Image must be under 5 MB."); return; }
    setError("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm(f => ({ ...f, profile_image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return form.profile_image || null;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await axios.post(`${API_BASE_URL}/users/upload`, fd, {
        headers: { ...authHeaders.headers, "Content-Type": "multipart/form-data" },
      });
      return res.data.imageUrl;
    } finally {
      setUploadingImg(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(""); setSuccess("");
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setFormErrors({});
    setSaving(true);
    try {
      const fullPhone = form.phone ? String(form.phone).replace(/\D/g, "") || null : null;
      const profileImageUrl = await uploadImageIfNeeded();
      const payload = {
        full_name:     form.full_name.trim(),
        email:         form.email.trim(),
        username:      form.username ? form.username.toLowerCase() : null, 
        phone:         fullPhone,
        address:       form.address.trim() || null,
        store_name:    form.store_name.trim(),
        birthdate:     form.birthdate || null,
        profile_image: profileImageUrl,
      };
      if (form.password) payload.password = form.password;
      await axios.put(`${API_BASE_URL}/users/${id}`, payload, authHeaders);
      setSuccess("Seller account updated successfully!");
      setImageFile(null);
      setForm(f => ({ ...f, password: "" }));
      setTimeout(() => setSuccess(""), 4000);
      fetchSeller();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update seller.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: undefined }));
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-orange-500 mx-auto mb-4" />
        <p className="text-orange-800 font-medium">Loading seller info…</p>
      </div>
    </div>
  );

  if (error && !seller) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-sm w-full border border-orange-100">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium mb-4">{error}</p>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition font-medium">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white shadow hover:shadow-md hover:bg-orange-50 transition text-orange-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-900">Edit Seller Account</h1>
            <p className="text-orange-600 text-sm mt-0.5">Modify seller info and save changes</p>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Profile Photo Card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md border border-orange-100 overflow-hidden mb-6">
          <div className="h-20 bg-gradient-to-r from-orange-400 to-amber-500" />
          <div className="px-6 pb-6">

            {/* Avatar row */}
            <div className="flex items-end gap-5 -mt-10 mb-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl ring-4 ring-white shadow-lg bg-gradient-to-br from-orange-100 to-orange-200 overflow-hidden flex items-center justify-center">
                  {imagePreview
                    ? <img src={imagePreview} alt="Profile" className="w-full h-full object-cover"
                        onError={() => setImagePreview(null)} />
                    : <User className="w-10 h-10 text-orange-400" />
                  }
                </div>
                {imagePreview && (
                  <button type="button" onClick={handleRemoveImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="pb-1 min-w-0">
                <p className="font-bold text-lg text-gray-900 truncate">{seller?.full_name}</p>
                <p className="text-sm text-orange-600 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{seller?.store_name}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(seller?.created_at)}</p>
              </div>
            </div>

            {/* Upload controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={fileInputRef} id="profile-img-input" type="file"
                accept="image/*" onChange={handleImagePick} className="hidden" />

              <label htmlFor="profile-img-input"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium cursor-pointer transition select-none">
                <Upload className="w-4 h-4" />
                {imageFile ? "Change Photo" : "Upload Photo"}
              </label>

              {imagePreview && !imageFile && (
                <button type="button" onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-sm font-medium transition">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}

              <span className="text-xs text-gray-400">
                {imageFile ? imageFile.name : "JPG, PNG, WEBP · max 5 MB"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Account Form ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3">
            Account Information
          </h2>

          <Field label="Full Name" icon={<User className="w-4 h-4 text-orange-500" />} required error={formErrors.full_name}>
            <input type="text" value={form.full_name}
              onChange={e => handleChange("full_name", e.target.value)}
              placeholder="Full name" className={inputCls(formErrors.full_name)} />
          </Field>

          <Field label="Store Name" icon={<Store className="w-4 h-4 text-orange-500" />} required error={formErrors.store_name}>
            <input type="text" value={form.store_name}
              onChange={e => handleChange("store_name", e.target.value)}
              placeholder="Store name" className={inputCls(formErrors.store_name)} />
          </Field>

          <Field label="Email Address" icon={<Mail className="w-4 h-4 text-orange-500" />} required error={formErrors.email}>
            <input type="email" value={form.email}
              onChange={e => handleChange("email", e.target.value)}
              placeholder="email@example.com" className={inputCls(formErrors.email)} />
          </Field>
              <Field
                label="Username"
                icon={<AtSign className="w-4 h-4 text-orange-500" />}
                error={formErrors.username}
                hint={!formErrors.username ? "Optional — used to log in. Letters, numbers, underscores only." : undefined}
              >
                <input
                  type="text"
                  value={form.username}
                  onChange={e => {
                    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    handleChange("username", cleaned.slice(0, 30));
                  }}
                  placeholder="seller_username (optional)"
                  maxLength={30}
                  className={inputCls(formErrors.username)}
                />
                {form.username.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <div className={`flex items-center gap-1.5 text-xs ${form.username.length >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{form.username.length >= 3 ? '✓' : '✗'}</span>
                      <span>At least 3 characters ({form.username.length}/30)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${/^[a-z0-9_]+$/.test(form.username) ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{/^[a-z0-9_]+$/.test(form.username) ? '✓' : '✗'}</span>
                      <span>Only letters, numbers, underscores</span>
                    </div>
                  </div>
                )}
              </Field>
          {/* Phone — full 11-digit PH mobile number */}
          <Field label="Phone Number" icon={<Phone className="w-4 h-4 text-orange-500" />}
            error={formErrors.phone}
            hint={!formErrors.phone ? "Format: 09XXXXXXXXX (11 digits)" : undefined}>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                handleChange("phone", digits);
              }}
              placeholder="09XXXXXXXXX"
              maxLength={11}
              className={inputCls(formErrors.phone)}
            />
          </Field>

          <Field label="Address" icon={<MapPin className="w-4 h-4 text-orange-500" />} error={formErrors.address}>
            <textarea rows={2} value={form.address}
              onChange={e => handleChange("address", e.target.value)}
              placeholder="Street, Barangay, City, Province"
              className={`${inputCls(formErrors.address)} resize-none`} />
          </Field>

          <Field label="Birthdate" icon={<User className="w-4 h-4 text-orange-500" />} error={formErrors.birthdate}>
            <input type="date" value={form.birthdate}
              onChange={e => handleChange("birthdate", e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
              className={inputCls(formErrors.birthdate)} />
          </Field>

          <Field label="New Password" icon={<Lock className="w-4 h-4 text-orange-500" />}
            error={formErrors.password} hint="Leave blank to keep the current password">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => handleChange("password", e.target.value)}
                placeholder="Enter new password (optional)"
                className={`${inputCls(formErrors.password)} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>

        {/* ── Verification Docs (read-only) ───────────────────────────── */}
        {(seller?.proof_document || seller?.valid_id_front || seller?.valid_id_back) && (
          <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-6 mt-6">
            <h2 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" /> Verification Documents
              <span className="text-xs font-normal text-gray-400 ml-1">(view only)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Barangay Certificate", url: seller?.proof_document },
                { label: "Valid ID (Front)",      url: seller?.valid_id_front },
                { label: "Valid ID (Back)",       url: seller?.valid_id_back },
              ].filter(d => d.url).map(doc => (
                <div key={doc.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">{doc.label}</p>
                  <img src={doc.url} alt={doc.label} className="w-full h-28 object-cover rounded-lg mb-2" />
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View Full
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pb-10">
          <button onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition font-medium shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSave} disabled={saving || uploadingImg}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
            {uploadingImg
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading Image…</>
              : saving
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 transition
  ${hasError ? "border-red-400 bg-red-50" : "border-gray-200"}`;

const Field = ({ label, icon, required, error, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
      {icon}{label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint  && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export default AdminEditSellerPage;
