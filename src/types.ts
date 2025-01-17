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
   * Save results incrementally to a file
   */
  outputFile?: string

  /**
   * How many pages to process before saving to file (default: 10)
   */
  saveFrequency?: number

  /**
   * Output format for saving (default: "json")
   */
  format?: "json" | "text"

  /**
   * A custom function to fetch URL
   */
  fetch?: (url: string, init: RequestInit) => Promise<Response>
}

export type Page = {
  title: string
  url: string
  content: string
}

export type FetchSiteResult = Map<string, Page>
