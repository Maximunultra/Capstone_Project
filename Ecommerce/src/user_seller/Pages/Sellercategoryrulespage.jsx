import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, DollarSign, Tag, ArrowLeft, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const SellerCategoryRulesPage = () => {
  const navigate = useNavigate();
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/products/categories`);
        if (!res.ok) throw new Error('Failed to load rules');
        const data = await res.json();
        setRules(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-amber-700 hover:text-amber-900 font-medium text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="mb-8 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#3d2e1e]">
              📋 Category Rules
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Read these rules carefully before adding a product. Products that don't meet the requirements will be automatically rejected.
            </p>
          </div>
        </div>

        {/* ── How it works ───────────────────────────────────── */}
        <div className="mb-6 bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-4 sm:p-6">
          <h2 className="font-bold text-amber-900 text-base sm:text-lg mb-3 flex items-center gap-2">
            ⚙️ How Auto-Approval Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <span className="text-2xl mt-0.5">✅</span>
              <div>
                <p className="font-bold text-green-800 text-sm">Auto-Approved</p>
                <p className="text-xs text-green-700 mt-1 leading-relaxed">Your product's price is within the allowed range and the brand/material matches the category's allowed list.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <span className="text-2xl mt-0.5">❌</span>
              <div>
                <p className="font-bold text-red-800 text-sm">Auto-Rejected</p>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">Your product's price is out of the allowed range or the material is not listed under that category.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Rules Grid ─────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-amber-700">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading rules…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Failed to load rules: {error}</p>
          </div>
        )}

        {!loading && !error && rules.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No category rules have been set yet.</p>
            <p className="text-sm mt-1">Check back later or contact an admin.</p>
          </div>
        )}

        {!loading && !error && rules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <div
                key={rule.category}
                className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 p-4 sm:p-5"
              >
                {/* Category badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <h3 className="font-bold text-[#3d2e1e] text-base">{rule.category}</h3>
                </div>

                {/* Price range */}
                {(rule.min_price != null || rule.max_price != null) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-3 bg-amber-50 rounded-lg px-3 py-2">
                    <DollarSign className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="font-medium text-gray-600 text-xs">Price:</span>
                    <span className="font-bold text-amber-800 text-xs">
                      {rule.min_price != null ? `₱${rule.min_price.toLocaleString()}` : 'Any'}
                      {' – '}
                      {rule.max_price != null ? `₱${rule.max_price.toLocaleString()}` : 'Any'}
                    </span>
                  </div>
                )}

                {/* Allowed materials */}
                {rule.allowed_materials?.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="font-semibold uppercase tracking-wide">Allowed Materials</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.allowed_materials.map(m => (
                        <span
                          key={m}
                          className="bg-orange-50 text-orange-700 border border-orange-200 text-[11px] px-2 py-0.5 rounded-full font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No material restriction</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tip footer ─────────────────────────────────────── */}
        {!loading && !error && rules.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-sm text-amber-800 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">💡</span>
            <div>
              <strong>Tip:</strong> Make sure your product's <strong>price</strong> falls within the range and your{' '}
              <strong>brand/material</strong> matches one of the allowed materials for your chosen category.
              Double-check before submitting to avoid automatic rejection.
            </div>
          </div>
        )}

        {/* ── CTA ────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <span>+</span> Go Add a Product
          </button>
        </div>

      </div>
    </div>
  );
};

export default SellerCategoryRulesPage;
