import React from "react";

// Dummy data for demonstration
const stats = [
	{
		label: "Total Revenue",
		value: "₱ 50,000",
		change: "+12.0%",
		changeColor: "text-green-500",
		icon: "📈",
		sub: "vs. last month",
	},
	{
		label: "Total Product sold",
		value: "180",
		change: "+8.2%",
		changeColor: "text-green-500",
		icon: "🛒",
		sub: "vs. last month",
	},
	{
		label: "Average order",
		value: "₱ 10,000",
		change: "-13.2%",
		changeColor: "text-red-500",
		icon: "💰",
		sub: "vs. last month",
	},
	{
		label: "Total Customers",
		value: "129",
		change: "+15.2%",
		changeColor: "text-green-500",
		icon: "👥",
		sub: "vs. last month",
	},
];

const topProducts = Array(7).fill({
	name: "Organic Scented Candle",
	category: "Accessories",
	price: "$34.99",
	sold: "+42 sold",
	soldColor: "text-green-500",
});



const SellerDashboard = () => {
	return (
		<div className="flex bg-[#e5e5e5] min-h-screen">
			<main className="flex-1 p-10">
				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-3xl font-bold">Dashboard</h1>
						<p className="text-gray-600">Welcome back, Bitch</p>
					</div>
					<button className="bg-white shadow px-5 py-2 rounded font-medium hover:bg-gray-100">
						View Products
					</button>
				</div>
				{/* Stats */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					{stats.map((stat, idx) => (
						<div
							key={idx}
							className="bg-white rounded-lg shadow p-6 flex flex-col gap-2 min-w-[180px]"
						>
							<div className="text-gray-500 text-sm">{stat.label}</div>
							<div className="flex items-center gap-2">
								<span className="text-2xl font-bold">{stat.value}</span>
								<span className="text-xl">{stat.icon}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className={`text-xs font-semibold ${stat.changeColor}`}>
									{stat.change}
								</span>
								<span className="text-xs text-gray-400">{stat.sub}</span>
							</div>
						</div>
					))}
				</div>
				{/* Top Selling Products */}
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-bold">Top Selling Products</h2>
						<button className="bg-white border shadow px-4 py-1 rounded hover:bg-gray-100">
							View All
						</button>
					</div>
					<div>
						{topProducts.map((prod, idx) => (
							<div
								key={idx}
								className="flex items-center py-3 border-b last:border-b-0"
							>
								<div className="w-12 h-12 bg-gray-300 rounded mr-4" />
								<div className="flex-1">
									<div className="font-semibold">{prod.name}</div>
									<div className="text-xs text-gray-500">
										{prod.category}
									</div>
								</div>
								<div className="text-right">
									<div className="font-semibold">{prod.price}</div>
									<div className={`text-xs ${prod.soldColor}`}>
										{prod.sold}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</main>
		</div>
	);
};

export default SellerDashboard;