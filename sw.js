/* 随机壁纸 Service Worker
   策略：
   - 图片(webp/png/jpg/gif/svg)：缓存优先（文件名稳定不变，命中即秒开，不再回源）
   - 页面/清单/文案(html/json/txt)：网络优先，失败回退缓存（保证更新及时、离线可用）
   版本号变更即清空旧缓存（改动资源时请 bump 版本）。 */
const CACHE = 'yujpg-v2'; // v2：图片格式由 webp 切换为 png，旧缓存需失效

// 首次安装时预缓存核心壳（尽力而为，单个失败不影响整体）
const CORE = ['index.html', 'manifest.json', 'data/hitokoto.txt', 'favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(CORE.map((u) => c.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 仅同源

  // 图片：缓存优先
  if (/\.(webp|png|jpe?g|gif|svg|avif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 其他（html/json/txt 等）：网络优先，失败回退缓存
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
