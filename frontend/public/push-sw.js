self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Time Locked", {
      body: data.body ?? "Your decision timer has expired.",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { decisionId: data.decisionId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const decisionId = event.notification.data?.decisionId;
  event.waitUntil(
    clients.openWindow(decisionId ? `/decisions/${decisionId}` : "/")
  );
});
