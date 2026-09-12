self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Goodsly update", body: "You have a new notification." };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/favicon.ico", data: data.data || {} }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard"));
});
