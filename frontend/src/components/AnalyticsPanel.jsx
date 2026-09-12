import React, { useEffect, useState } from "react";
import { api } from "../utils/api";

const AnalyticsPanel = () => {
  const [analytics, setAnalytics] = useState(null);
  useEffect(() => { api.sellerAnalytics().then((result) => setAnalytics(result.analytics)).catch(() => {}); }, []);
  if (!analytics) return <section className="dashboard-panel"><p className="eyebrow">Seller analytics</p><h2>Loading performance…</h2></section>;
  return <section className="dashboard-panel"><p className="eyebrow">Seller analytics</p><h2>Performance</h2><div className="stat-grid"><div><span>Revenue</span><strong>${analytics.revenue.toFixed(2)}</strong></div><div><span>Orders</span><strong>{analytics.orders}</strong></div><div><span>Units sold</span><strong>{analytics.unitsSold}</strong></div><div><span>Inventory</span><strong>{analytics.inventory}</strong></div></div></section>;
};
export default AnalyticsPanel;
