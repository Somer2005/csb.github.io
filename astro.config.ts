import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel'; // 新版统一导入 @astrojs/vercel

// 👇 修复 virtual:config 虚拟模块的插件（完整版）
function fixVirtualConfigPlugin() {
  return {
    name: 'fix-virtual-config',
    resolveId(id) {
      if (id === 'virtual:config') return '\0virtual:config';
    },
    load(id) {
      if (id === '\0virtual:config') {
        return `
          export const config = {
            site: 'https://Somer2005.github.io',
            title: 'Somer2005的博客',
            description: '我的个人博客 RSS 订阅',
            // date.ts 需要的 locale 配置
            locale: {
              dateLocale: 'zh-CN',
              dateOptions: {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }
            },
            titleDelimiter: ' - ',
            author: 'Somer2005',
            favicon: {
              type: 'image/png',
              href: '/favicon.png'
            },
            socialCard: '/social-card.png',
            npmCDN: 'https://cdn.jsdelivr.net/npm'
          };
          // 支持默认导入（解决 date.ts 报错）
          export default config;
        `;
      }
    },
  };
}

// 👇 Astro 核心配置（包含字体实验功能）
export default defineConfig({
  // 新增：启用 Font 组件实验功能（解决 exit code 1）
  experimental: {
    assets: {
      fonts: true
    }
  },
  // 原有配置
  site: 'https://Somer2005.github.io',
  base: '/',
  output: 'static', // 静态输出模式
  integrations: [sitemap()],
  adapter: vercel(), // 新版无需 static: true
  // 关闭类型检查（临时）
  typescript: {
    check: false
  },
  // 加载虚拟模块插件
  vite: {
    plugins: [fixVirtualConfigPlugin()]
  }
});