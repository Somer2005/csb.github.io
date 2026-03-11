import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel'; // 新版统一导入 @astrojs/vercel

// 👇 新增：修复 virtual:config 虚拟模块的插件（核心）
function fixVirtualConfigPlugin() {
  return {
    name: 'fix-virtual-config',
    resolveId(id) {
      // 识别 virtual:config 这个虚拟模块
      if (id === 'virtual:config') return '\0virtual:config';
    },
    load(id) {
      // 给虚拟模块返回基础配置（和你原有 site 保持一致）
      if (id === '\0virtual:config') {
        return `
          export const config = {
            site: 'https://Somer2005.github.io',
            title: '你的站点标题' // 可改成你想要的标题，比如 'My Blog'
          };
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
