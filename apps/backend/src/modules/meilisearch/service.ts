import { MeiliSearch as Meilisearch } from "meilisearch"
import type { SearchDoc } from "../../lib/search-doc"

const TIMEOUT_MS = 5000 // CLAUDE.md rule 7

type Options = { host: string; apiKey: string; indexName: string }

export default class MeilisearchModuleService {
  private client_: Meilisearch
  private indexName_: string

  constructor(_deps: unknown, options: Options) {
    this.client_ = new Meilisearch({ host: options.host, apiKey: options.apiKey, timeout: TIMEOUT_MS })
    this.indexName_ = options.indexName
  }

  private get index() {
    return this.client_.index<SearchDoc>(this.indexName_)
  }

  /** Idempotent: creates the index if needed and (re)applies the settings. Accent folding (phở = pho) is Meilisearch's default. */
  async configure() {
    const task = await this.client_.createIndex(this.indexName_, { primaryKey: "id" }).catch(() => null)
    if (task) await this.client_.tasks.waitForTask(task.taskUid, { timeOutMs: 30_000 })
    const settings = await this.index.updateSettings({
      searchableAttributes: ["title", "category_names", "description"],
      filterableAttributes: ["category_ids", "size", "color", "price_min", "in_stock"],
      sortableAttributes: ["price_min", "created_at_ts", "sold"],
    })
    await this.client_.tasks.waitForTask(settings.taskUid, { timeOutMs: 30_000 })
  }

  async upsert(docs: SearchDoc[]) {
    if (!docs.length) return
    const task = await this.index.addDocuments(docs)
    await this.client_.tasks.waitForTask(task.taskUid, { timeOutMs: 60_000 })
  }

  async remove(ids: string[]) {
    if (!ids.length) return
    await this.index.deleteDocuments(ids)
  }

  async clear() {
    await this.index.deleteAllDocuments()
  }

  search(q: string, params: { filter?: string[]; facets?: string[]; sort?: string[]; limit: number; offset: number }) {
    return this.index.search(q, params)
  }
}
