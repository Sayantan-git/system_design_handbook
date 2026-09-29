import type { Topic } from './curriculum'

export type LabId = 'balancer' | 'cache' | 'queue' | 'replication' | 'limiter' | 'websocket'
export interface LabFrame {
  caption: string
  detail: string
  values: Record<string, string | number>
  metrics: [string, string][]
  path?: string
  phase?: 'request' | 'response' | 'background' | 'rejected'
}
export interface VisualLab {
  id: LabId
  title: string
  subtitle: string
  tone: 'cyan' | 'mint' | 'amber'
  topic: Topic
  frames: LabFrame[]
}

export function roundRobinFrame(delivered: number): LabFrame {
  if (!Number.isInteger(delivered) || delivered < 0 || delivered > 8) throw new RangeError('Choose a request count from zero to eight.')
  const counts = Array.from({ length: 4 }, (_, server) => Math.floor(delivered / 4) + (server < delivered % 4 ? 1 : 0))
  const server = (delivered + 3) % 4
  return {
    caption: delivered ? `Request ${delivered} routed to web-0${server + 1}` : 'Four servers. Next: web-01.',
    detail: delivered === 8 ? 'Eight requests are evenly split by count: two per server. Equal counts do not imply equal processing cost or latency.' : 'Each arriving request advances the pointer by one server. The client identity does not choose the backend, and health or capacity would need separate policies.',
    values: { server0: counts[0], server1: counts[1], server2: counts[2], server3: counts[3], next: delivered % 4, delivered },
    metrics: [['Requests', `${delivered} / 8`], ['Per server', counts.join(' · ')]],
    path: delivered ? `dispatch-${server}` : undefined, phase: 'request',
  }
}

const cacheFrame = (caption: string, cacheB: string, reads: number, hits: number, path?: string, phase: LabFrame['phase'] = 'request'): LabFrame => ({
  caption, values: { cacheA: 'A', cacheB, cacheC: '', reads, hits }, path, phase,
  detail: 'Cache-aside: the application checks the cache, loads the authoritative database on a miss, and stores an eligible result. A hit skips the database. Cached values still need an expiry and invalidation policy.',
  metrics: [['DB reads', String(reads)], ['Cache hits', String(hits)]],
})
const queueFrame = (caption: string, pending: string[], processing: string, completed: number, path?: string): LabFrame => ({
  caption, values: { slot0: pending[0] ?? '', slot1: pending[1] ?? '', slot2: pending[2] ?? '', slot3: pending[3] ?? '', consumer: processing, completed, depth: pending.length }, path, phase: 'background',
  detail: 'A work queue assigns one message to one consumer for an attempt. Waiting depth is separate from in-flight work. Acknowledgement follows processing; a crash before acknowledgement can cause redelivery and needs idempotency.',
  metrics: [['Waiting', String(pending.length)], ['Completed', String(completed)]],
})
const replicationFrame = (caption: string, primary: number, replicaA: number, replicaB: number, path?: string): LabFrame => ({
  caption, values: { primary, replicaA, replicaB }, path, phase: path === 'stale-read' ? 'response' : 'background',
  detail: 'This example uses asynchronous replication. The primary accepts version 2 before both replicas catch up. A read from a lagging replica can return version 1. Read-your-writes needs an explicit read or version policy.',
  metrics: [['Primary', `v${primary}`], ['Largest lag', `${primary - Math.min(replicaA, replicaB)} version${primary - Math.min(replicaA, replicaB) === 1 ? '' : 's'}`]],
})
const limiterFrame = (caption: string, tokens: number, accepted: number, rejected: number, path?: string): LabFrame => ({
  caption, values: { tokens, accepted, rejected }, path, phase: path === 'reject' ? 'rejected' : 'request',
  detail: 'A token bucket holds at most three tokens here. Each admitted request consumes one; an empty bucket rejects the next attempt. A later refill permits new work. Rate limits do not replace concurrency limits or a global quota policy.',
  metrics: [['Allowed', String(accepted)], ['Rejected', String(rejected)]],
})
const socketFrame = (caption: string, connected: boolean, exchanges: number, path?: string): LabFrame => ({
  caption, values: { connected: connected ? 'open' : 'opening', exchanges }, path, phase: path === 'upgrade' || path === 'client-message' ? 'request' : 'response',
  detail: 'The HTTP/1.1 example upgrades with a 101 response, then either participant can send frames over the same connection. A live connection does not provide durable message history; authentication, reconnects, and missed-message recovery remain necessary.',
  metrics: [['Connection', connected ? 'Open' : 'Opening'], ['Data frames', String(exchanges)]],
})

export const visualLabs: VisualLab[] = [
  {
    id: 'balancer', title: 'Load balancing', subtitle: 'Round robin', tone: 'cyan',
    topic: { title: 'Load Balancing Algorithms', chapter: 10, heading: 'How balancing algorithms choose', coverage: '' },
    frames: Array.from({ length: 9 }, (_, delivered) => roundRobinFrame(delivered)),
  },
  {
    id: 'cache', title: 'Cache', subtitle: 'Cache-aside', tone: 'mint',
    topic: { title: 'Cache-aside and read-through', chapter: 13, heading: 'Cache-aside and read-through', coverage: '' },
    frames: [
      cacheFrame('A is already cached', '', 0, 0),
      cacheFrame('get A: hit, database skipped', '', 0, 1, 'hit-a', 'response'),
      cacheFrame('get B: cache miss', '', 0, 1, 'lookup-b'),
      cacheFrame('Load B from the database', '', 1, 1, 'read-db'),
      cacheFrame('B saved in the cache', 'B', 1, 1, 'fill-b', 'response'),
      cacheFrame('get B: hit, database skipped', 'B', 1, 2, 'hit-b', 'response'),
    ],
  },
  {
    id: 'queue', title: 'Message queue', subtitle: 'Enqueue, process, acknowledge', tone: 'amber',
    topic: { title: 'Message Queues', chapter: 19, heading: 'A shared queue divides work', coverage: '' },
    frames: [
      queueFrame('Queue ready', [], '', 0),
      queueFrame('Producer adds job A', ['A'], '', 0, 'enqueue-a'),
      queueFrame('Producer adds job B', ['A', 'B'], '', 0, 'enqueue-b'),
      queueFrame('Consumer receives A; B is waiting', ['B'], 'A', 0, 'deliver-a'),
      queueFrame('A processed and acknowledged', ['B'], '', 1, 'ack-a'),
      queueFrame('Consumer receives B', [], 'B', 1, 'deliver-b'),
      queueFrame('B processed and acknowledged', [], '', 2, 'ack-b'),
    ],
  },
  {
    id: 'replication', title: 'Database replication', subtitle: 'Asynchronous replicas', tone: 'mint',
    topic: { title: 'Database Replication', chapter: 12, heading: 'Replication copies data', coverage: '' },
    frames: [
      replicationFrame('All copies hold version 1', 1, 1, 1),
      replicationFrame('Primary accepts version 2', 2, 1, 1, 'write'),
      replicationFrame('Replica A applies version 2', 2, 2, 1, 'replicate-a'),
      replicationFrame('A read from replica B still returns v1', 2, 2, 1, 'stale-read'),
      replicationFrame('Replica B applies version 2', 2, 2, 2, 'replicate-b'),
    ],
  },
  {
    id: 'limiter', title: 'Rate limiting', subtitle: 'Token bucket · capacity 3', tone: 'amber',
    topic: { title: 'Rate Limiting Algorithms', chapter: 25, heading: 'Token buckets and leaky buckets', coverage: '' },
    frames: [
      limiterFrame('Three tokens available', 3, 0, 0),
      limiterFrame('Request 1 allowed', 2, 1, 0, 'allow'),
      limiterFrame('Request 2 allowed', 1, 2, 0, 'allow'),
      limiterFrame('Request 3 allowed', 0, 3, 0, 'allow'),
      limiterFrame('Request 4 rejected: 429', 0, 3, 1, 'reject'),
      limiterFrame('Time passes: one token refills', 1, 3, 1, 'refill'),
      limiterFrame('Request 5 allowed after refill', 0, 4, 1, 'allow'),
    ],
  },
  {
    id: 'websocket', title: 'WebSockets', subtitle: 'One connection, both directions', tone: 'cyan',
    topic: { title: 'WebSockets', chapter: 8, heading: 'WebSockets', coverage: '' },
    frames: [
      socketFrame('Begin the connection', false, 0),
      socketFrame('Client sends HTTP Upgrade', false, 0, 'upgrade'),
      socketFrame('Server replies: 101 Switching Protocols', true, 0, 'switch'),
      socketFrame('Client sends a message', true, 1, 'client-message'),
      socketFrame('Server sends a reply', true, 2, 'server-message'),
      socketFrame('Server pushes another update', true, 3, 'server-push'),
    ],
  },
]