import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { server } from './serve.mjs';

try {
  await delay(120);
  const [home, css, js, postsResponse] = await Promise.all([
    fetch('http://127.0.0.1:4173/'),
    fetch('http://127.0.0.1:4173/assets/styles.css'),
    fetch('http://127.0.0.1:4173/assets/app.js'),
    fetch('http://127.0.0.1:4173/posts.json')
  ]);
  assert.equal(home.status, 200, '首页应能正常访问');
  assert.equal(css.status, 200, '样式文件应能正常访问');
  assert.equal(js.status, 200, '脚本文件应能正常访问');
  assert.equal(postsResponse.status, 200, '文章数据应能正常访问');
  assert.match(await home.text(), /拾光 · 学习手记/, '首页标题应存在');
  assert.match(await css.text(), /\.post-grid/, '文章网格样式应存在');
  assert.match(await js.text(), /function renderPosts/, '文章渲染逻辑应存在');
  const posts = await postsResponse.json();
  assert.ok(posts.length >= 1, '至少应有一篇文章');
  assert.ok(posts.every(post => post.html && post.headings), '文章应包含构建后的正文和目录');
  console.log(`✓ 烟雾测试通过：首页、静态资源与 ${posts.length} 篇文章均可访问`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
