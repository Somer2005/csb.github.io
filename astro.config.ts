import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel'; // 新版统一导入 @astrojs/vercel

// 👇 新增：修复 virtual:config 虚拟模块的插件（核心）
// 👇 替换原来的 fixVirtualConfigPlugin 函数
function fixVirtualConfigPlugin() {
  return {
    name: 'fix-virtual-config',
    resolveId(id) {
      if (id === 'virtual:config') return '\0virtual:config';
    },
    load(id) {
      if (id === '\0virtual:config') {
        // 👇 同时导出默认配置 + 命名配置（兼容所有导入方式）
        return `
          export const config = {
            site: 'https://Somer2005.github.io',
            title: 'Somer2005的博客',
            description: '我的个人博客 RSS 订阅',
            // 👇 新增 date.ts 需要的 locale 配置（核心！）
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
          // 👇 支持默认导入（解决 date.ts 报错）
          export default config;
        `;
      }
    },
  };
}
export default defineConfig({
  site: 'https://Somer2005.github.io',
  base: '/',
  output: 'static', // 静态输出模式
  integrations: [sitemap()],
  adapter: vercel(), // 移除 static: true（新版无需配置）
  // 关闭类型检查（临时）
  typescript: {
    check: false
  },
  // 👇 新增：加载虚拟模块插件（关键）
  vite: {
    plugins: [fixVirtualConfigPlugin()]
  }
});
