/* jsdom 烟雾测试：用真实 index.html 跑通 init()，验证
   P0-1 预加载池接线 + 一言文案（成功路径 & 404 回退路径）均正常。 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = 'C:\\Users\\pyk\\Desktop\\new\\代码\\随机壁纸';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const hitokotoText = fs.readFileSync(path.join(ROOT, 'data', 'hitokoto.txt'), 'utf8');

function makeFetch(hitokotoOk) {
  return async (url) => {
    if (url === 'manifest.json') {
      return { ok: true, json: async () => manifest, text: async () => JSON.stringify(manifest) };
    }
    if (url === 'data/hitokoto.txt') {
      if (hitokotoOk) return { ok: true, text: async () => hitokotoText };
      return { ok: false, status: 404, text: async () => 'not found' };
    }
    return { ok: false, status: 404, text: async () => 'not found' };
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runScenario(name, hitokotoOk) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && e.message)));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole: vc,
    beforeParse(window) {
      window.fetch = makeFetch(hitokotoOk);
      window.addEventListener('unhandledrejection', ev =>
        errors.push('unhandledrejection: ' + (ev.reason && ev.reason.message)));
    },
  });

  await sleep(500); // 等 init() 异步跑完

  // 注入探针脚本：经典脚本顶层 let/const 位于共享全局词法环境，可被后续脚本读取
  const probe = dom.window.document.createElement('script');
  probe.textContent = `
    window.__probe = (function(){
      try {
        return {
          preloadedAnime: (typeof preloaded!=='undefined' && preloaded.anime) || false,
          animeLen: (typeof animeImages!=='undefined'? animeImages.length : -1),
          hitokotoLen: (typeof hitokotoList!=='undefined'? hitokotoList.length : -1),
          quote: (document.getElementById('wallpaperQuoteSpan')||{}).textContent || ''
        };
      } catch(e){ return { error: String(e) }; }
    })();
  `;
  dom.window.document.body.appendChild(probe);
  await sleep(50);

  const p = dom.window.__probe || {};
  const quoteBad = p.quote === 'not found' || p.quote.trim() === '';
  console.log(`\n[${name}]`);
  console.log('  errors      :', errors.length ? errors : 'none');
  console.log('  preloadedAnime:', p.preloadedAnime);
  console.log('  animeLen     :', p.animeLen, '(manifest anime=', manifest.anime.length, ')');
  console.log('  hitokotoLen  :', p.hitokotoLen);
  console.log('  quote        :', JSON.stringify(p.quote.slice(0, 30)));
  console.log('  quoteBad     :', quoteBad);
  return { errors, p, quoteBad };
}

(async () => {
  const a = await runScenario('SUCCESS 命中 hitokoto.txt', true);
  const b = await runScenario('404 回退 FALLBACK', false);
  const ok =
    a.errors.length === 0 && b.errors.length === 0 &&
    a.p.preloadedAnime === true && b.p.preloadedAnime === true &&
    a.p.animeLen === manifest.anime.length &&
    !a.quoteBad && !b.quoteBad;
  console.log('\n==== RESULT:', ok ? 'PASS' : 'FAIL', '====');
  process.exit(ok ? 0 : 1);
})();
