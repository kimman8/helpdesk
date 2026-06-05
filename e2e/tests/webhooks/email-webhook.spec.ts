/**
 * Inbound email webhook tests — POST /api/webhooks/email
 *
 * The endpoint accepts multipart/form-data (multer) and:
 *   - Creates a Ticket row in the database
 *   - Creates a Message row linked to that ticket
 *   - Returns HTTP 200 with an empty body on success
 *   - Returns HTTP 401 when MAILGUN_WEBHOOK_SIGNING_KEY is set and the HMAC
 *     signature does not match (signature verification is skipped when the
 *     env var is absent — which is the case in the test environment)
 *
 * All tests use the `request` fixture (unauthenticated APIRequestContext) —
 * the webhook is a public endpoint that requires no session cookie.
 *
 * Verification strategy: because there is no GET /api/tickets endpoint yet,
 * correctness is asserted via HTTP status code and response body. Each test
 * sends a payload that exercises a distinct code path in the handler.
 *
 * Signature-rejection test (test 5 in the spec): the test environment has no
 * MAILGUN_WEBHOOK_SIGNING_KEY set, so the branch is unreachable at runtime.
 * The test is included but skipped with `test.skip` and a clear comment so
 * it can be activated once the key is added to the test environment.
 */

import { test, expect } from '@playwright/test'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal valid payload — every field the handler reads from req.body.
 * Callers can spread-override individual fields.
 */
function basePayload(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    sender: 'alice@example.com',
    from: 'Alice <alice@example.com>',
    subject: 'Test subject',
    'stripped-text': 'Hello, I need help.',
    timestamp: '1234567890',
    token: 'abc123token',
    signature: 'invalidsig', // irrelevant when MAILGUN_WEBHOOK_SIGNING_KEY is unset
    ...overrides,
  }
}

/**
 * Compute a valid HMAC-SHA256 signature for use in the signature-rejection
 * test. Only called inside the skipped describe block.
 */
function computeSignature(key: string, timestamp: string, token: string): string {
  return crypto.createHmac('sha256', key).update(timestamp + token).digest('hex')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('POST /api/webhooks/email', () => {
  // -------------------------------------------------------------------------
  // 1. Happy path — full payload with display name in `from`
  // -------------------------------------------------------------------------
  test('returns 200 with empty body for a valid full payload', async ({ request }) => {
    const response = await request.post('/api/webhooks/email', {
      multipart: basePayload(),
    })

    expect(response.status()).toBe(200)

    // The handler calls res.status(200).end() — body must be empty
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 2. Missing subject → defaults to "(no subject)"
  //    The endpoint still returns 200; default is applied server-side via
  //    `subject ?? '(no subject)'` before the DB insert.
  // -------------------------------------------------------------------------
  test('returns 200 when subject is omitted (defaults to "(no subject)" server-side)', async ({
    request,
  }) => {
    const payload = basePayload()
    delete (payload as Record<string, string>).subject

    const response = await request.post('/api/webhooks/email', {
      multipart: payload,
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 3. `from` with display name — fromName parsed correctly
  //    "Alice <alice@example.com>" → fromName = "Alice"
  //    The endpoint returns 200 regardless; the assertion is that the request
  //    succeeds (parse errors would surface as 500s).
  // -------------------------------------------------------------------------
  test('returns 200 when `from` contains a display name', async ({ request }) => {
    const response = await request.post('/api/webhooks/email', {
      multipart: basePayload({
        from: 'Alice Smith <alice@example.com>',
        sender: 'alice@example.com',
      }),
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 4. `from` without display name → fromName should be null
  //    When `from` is a bare email address the regex `^(.+?)\s*<` does not
  //    match, so `fromName` is set to null. The endpoint must still return 200.
  // -------------------------------------------------------------------------
  test('returns 200 when `from` is a bare email address (no display name)', async ({
    request,
  }) => {
    const response = await request.post('/api/webhooks/email', {
      multipart: basePayload({
        from: 'alice@example.com',
        sender: 'alice@example.com',
      }),
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 4b. `from` field omitted entirely — fromName defaults to null
  // -------------------------------------------------------------------------
  test('returns 200 when `from` field is absent', async ({ request }) => {
    const payload = basePayload()
    delete (payload as Record<string, string>).from

    const response = await request.post('/api/webhooks/email', {
      multipart: payload,
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 5. Invalid HMAC signature → 401
  //
  //    SKIP: The test environment (.env.test) has no MAILGUN_WEBHOOK_SIGNING_KEY
  //    set. When the key is absent the handler short-circuits signature
  //    verification and always proceeds, so the 401 branch is unreachable.
  //
  //    To activate this test:
  //      1. Set MAILGUN_WEBHOOK_SIGNING_KEY=testsecret in server/.env.test
  //      2. Remove the `test.skip(...)` call below
  // -------------------------------------------------------------------------
  test('returns 401 when MAILGUN_WEBHOOK_SIGNING_KEY is set and signature is invalid', async ({
    request,
  }) => {
    test.skip(
      !process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
      'MAILGUN_WEBHOOK_SIGNING_KEY is not set in the test environment — ' +
        'signature verification is skipped by the handler. ' +
        'Set the key in server/.env.test to enable this test.',
    )

    const response = await request.post('/api/webhooks/email', {
      multipart: basePayload({
        timestamp: '9999999999',
        token: 'badtoken',
        signature: 'badsignature',
      }),
    })

    expect(response.status()).toBe(401)
    const body = await response.text()
    expect(body).toBe('')
  })

  // -------------------------------------------------------------------------
  // 5b. Valid HMAC signature → 200 (companion to test 5)
  //
  //    Also skipped when the key is absent. Demonstrates that a correctly
  //    signed request is accepted when verification is enabled.
  // -------------------------------------------------------------------------
  test('returns 200 when MAILGUN_WEBHOOK_SIGNING_KEY is set and signature is valid', async ({
    request,
  }) => {
    test.skip(
      !process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
      'MAILGUN_WEBHOOK_SIGNING_KEY is not set in the test environment — ' +
        'signature verification is skipped by the handler. ' +
        'Set the key in server/.env.test to enable this test.',
    )

    const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY!
    const timestamp = String(Math.floor(Date.now() / 1000))
    const token = 'validtoken123'
    const signature = computeSignature(key, timestamp, token)

    const response = await request.post('/api/webhooks/email', {
      multipart: basePayload({ timestamp, token, signature }),
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('')
  })
})
