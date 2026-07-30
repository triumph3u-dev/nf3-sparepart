/* NF3 Spare Part — Service Worker
 * เปลี่ยนเลข CACHE ทุกครั้งที่แก้ index.html ไม่งั้นเครื่องที่ติดตั้งไว้แล้ว
 * จะยังใช้ไฟล์เก่าค้างอยู่
 */
const CACHE = "nf3-sp-v13";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .catch(() => {})       // ไฟล์ใดโหลดไม่ได้ก็ยังติดตั้งต่อได้
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;

  // ไม่แตะ POST เด็ดขาด ทุก request ไป Apps Script ต้องวิ่งผ่านเน็ตจริงเสมอ
  if (req.method !== "GET") return;

  // ข้ามทุกอย่างที่ไม่ใช่โดเมนเดียวกัน (เช่น CDN ของ xlsx)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // หน้าเว็บ: เอาของใหม่ก่อน ถ้าเน็ตล่มค่อยใช้ของใน cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // ไฟล์อื่น: ใช้ cache ก่อนเพื่อความเร็ว
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
