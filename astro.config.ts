import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel'; // 新版统一导入 @astrojs/vercel

export default defineConfig({
  site: 'https://Somer2005.github.io',
  base: '/',
  output: 'static', // 静态输出模式
  integrations: [sitemap()],
  adapter: vercel(), // 移除 static: true（新版无需配置）
  // 关闭类型检查（临时）
  typescript: {
    check: false
  }
});
