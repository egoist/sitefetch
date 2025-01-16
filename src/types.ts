export type Options = {
  /** How many requests can be made at the same time */
  concurrency?: number

  /**
   * Match pathname by specific patterns, powered by micromatch
   * Only pages matched by this will be fetched
   */
  match?: string[]

  /**
   * The CSS selector to find content
   */
  contentSelector?:
    | string
    | ((ctx: { pathname: string }) => string | void | undefined)

  /**
   * Limit the result to this amount of pages
   */
  limit?: number

  /**
   * A custom function to fetch URL
   */
  fetch?: (url: string, init: RequestInit) => Promise<Response>

  /**
   * Enable crawling the site using a sitemap.xml, if available.
   * Falls back to default behavior if a sitemap.xml is not available.
   */
  enableSitemap?: boolean

  /**
   * Follow redirects from one domain to another. Useful for 2nd-level domains
   * that solve to a www / wwX subdomain.
   */
  followDomainRedirects?: boolean
}

export type Page = {
  title: string
  url: string
  content: string
}

export type FetchSiteResult = Map<string, Page>
