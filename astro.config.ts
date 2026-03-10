import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  site: 'https://Somer2005.github.io',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  adapter: vercel({ static: true })
});
