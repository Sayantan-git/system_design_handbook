import { describe, expect, it } from 'vitest'
import source from '../content/handbook.md?raw'
import { parseBook, renderEntry } from './book'

const book = parseBook(source)

const coverage: [number, string[]][] = [
  [2, ['p50', 'p95', 'p99', 'RPS', 'QPS', 'availability', 'reliability', 'durability']],
  [6, ['HTTP/1.1', 'HTTP/2', 'HTTP/3', 'QUIC', 'TCP', 'TLS']],
  [7, ['Anycast', 'GeoDNS', 'latency-based', 'ALIAS', 'CNAME', 'TTL', 'NGINX', 'Envoy', 'Kong']],
  [8, ['gRPC', 'Protocol Buffers', 'WebSockets', 'Server-Sent Events', 'GraphQL']],
  [10, ['vertical scaling', 'horizontal scaling', 'stateless', 'L4', 'L7', 'round robin', 'IP hash', 'virtual nodes', 'readiness', 'liveness']],
  [11, ['ACID', 'foreign key', 'normalization', 'denormalization', 'B-Tree', 'B+ Tree']],
  [12, ['DynamoDB', 'MongoDB', 'Couchbase', 'Cassandra', 'ScyllaDB', 'Neo4j', 'leaderless', 'multi-leader', 'range-based', 'hash-based', 'directory-based', 'R + W > N']],
  [13, ['Memcached', 'cache-aside', 'read-through', 'write-through', 'write-behind', 'LRU', 'LFU', 'FIFO', 'TTL', 'stampede', 'thundering herd', 'penetration', 'avalanche', 'breakdown', 'Bloom filter', 'XFetch', 'Debezium']],
  [14, ['Redis', 'dynamic', 'edge workers', 'pull CDN', 'push CDN']],
  [15, ['CAP', 'PACELC', 'causal', 'read-your-writes', 'Raft', 'Paxos', 'ZAB', 'Redlock', 'ephemeral sequential', 'Consul sessions', 'fencing', 'Snowflake', 'UUIDv4', 'UUIDv7', 'ticket service']],
  [16, ['fault', 'redundancy', 'graceful degradation', 'RTO', 'RPO']],
  [17, ['OLTP', 'OLAP', 'ClickHouse', 'Snowflake', 'BigQuery']],
  [19, ['command', 'event', 'publish-subscribe', 'queue', 'consumer']],
  [20, ['RabbitMQ', 'AWS SQS', 'Kafka', 'Pulsar', 'delay queues', 'redrive', 'visibility timeout', 'FIFO']],
  [21, ['at-most-once', 'at-least-once', 'exactly-once', 'idempotency', 'inbox']],
  [22, ['exponential backoff', 'jitter', 'retry budget', 'poison pills', 'dead-letter queue', 'replay']],
  [23, ['2PC', '3PC', 'pre-commit', 'saga', 'orchestration', 'choreography', 'outbox']],
  [25, ['circuit breaker', 'half-open', 'bulkhead', 'token bucket', 'leaky-bucket', 'fixed-window', 'sliding-window']],
  [26, ['counter', 'gauge', 'histogram', 'Prometheus', 'Grafana', 'OpenTelemetry', 'Jaeger', 'ELK', 'OpenSearch', 'Loki']],
  [27, ['OAuth 2.0', 'OpenID Connect', 'JWT', 'mTLS', 'zero trust', 'firewall', 'authorization']],
]

const expandedHeadings = [
  'Anycast, GeoDNS, latency routing, and ALIAS records',
  'A consistent-hashing ring with virtual nodes',
  'B-Trees and B+ Trees in a real query',
  'Database examples and the questions they answer',
  'Leaderless quorums with a worked example',
  'Where caches sit in the request path',
  'CDC and Debezium for cache invalidation',
  'Cache breakdown and probabilistic early refresh with XFetch',
  'Dynamic CDN content and edge workers',
  'Replicated state machines and Raft step by step',
  'Paxos and ZooKeeper Atomic Broadcast',
  'Redlock, ZooKeeper locks, and Consul sessions',
  'Snowflake IDs, UUIDv4, UUIDv7, and ticket services',
  'Amazon SQS, delay queues, and redrive policies',
  'Two-phase commit and a failed coordinator',
  'Three-phase commit and its timing assumptions',
  'Counters, gauges, histograms, and observability tools',
  'Zero trust and mutual TLS between services',
]

describe('requested system-design coverage', () => {
  it('teaches storage internals with worked examples and practice checks', () => {
    const lessons = [
      'Write-ahead logs and crash recovery',
      'LSM trees, SSTables, and compaction',
      'MVCC and optimistic concurrency',
    ]
    for (const title of lessons) {
      const section = book.search.find(entry => entry.title === title && entry.entryId === book.chapters[10].id)
      expect(section, title).toBeDefined()
      expect(section!.text.split(/\s+/).length, title).toBeGreaterThan(250)
      expect(section!.text, title).toContain('Worked example:')
      expect(section!.text, title).toContain('Practice check:')
      expect(section!.text, title).toContain('Answer:')
    }
  })
  it('explains the requested concepts in their owning chapters, not only in the topic index', () => {
    for (const [number, terms] of coverage) {
      const chapter = book.chapters.find(entry => entry.number === number)!
      const text = chapter.text.toLowerCase().replaceAll('-', ' ')
      for (const term of terms) expect(text.includes(term.toLowerCase().replaceAll('-', ' ')), `${chapter.title}: missing ${term}`).toBe(true)
    }
  })
  it('develops distributed coordination and tenant isolation beyond definitions', () => {
    const lessons: [number, string][] = [
      [9, 'Multi-tenant architecture and isolation'],
      [15, 'Lamport clocks and vector clocks'],
      [15, 'Replica repair and conflict resolution'],
      [15, 'Gossip, heartbeats, and failure detection'],
      [17, 'Windows, watermarks, and stream recovery'],
      [28, 'Schema evolution and replay compatibility'],
      [31, 'Design H: a news feed'],
    ]
    for (const [chapter, title] of lessons) {
      const section = book.search.find(entry => entry.title === title && entry.entryId === book.chapters[chapter - 1].id)
      expect(section, title).toBeDefined()
      expect(section!.text.split(/\s+/).length, title).toBeGreaterThan(250)
      for (const label of ['Worked example:', 'Practice check:', 'Answer:']) expect(section!.text, title).toContain(label)
    }
  })
  it('gives new subjects substantial prose, a real-life scenario, and an explain-aloud answer', () => {
    for (const title of expandedHeadings) {
      const section = book.search.find(entry => entry.title === title)
      expect(section, title).toBeDefined()
      expect(section!.text.split(/\s+/).length, title).toBeGreaterThan(250)
      expect(section!.text, title).toContain('Real-life scenario')
      expect(section!.text, title).toContain('Explain it aloud:')
    }
  })
  it('includes both section maps in the downloadable source and renders new formulas', () => {
    const orientation = book.search.find(entry => entry.title === 'Course orientation and prerequisites')
    expect(orientation?.text).toContain('Production readiness')
    expect(orientation?.text).toContain('synthetic records')
    expect(book.entries.some(entry => entry.title === 'System Design: The Complete Topic Map')).toBe(true)
    expect(book.entries.some(entry => entry.title === 'Other Topics: Supporting Computing and Engineering')).toBe(true)
    for (const number of [12, 13, 22]) expect(renderEntry(book.chapters[number - 1])).toContain('katex')
    expect(book.chapters[31].headings.some(heading => heading.title === 'An explain-it-to-anyone walkthrough')).toBe(true)
  })
})