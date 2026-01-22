import type { CardListData, Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

export const theme: ThemeUserConfig = {
  title: 'Somer',
  author: 'Somer',
  description: 'Developer / Designer',
  favicon: '/favicon/favicon.ico',
  socialCard: '/images/social-card.png',
  locale: {
    lang: 'en-US',
    attrs: 'en_US',
    dateLocale: 'en-US',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  logo: {
    src: '/src/assets/avatar.png',
    alt: 'Avatar'
  },
  titleDelimiter: '-',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' }
    ]
  },
  footer: {
    year: \ \\,
    links: [
      {
        title: 'Site Policy',
        link: '/terms/list',
        pos: 2
      }
    ],
    credits: true,
    social: { github: 'https://github.com/cworld1/astro-theme-pure' }
  },
  content: {
    externalLinks: {
      content: '',
      properties: {
        style: 'user-select:none'
      }
    },
    blogPageSize: 8,
    share: ['weibo', 'x', 'bluesky']
  }
}

export const integ: IntegrationUserConfig = {
  links: {
    logbook: [],
    applyTip: [
      { name: 'Name', val: theme.title },
      { name: 'Desc', val: theme.description || 'Null' },
      { name: 'Link', val: 'https://astro-pure.js.org/' },
      { name: 'Avatar', val: 'https://astro-pure.js.org/favicon/favicon.ico' }
    ],
    cacheAvatar: false
  },
  pagefind: true,
  quote: {
    server: 'https://dummyjson.com/quotes/random',
    target: '(data) => (data.quote.length > 80 ? \\...\ : data.quote || \Error\)'
  },
  typography: {
    class: 'prose text-base',
    blockquoteStyle: 'italic',
    inlineCodeBlockStyle: 'modern'
  },
  mediumZoom: {
    enable: true,
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  waline: {
    enable: true,
    server: 'https://astro-theme-pure-waline.arthals.ink/',
    showMeta: false,
    emoji: ['bmoji', 'weibo'],
    additionalConfigs: {
      pageview: true,
      comment: true,
      locale: {
        reaction0: 'Like',
        placeholder: 'Welcome to comment. (Email to receive replies. Login is unnecessary)'
      },
      imageUploader: false
    }
  }
}

export const terms: CardListData = {
  title: 'Terms content',
  list: [
    {
      title: 'Privacy Policy',
      link: '/terms/privacy-policy'
    },
    {
      title: 'Terms and Conditions',
      link: '/terms/terms-and-conditions'
    },
    {
      title: 'Copyright',
      link: '/terms/copyright'
    },
    {
      title: 'Disclaimer',
      link: '/terms/disclaimer'
    }
  ]
}

const config = { ...theme, integ } as Config
export default config
