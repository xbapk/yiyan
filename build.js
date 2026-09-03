#!/usr/bin/env node
/**
 * 构建期注入：把 data/hitokoto.txt 的一言文案自动注入 index.html 的 FALLBACK 占位标记。
 * 零依赖，用法：编辑完 data/hitokoto.txt 后运行 `node build.js` 一次即可。
 *
 * 注入标记（形如 __HITOKOTO_FALLBACK_START__ / __HITOKOTO_FALLBACK_END__，包在一对注释斜杠里，
 * 不要手动改动这两个标记之间的内容，由本脚本自动维护）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TXT = path.join(ROOT, 'data', 'hitokoto.txt');
const HTML = path.join(ROOT, 'index.html');
const START = '/*__HITOKOTO_FALLBACK_START__*/';
const END = '/*__HITOKOTO_FALLBACK_END__*/';

if (!fs.existsSync(TXT)) {
  console.error('缺少 data/hitokoto.txt，已跳过注入');
  process.exit(1);
}

const raw = fs.readFileSync(TXT, 'utf8');
const quotes = raw.split('\n').map(s => s.trim()).filter(Boolean);
const arr = '[' + quotes.map(q => JSON.stringify(q)).join(', ') + ']';

let html = fs.readFileSync(HTML, 'utf8');

if (html.includes(START) && html.includes(END)) {
  // 已带标记：替换标记之间的内容（可重复运行）
  html = html.replace(new RegExp(START + '[\\s\\S]*?' + END), START + arr + END);
} else {
  // 首次迁移：把现有 `const FALLBACK = [...];` 换成带标记的占位
  const re = /const FALLBACK = \[[\s\S]*?\];/;
  if (!re.test(html)) {
    console.error('错误：未在 index.html 找到 `const FALLBACK = [...]` 或注入标记，注入失败');
    process.exit(1);
  }
  html = html.replace(re, 'const FALLBACK = ' + START + arr + END + ';');
}

fs.writeFileSync(HTML, html, 'utf8');
console.log('✓ 已注入 ' + quotes.length + ' 条一言文案到 index.html（构建期自动注入）');
