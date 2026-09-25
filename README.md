# EtherGray Blog

一个基于 **Astro** 构建的个人博客。

Personal blog built with **Astro**.

🌐 **Blog / 博客：** [Ethergray Blog](https://ethergray.netlify.app/)

## ✨ Features / 特性

- ⚡ Fast and lightweight static site
- 📝 Markdown / MDX blog posts
- 🎨 Responsive design
- 🌙 Light / Dark mode
- 🔎 Static search
- 📱 Mobile-friendly
- 🚀 Automatic deployment with Netlify
- 🧩 Built with Tailwind CSS

## 🛠️ Tech Stack / 技术栈

- **Framework:** Astro
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Package Manager:** npm
- **Deployment:** Netlify
- **Version Control:** Git + GitHub

## 📁 Project Structure / 项目结构

```text
/
├── public/                 # Static assets / 静态资源
├── src/
│   ├── assets/             # Images and icons / 图片与图标
│   ├── components/         # Reusable components / 可复用组件
│   ├── content/            # Blog content / 博客内容
│   │   ├── pages/
│   │   └── posts/
│   ├── i18n/               # Internationalization / 国际化
│   ├── layouts/            # Page layouts / 页面布局
│   ├── pages/              # Routes / 页面路由
│   ├── scripts/            # Client-side scripts / 客户端脚本
│   ├── styles/             # Global styles / 全局样式
│   ├── types/              # Type definitions / 类型定义
│   └── utils/              # Utility functions / 工具函数
│
├── astro.config.ts         # Astro configuration / Astro 配置
├── astro-paper.config.ts   # Site configuration / 网站配置
├── package.json            # Project dependencies / 项目依赖
├── package-lock.json       # Dependency lockfile / 依赖锁定文件
└── tsconfig.json           # TypeScript configuration / TypeScript 配置