# sitefetch

Fetch an entire site and save it as a text file (to be used with AI models).

![image](https://github.com/user-attachments/assets/e6877428-0e1c-444a-b7af-2fb21ded8814)

## Install

One-off usage (choose one of the followings):

```bash
bunx sitefetch
npx sitefetch
pnpx sitefetch
```

Install globally (choose one of the followings):

```bash
bun i -g sitefetch
npm i -g sitefetch
pnpm i -g sitefetch
```

## Usage

```bash
sitefetch https://egoist.dev -o site.txt

# or better concurrency
sitefetch https://egoist.dev -o site.txt --concurrency 10
```

### Match specific pages

Use the `-m, --match` flag to specify the pages you want to fetch:

```bash
sitefetch https://vite.dev -m "/blog/**" -m "/guide/**"
```

The match pattern is tested against the pathname of target pages, powered by micromatch, you can check out all the supported [matching features](https://github.com/micromatch/micromatch#matching-features).

### Content selector

We use [mozilla/readability](https://github.com/mozilla/readability) to extract readable content from the web page, but on some pages it might return irrelevant contents, in this case you can specify a CSS selector so we know where to find the readable content:

```sitefetch
sitefetch https://vite.dev --content-selector ".content"
```

### Follow domain redirects

You can opt-in to following domain redirects (e.g. from mywebsite.com to www.mywebsite.com):
```sitefetch
sitefetch https://vite.dev --follow-domain-redirects
```

### Sitemap crawler

Many websites include a special file `sitemap.xml` that lists all the pages on the website to help 
search engines understand and crawl the site more efficiently. This is often done automatically for blogs, 
documentation websites, and other types of sites managed through a CMS. It is usually not present for SPAs.

The sitemap crawler can be enabled through `--enable-sitemap`, although if a `sitemap.xml` is not present the site will be
crawled as normal:
``` 
sitefetch https://nextjs.org --enable-sitemap
```

## Plug

If you like this, please check out my LLM chat app: https://chatwise.app

## API

```ts
import { fetchSite } from "sitefetch"

await fetchSite("https://egoist.dev", {
  //...options
})
```

Check out options in [types.ts](./src/types.ts).

## License

MIT.
