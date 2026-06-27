# 拾光 Notes

一个清新、轻量、零运行时依赖的个人博客。用 Markdown 写作，通过 GitHub Pages 自动部署。

https://chaoyang-xl.github.io/shiguang-notes-blog/
## 本地使用

需要 Node.js 18 或更高版本。

```bash
npm run build
npm test
npm run preview
```

然后访问 `http://127.0.0.1:4173`。

## 写一篇新文章

在 `posts/` 新建 Markdown 文件，文件名建议使用 `年-月-日-英文标题.md`：

```markdown
---
title: 文章标题
date: 2026-06-27
description: 一句话摘要，会显示在文章卡片上。
tags: [学习, JavaScript]
---

这里开始写正文。
```

支持二、三级标题、粗体、斜体、链接、引用、有序与无序列表、行内代码和围栏代码块。

## 修改个人信息

- 站名、首页介绍和“关于我”：编辑 `index.html`
- 邮箱：搜索 `hello@example.com` 并替换
- 配色与排版：编辑 `assets/styles.css` 顶部的 CSS 变量
- 站点交互：编辑 `assets/app.js`

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库。
2. 将本目录提交并推送到仓库的 `main` 分支。
3. 进入仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中把 Source 设为 **GitHub Actions**。
5. 等待 Actions 中的 `Deploy blog to GitHub Pages` 运行完成。

之后每次向 `main` 分支推送修改，博客都会自动重新构建并发布。

## 常用命令

```bash
npm run build    # 构建到 dist/
npm run dev      # 监听内容变化并持续构建
npm run preview  # 预览 dist/
npm test         # 检查首页、静态资源与文章数据
```
