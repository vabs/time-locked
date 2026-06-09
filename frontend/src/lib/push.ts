export async function subscribeToPush(
  get: (path: string) => Promise<unknown>,
  post: (path: string, body: unknown) => Promise<unknown>
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const { publicKey } = (await get("/push/vapid-public-key")) as {
    publicKey?: string;
  };

  if (!publicKey) {
    throw new Error("Push notifications are not configured");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await post("/push/subscribe", subscription.toJSON());
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
