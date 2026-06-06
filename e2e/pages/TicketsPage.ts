import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the tickets section of / (home/dashboard).
 *
 * Covers:
 *  - The three stat cards rendered above the table in HomePage
 *  - The TicketsTable card and its table/loading/empty states
 *
 * Selector strategy: ARIA-first.  The TicketsTable component uses shadcn
 * <Table> / <Badge> primitives with no data-testid attributes, so we rely on:
 *  - `getByRole('table')` for the table element
 *  - `getByRole('row')` filtered by cell text for individual rows
 *  - `getByText()` for loading and empty-state messages (exact text from
 *    the component source)
 *  - `getByText()` for stat card labels
 */
export class TicketsPage {
  readonly page: Page

  // ── Table card ────────────────────────────────────────────────────────────
  readonly tableCard: Locator
  readonly table: Locator
  readonly loadingText: Locator
  readonly emptyState: Locator

  // ── Stat cards ────────────────────────────────────────────────────────────
  readonly openTicketsStat: Locator
  readonly resolvedStat: Locator
  readonly unassignedStat: Locator

  constructor(page: Page) {
    this.page = page

    this.tableCard = page.getByText('All tickets')
    this.table = page.getByRole('table')
    this.loadingText = page.getByText('Loading…')
    this.emptyState = page.getByText('No tickets yet')

    // Stat cards are identified by their label text (uppercase, rendered via
    // Tailwind `uppercase tracking-wide`).  We match case-insensitively so the
    // test is resilient to future capitalisation tweaks.
    this.openTicketsStat = page.getByText('Open tickets', { exact: false })
    this.resolvedStat = page.getByText('Resolved', { exact: false })
    this.unassignedStat = page.getByText('Unassigned', { exact: false })
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/')
    await expect(this.page).toHaveURL('/')
  }

  // ── Table state helpers ────────────────────────────────────────────────────

  /**
   * Wait for the table to finish loading.
   * Asserts the "Loading…" text is gone and the <table> element is visible.
   */
  async waitForTableLoaded() {
    await expect(this.loadingText).not.toBeVisible()
    await expect(this.table).toBeVisible()
  }

  /**
   * Wait for the GET /api/tickets response and return it.
   * Start the promise BEFORE navigating so the intercept is registered in time.
   */
  waitForTicketsResponse() {
    return this.page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/tickets') &&
        resp.request().method() === 'GET' &&
        resp.status() === 200,
    )
  }

  // ── Row helpers ────────────────────────────────────────────────────────────

  /**
   * Return the <tr> whose Subject cell contains the given subject text.
   */
  rowBySubject(subject: string): Locator {
    return this.page.getByRole('row').filter({ hasText: subject })
  }

  /**
   * Assert a row for the given subject is visible in the table.
   */
  async expectRowVisible(subject: string) {
    await expect(this.rowBySubject(subject)).toBeVisible()
  }

  /**
   * Return all data rows in the table (excludes the header row).
   * The header row is the only <tr> inside <thead>; data rows are inside <tbody>.
   */
  dataRows(): Locator {
    return this.page.locator('tbody tr')
  }

  /**
   * Return the text content of the Subject cell for the row at the given
   * zero-based index (0 = topmost data row = newest ticket).
   */
  async subjectAtIndex(index: number): Promise<string> {
    const row = this.dataRows().nth(index)
    // Subject is in the first <td>
    return (await row.locator('td').first().textContent()) ?? ''
  }
}
