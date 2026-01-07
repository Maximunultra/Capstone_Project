import React from "react";
import PromotionPopup from '../../Components/PromotionPopup'; // ← ADD THIS


const BuyerDashboard = () => {
  return (
   <>
   <PromotionPopup /> 
      <div className="mb-4">
        <span className="inline-block bg-[#e5ddcf] text-[#a48a6d] px-4 py-1 rounded-full text-sm font-semibold mb-6">
          Discover Handcrafted Excellence in Legazpi City
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-[#5c5042] mb-4">
          <span className="text-[#a48a6d]">Artisan</span> Creations
          <br />from Local Masters
        </h1>
        <p className="text-lg text-[#7d7363] mb-8 max-w-xl mx-auto">
          A premium marketplace showcasing extraordinary handmade products
          crafted by talented artisans from Legazpi City and the Bicol region.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-[#a48a6d] text-white px-6 py-3 rounded shadow font-medium hover:bg-[#c08a4b]">
            Explore Collection
          </button>
          <button className="bg-white border border-[#a48a6d] text-[#a48a6d] px-6 py-3 rounded shadow font-medium hover:bg-[#e5ddcf]">
            Meet Our Artisans
          </button>
        </div>
      </div>
      <div className="mt-16">
        <span className="material-icons text-[#a48a6d] text-4xl animate-bounce">
          expand_more
        </span>
      </div>
    </>
  );
};

export default BuyerDashboard;