const state = { posts: [], query: '', tag: '全部' };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function postUrl(slug) {
  return `#/post/${encodeURIComponent(slug)}`;
}

async function loadPosts() {
  try {
    const response = await fetch('./posts.json');
    if (!response.ok) throw new Error('文章数据加载失败');
    state.posts = await response.json();
    state.posts.sort((a, b) => b.date.localeCompare(a.date));
    renderTags();
    renderPosts();
    renderArchive();
    route();
  } catch (error) {
    $('.post-grid').innerHTML = `<p class="load-error">${error.message}，请先运行 <code>npm run build</code>。</p>`;
  }
}

function renderTags() {
  const tags = ['全部', ...new Set(state.posts.flatMap(post => post.tags))];
  $('.tag-list').innerHTML = tags.map(tag => `<button class="tag-button${tag === state.tag ? ' active' : ''}" data-tag="${tag}" type="button">${tag}</button>`).join('');
}

function filteredPosts() {
  const needle = state.query.trim().toLocaleLowerCase();
  return state.posts.filter(post => {
    const matchesTag = state.tag === '全部' || post.tags.includes(state.tag);
    const haystack = `${post.title} ${post.description} ${post.tags.join(' ')}`.toLocaleLowerCase();
    return matchesTag && (!needle || haystack.includes(needle));
  });
}

function renderPosts() {
  const posts = filteredPosts();
  const grid = $('.post-grid');
  const template = $('#post-card-template');
  grid.innerHTML = '';
  for (const post of posts) {
    const card = template.content.cloneNode(true);
    $('.post-card-link', card).href = postUrl(post.slug);
    $('.post-date', card).textContent = formatDate(post.date);
    $('.read-time', card).textContent = `${post.readingTime} MIN READ`;
    $('h3', card).textContent = post.title;
    $('.post-excerpt', card).textContent = post.description;
    $('.post-tags', card).innerHTML = post.tags.slice(0, 2).map(tag => `<span># ${tag}</span>`).join('');
    grid.append(card);
  }
  $('.post-count').textContent = `共 ${posts.length} 篇笔记`;
  $('.empty-state').hidden = posts.length !== 0;
}

function renderArchive() {
  const grouped = Object.groupBy ? Object.groupBy(state.posts, post => post.date.slice(0, 4)) : state.posts.reduce((acc, post) => {
    (acc[post.date.slice(0, 4)] ||= []).push(post);
    return acc;
  }, {});
  $('.archive-list').innerHTML = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([year, posts]) => `
    <div class="archive-year">
      <strong>${year}</strong>
      <div>${posts.map(post => `<a class="archive-item" href="${postUrl(post.slug)}"><time>${post.date.slice(5).replace('-', '.')}</time><span>${post.title}</span><small>${post.tags[0]}</small></a>`).join('')}</div>
    </div>`).join('');
}

function enhanceArticle() {
  $$('.code-block').forEach(block => {
    $('.copy-code', block)?.addEventListener('click', async event => {
      const code = $('code', block).textContent;
      await navigator.clipboard.writeText(code);
      event.currentTarget.textContent = '已复制 ✓';
      setTimeout(() => { event.currentTarget.textContent = '复制代码'; }, 1600);
    });
  });
}

function showArticle(post) {
  $('.home-view').hidden = true;
  $('.article-view').hidden = false;
  $('.article-tags').innerHTML = post.tags.map(tag => `<span># ${tag}</span>`).join('');
  $('.article-header h1').textContent = post.title;
  $('.article-description').textContent = post.description;
  $('.article-meta').textContent = `${formatDate(post.date)}  ·  ${post.readingTime} 分钟阅读`;
  $('.article-content').innerHTML = post.html;
  $('.toc nav').innerHTML = post.headings.map(heading => `<a class="${heading.level === 3 ? 'sub' : ''}" href="#${heading.id}">${heading.text}</a>`).join('');
  document.title = `${post.title} · 拾光 Notes`;
  enhanceArticle();
  scrollTo(0, 0);
}

function showHome() {
  $('.home-view').hidden = false;
  $('.article-view').hidden = true;
  document.title = '拾光 · 学习手记';
}

function route() {
  const match = location.hash.match(/^#\/post\/(.+)$/);
  if (match) {
    const post = state.posts.find(item => item.slug === decodeURIComponent(match[1]));
    if (post) return showArticle(post);
  }
  showHome();
}

$('.tag-list').addEventListener('click', event => {
  const button = event.target.closest('[data-tag]');
  if (!button) return;
  state.tag = button.dataset.tag;
  renderTags();
  renderPosts();
});

$('.search-box input').addEventListener('input', event => {
  state.query = event.target.value;
  renderPosts();
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('.search-box input').focus();
  }
  if (event.key === 'Escape') $('.search-box input').blur();
});

$('.theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('shiguang-theme', next);
});

$('.back-button').addEventListener('click', () => { location.hash = '#/'; });
$('.toc nav').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  document.getElementById(link.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
});
window.addEventListener('hashchange', route);
$('.current-year').textContent = new Date().getFullYear();

loadPosts();
