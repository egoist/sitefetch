import Queue from "p-queue"
import { Window } from "happy-dom"
import { Readability } from "@mozilla/readability"
import c from "picocolors"
import { toMarkdown } from "./to-markdown.ts"
import { logger } from "./logger.ts"
import { load } from "cheerio"
import { matchPath } from "./utils.ts"
import type { Options, FetchSiteResult } from "./types.ts"
import { XMLParser } from "fast-xml-parser"

export async function fetchSite(
  url: string,
  options: Options
): Promise<FetchSiteResult> {
  const fetcher = new Fetcher(options)

  return fetcher.fetchSite(url)
}

class Fetcher {
  #pages: FetchSiteResult = new Map()
  #fetched: Set<string> = new Set()
  #queue: Queue

  #userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.3"

  constructor(public options: Options) {
    const concurrency = options.concurrency || 3
    this.#queue = new Queue({ concurrency })
  }

  async fetchSite(url: string) {
    logger.info(
      `Started fetching ${c.green(url)} with a concurrency of ${
        this.#queue.concurrency
      }`
    )

    if (this.options.enableSitemap) {
      logger.info(`Crawling sitemap...`)
      await this.#crawlSitemap(url)
    }

    await this.#fetchPage(url, {
      skipMatch: true
    })

    await this.#queue.onIdle()

    return this.#pages
  }

  async #crawlSitemap(url: string) {
    logger.warn(`Crawling sitemap for ${url}`)
    const sitemapUrl = new URL(url)
    sitemapUrl.pathname = `/sitemap.xml`

    logger.info(`Fetching sitemap at ${sitemapUrl}`)

    try {
      const sitemapResponse = await (this.options.fetch || fetch)(
        sitemapUrl.toString(), {
          headers: {
            "user-agent": this.#userAgent
          }
        }
      )
      if (!sitemapResponse.ok) {
        logger.warn(`Unable to fetch sitemap`)
      }
      else {
        const parser = new XMLParser()
        const sitemap = parser.parse(await sitemapResponse.text())["urlset"]
        if (!sitemap || !sitemap["url"]) {
          throw new Error(`invalid sitemap.xml`)
        }
        const urls = Array.isArray(sitemap["url"])
          ? sitemap["url"].map((url: any) => url["loc"])
          : [sitemap["url"]["loc"]]

        if (urls.length > 0) {
          logger.info(`Located URLs in sitemap:\n\t${urls.join("\n\t")}`)
          const options = this.options
          urls.map(u => this.#queue.add(() =>
            this.#fetchPage(u, { ...options, skipMatch: false })
          ))
          logger.info(`Sitemap URLs added to queue.`)

        }

      }
    }
    catch (err: any) {
      logger.warn(`Unable to get or parse sitemap:`, err.message)
    }


  }

  #limitReached() {
    return this.options.limit && this.#pages.size >= this.options.limit
  }

  #getContentSelector(pathname: string) {
    if (typeof this.options.contentSelector === "function")
      return this.options.contentSelector({ pathname })

    return this.options.contentSelector
  }

  async #fetchPage(
    url: string,
    options: {
      skipMatch?: boolean
    }
  ) {
    const { host, pathname } = new URL(url)

    if (this.#fetched.has(pathname) || this.#limitReached()) {
      return
    }

    this.#fetched.add(pathname)

    // return if not matched
    // we don't need to extract content for this page
    if (
      !options.skipMatch &&
      this.options.match &&
      !matchPath(pathname, this.options.match)
    ) {
      return
    }

    logger.info(`Fetching ${c.green(url)}`)

    const res = await (this.options.fetch || fetch)(url, {
      headers: {
        "user-agent": this.#userAgent
      }
    })

    if (!res.ok) {
      logger.warn(`Failed to fetch ${url}: ${res.statusText}`)
      return
    }

    if (this.#limitReached()) {
      return
    }

    const contentType = res.headers.get("content-type")

    if (!contentType?.includes("text/html")) {
      logger.warn(`Not a HTML page: ${url}`)
      return
    }

    const resUrl = new URL(res.url)

    // redirected to other site, ignore
    if (resUrl.host !== host) {
      if (!this.options.followDomainRedirects) {
        logger.warn(`Redirected from ${host} to ${resUrl.host}`)
        return
      }
    }
    const extraUrls: string[] = []

    const $ = load(await res.text())
    $("script,style,link,img,video").remove()

    $("a").each((_, el) => {
      const href = $(el).attr("href")

      if (!href) {
        return
      }

      const thisUrl = new URL(href, url)
      if (thisUrl.host !== host) {
        return
      }

      extraUrls.push(thisUrl.href)
    })

    if (extraUrls.length > 0) {
      for (const url of extraUrls) {
        this.#queue.add(() =>
          this.#fetchPage(url, { ...options, skipMatch: false })
        )
      }
    }

    const window = new Window({
      url,
      settings: {
        disableJavaScriptFileLoading: true,
        disableJavaScriptEvaluation: true,
        disableCSSFileLoading: true
      }
    })

    const pageTitle = $("title").text()
    const contentSelector = this.#getContentSelector(pathname)
    const html = contentSelector
      ? $(contentSelector).prop("outerHTML")
      : $.html()

    if (!html) {
      logger.warn(`No readable content on ${pathname}`)
      return
    }

    window.document.write(html)

    await window.happyDOM.waitUntilComplete()

    const article = new Readability(window.document as any).parse()

    await window.happyDOM.close()

    if (!article) {
      return
    }

    const content = toMarkdown(article.content)

    this.#pages.set(pathname, {
      title: article.title || pageTitle,
      url,
      content
    })
  }
}

export function serializePages(
  pages: FetchSiteResult,
  format: "json" | "text"
): string {
  if (format === "json") {
    return JSON.stringify([...pages.values()])
  }

  return [...pages.values()]
    .map((page) =>
      `<page>
  <title>${page.title}</title>
  <url>${page.url}</url>
  <content>${page.content}</content>
</page>`.trim()
    )
    .join("\n\n")
}
