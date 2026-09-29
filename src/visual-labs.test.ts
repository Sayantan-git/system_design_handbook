import { describe, expect, it } from 'vitest'
import source from '../content/handbook.md?raw'
import { parseBook } from './book'
import { resolveTopic } from './curriculum'
import { roundRobinFrame, visualLabs } from './visual-labs'

describe('interactive fundamentals', () => {
  it('provides six finite simulations linked to the actual reading', () => {
    const book = parseBook(source)
    expect(visualLabs).toHaveLength(6)
    expect(new Set(visualLabs.map(lab => lab.id)).size).toBe(6)
    for (const lab of visualLabs) {
      expect(lab.frames.length).toBeGreaterThan(3)
      expect(resolveTopic(book, lab.topic).section).toBeTruthy()
      for (const frame of lab.frames) {
        expect(frame.caption.length).toBeGreaterThan(8)
        expect(frame.detail.length).toBeGreaterThan(100)
        expect(frame.metrics).toHaveLength(2)
      }
    }
  })
  it('balances eight requests without confusing equal counts with equal work', () => {
    for (const delivered of [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 8]) {
      const frame = roundRobinFrame(delivered)
      const counts = [0, 1, 2, 3].map(index => Number(frame.values[`server${index}`]))
      expect(counts.reduce((total, count) => total + count, 0)).toBe(delivered)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
      expect(frame.values.next).toBe(delivered % 4)
    }
    expect(roundRobinFrame(8).metrics[1][1]).toBe('2 · 2 · 2 · 2')
    expect(roundRobinFrame(8).detail).toContain('do not imply equal')
    for (const invalid of [-1, 9, 0.5, NaN]) expect(() => roundRobinFrame(invalid)).toThrow()
  })
  it('skips database work on hits and fills only after a database read', () => {
    const frames = visualLabs.find(lab => lab.id === 'cache')!.frames
    expect(frames[1].values.reads).toBe(0)
    expect(frames[2].values.cacheB).toBe('')
    expect(frames[3].values.reads).toBe(1)
    expect(frames[4].values.cacheB).toBe('B')
    expect(frames[5].values.reads).toBe(1)
    expect(frames[5].values.hits).toBe(2)
  })
  it('separates queued, in-flight, and acknowledged work', () => {
    const frames = visualLabs.find(lab => lab.id === 'queue')!.frames
    expect(frames[2].values.depth).toBe(2)
    expect(frames[3].values).toMatchObject({ depth: 1, consumer: 'A', completed: 0 })
    expect(frames.at(-1)!.values).toMatchObject({ depth: 0, consumer: '', completed: 2 })
  })
  it('shows stale replica reads before convergence', () => {
    const frames = visualLabs.find(lab => lab.id === 'replication')!.frames
    expect(frames[3].values).toMatchObject({ primary: 2, replicaA: 2, replicaB: 1 })
    expect(frames.at(-1)!.values).toMatchObject({ primary: 2, replicaA: 2, replicaB: 2 })
  })
  it('rejects an empty bucket and admits new work only after refill', () => {
    const frames = visualLabs.find(lab => lab.id === 'limiter')!.frames
    expect(frames[4].values).toEqual({ tokens: 0, accepted: 3, rejected: 1 })
    expect(frames[5].values.tokens).toBe(1)
    expect(frames[6].values).toEqual({ tokens: 0, accepted: 4, rejected: 1 })
  })
  it('does not show WebSocket data frames before the upgrade succeeds', () => {
    const frames = visualLabs.find(lab => lab.id === 'websocket')!.frames
    expect(frames[1].values).toMatchObject({ connected: 'opening', exchanges: 0 })
    expect(frames[2].values).toMatchObject({ connected: 'open', exchanges: 0 })
    expect(frames.at(-1)!.values).toMatchObject({ connected: 'open', exchanges: 3 })
  })
})