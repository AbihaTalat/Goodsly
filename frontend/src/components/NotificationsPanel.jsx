import React, { useEffect, useState } from "react";
import { api } from "../utils/api";

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => { api.notifications().then((result) => setNotifications(result.notifications || [])).catch(() => {}); }, []);
  return <section className="dashboard-panel"><p className="eyebrow">Updates</p><h2>Notifications</h2>{notifications.length ? notifications.map((item) => <button className="notification-row" key={item._id} onClick={() => api.markNotificationRead(item._id).then(() => setNotifications((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry)))}><strong>{item.title}</strong><span>{item.body}</span></button>) : <p className="empty-dashboard">You’re all caught up.</p>}</section>;
};
export default NotificationsPanel;
