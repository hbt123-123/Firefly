<div align="center">

# 潼潼不是洞洞

> 基于 Firefly 主题搭建的个人博客

> ![Node.js >= 22](https://img.shields.io/badge/node.js-%3E%3D22-brightgreen) 
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)
![Astro](https://img.shields.io/badge/Astro-5.17.2-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)

</div>

---

## 关于本站

这是 **李卓潼** 的个人博客，记录环境工程、人工智能、编程等领域的学习笔记与思考。

本站基于 [Firefly](https://github.com/CuteLeaf/Firefly) 主题搭建，Firefly 是一个清新美观的 Astro 静态博客主题模板，基于 [fuwari](https://github.com/saicaca/fuwari) 二次开发。

## ✨ 特性

- **Astro + Tailwind CSS** - 基于现代技术栈的超快静态站点生成
- **流畅动画** - Swup 页面切换动画，丝滑的浏览体验
- **响应式设计** - 完美适配桌面、平板和移动端
- **全文搜索** - 基于 Pagefind 的客户端搜索
- **双侧边栏** - 支持单侧栏、双侧栏配置
- **文章布局** - 支持列表（单列）和网格（多列/瀑布流）布局
- **亮色/暗色模式** - 支持亮色/暗色/跟随系统三种模式
- **主题色自定义** - 360° 色相自由调节
- **多语言支持** - i18n 国际化，支持简体中文、繁体中文、英文、日文、俄语
- **Markdown 扩展** - 支持 Admonitions、GitHub 仓库卡片、数学公式、Mermaid 图表等

## 🚀 本地开发

### 环境要求

- Node.js ≥ 22
- pnpm ≥ 9

### 开始

1. **克隆仓库：**
   ```bash
   git clone https://github.com/hbt123-123/Firefly.git
   cd Firefly
   ```

2. **安装依赖：**
   ```bash
   pnpm install
   ```

3. **启动开发服务器：**
   ```bash
   pnpm dev
   ```
   博客将在 `http://localhost:4321` 运行

## 🧞 命令

| 命令                        | 说明                                              |
|:---------------------------|:--------------------------------------------------|
| `pnpm install`             | 安装依赖                                          |
| `pnpm dev`                 | 启动本地开发服务器 `localhost:4321`                |
| `pnpm build`               | 构建站点到 `./dist/`                               |
| `pnpm preview`             | 本地预览构建产物                                   |
| `pnpm check`               | 代码检查                                          |
| `pnpm new-post <filename>` | 创建新文章                                        |

## 📖 配置

配置文件位于 `src/config/` 目录下：

```
src/
├── config/
│   ├── siteConfig.ts           # 站点基础配置（标题、描述、语言等）
│   ├── profileConfig.ts        # 个人资料（头像、昵称、社交链接）
│   ├── sidebarConfig.ts        # 侧边栏布局配置
│   ├── navBarConfig.ts         # 导航栏配置
│   ├── backgroundWallpaper.ts  # 背景壁纸配置
│   ├── fontConfig.ts           # 字体配置
│   ├── commentConfig.ts        # 评论系统配置
│   ├── musicConfig.ts          # 音乐播放器配置
│   ├── friendsConfig.ts        # 友链配置
│   ├── footerConfig.ts         # 页脚配置
│   └── ...
```

## 🙏 致谢

- 主题框架：[Firefly](https://github.com/CuteLeaf/Firefly) by [CuteLeaf](https://github.com/CuteLeaf)
- 原始模板：[fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca)

### 技术栈

- [Astro](https://astro.build) 
- [Tailwind CSS](https://tailwindcss.com) 
- [Svelte](https://svelte.dev)
- [Iconify](https://iconify.design)

## 📝 许可证

本项目基于 [MIT](https://mit-license.org/) 许可证开源。

**版权声明：**
- Copyright (c) 2024 [saicaca](https://github.com/saicaca) - [fuwari](https://github.com/saicaca/fuwari)
- Copyright (c) 2025 [CuteLeaf](https://github.com/CuteLeaf) - [Firefly](https://github.com/CuteLeaf/Firefly)