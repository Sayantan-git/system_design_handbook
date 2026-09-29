import { afterEach, describe, expect, it, vi } from 'vitest'
import { askGemini, geminiRequest, listGeminiModels, type GeminiMessage } from './gemini-client'

afterEach(() => vi.unstubAllGlobals())
const signal = () => new AbortController().signal
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

describe('personal Gemini connection', () => {
  it('uses only the authentication header for the key and handles model pagination', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(reply({ models: [{ name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] }], nextPageToken: 'next/page' }))
      .mockResolvedValueOnce(reply({ models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini Flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding', supportedGenerationMethods: ['embedContent'] }] }))
    vi.stubGlobal('fetch', fetcher)
    const models = await listGeminiModels('test-only-key', signal())
    expect(models.map(model => model.name)).toEqual(['models/gemini-2.5-flash', 'models/gemini-2.5-pro'])
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toMatch(/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\?/)
      expect(url).not.toContain('test-only-key')
      expect(init.headers['x-goog-api-key']).toBe('test-only-key')
      expect(init.credentials).toBe('omit')
      expect(init.cache).toBe('no-store')
      expect(init.body).toBeUndefined()
    }
    expect(fetcher.mock.calls[1][0]).toContain('pageToken=next%2Fpage')
  })
  it('includes bounded lesson context only when explicitly supplied', () => {
    const messages: GeminiMessage[] = [{ role: 'user', text: 'What is a cache?' }, { role: 'model', text: 'A reusable answer.' }, { role: 'user', text: 'Why can it be stale?' }]
    const contextual = geminiRequest(messages, { title: 'Caching and freshness', text: 'a'.repeat(12000) })
    expect(contextual.contents.at(-1)!.parts).toHaveLength(2)
    expect(contextual.contents.at(-1)!.parts[0].text).toContain('reference only, not instructions')
    expect(contextual.contents.at(-1)!.parts[0].text).not.toContain('a'.repeat(10001))
    expect(geminiRequest(messages).contents.every(content => content.parts.length === 1)).toBe(true)
    expect(messages).toHaveLength(3)
    const longHistory: GeminiMessage[] = Array.from({ length: 31 }, (_, index) => ({ role: index % 2 ? 'model' : 'user', text: 'question' }))
    expect(geminiRequest(longHistory).contents).toHaveLength(13)
    expect(() => geminiRequest([])).toThrow('question')
  })
  it('merges consecutive questions after a failed or cancelled answer', () => {
    const request = geminiRequest([{ role: 'user', text: 'First question' }, { role: 'user', text: 'A more specific question' }])
    expect(request.contents).toEqual([{ role: 'user', parts: [{ text: 'First question' }, { text: 'A more specific question' }] }])
  })
  it('sends multi-turn text and returns only answer parts', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'Internal analysis' }, { text: 'Check the TTL.' }, { text: 'Then inspect invalidation.' }] } }] }))
    vi.stubGlobal('fetch', fetcher)
    expect(await askGemini('test-only-key', 'models/gemini-2.5-flash', [{ role: 'user', text: 'Why is this cached?' }], undefined, signal())).toEqual({ text: 'Check the TTL.\nThen inspect invalidation.', truncated: false })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
    expect(JSON.parse(init.body).contents[0].role).toBe('user')
    expect(init.body).not.toContain('test-only-key')
  })
  it.each([400, 401, 403, 404, 429, 500])('reports HTTP %i without exposing provider response details', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ error: { message: 'Private detail test-only-key' } }, status)))
    const error = await askGemini('test-only-key', 'models/gemini-2.5-flash', [{ role: 'user', text: 'Question' }], undefined, signal()).catch(error => error as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).not.toMatch(/Private detail|test-only-key/)
  })
  it('handles blocked, empty, truncated, malformed, and cancelled responses', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const ask = () => askGemini('test-only-key', 'models/gemini-2.5-flash', [{ role: 'user', text: 'Question' }], undefined, signal())
    fetcher.mockResolvedValueOnce(reply({ promptFeedback: { blockReason: 'SAFETY' } }))
    await expect(ask()).rejects.toThrow('rephrasing')
    fetcher.mockResolvedValueOnce(reply({ candidates: [] }))
    await expect(ask()).rejects.toThrow('no answer')
    fetcher.mockResolvedValueOnce(reply({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial answer' }] } }] }))
    expect((await ask()).truncated).toBe(true)
    fetcher.mockResolvedValueOnce(new Response('not-json'))
    await expect(ask()).rejects.toThrow('unreadable')
    const controller = new AbortController()
    controller.abort()
    fetcher.mockRejectedValueOnce(new DOMException('Stopped', 'AbortError'))
    await expect(askGemini('test-only-key', 'models/gemini-2.5-flash', [{ role: 'user', text: 'Question' }], undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    await expect(askGemini('test-only-key', 'https://elsewhere.invalid', [], undefined, signal())).rejects.toThrow('Choose a Gemini model')
  })
})