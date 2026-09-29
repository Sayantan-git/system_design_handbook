import { plainText, type Book, type Entry } from './book'

export type StudySection = 'system-design' | 'other-topics'
export interface Topic { title: string; chapter: number; heading?: string; coverage: string; core?: boolean }
export interface TopicGroup { id: string; title: string; description: string; topics: Topic[] }
export interface CourseStage { id: string; title: string; groups: string[]; prerequisite: string; outcome: string }

export const courseStages: CourseStage[] = [
  { id: 'foundations', title: 'Foundations', groups: ['core-fundamentals', 'traffic-networking', 'api-communication'], prerequisite: 'Basic programming and an understanding of records and requests.', outcome: 'Trace a request, state its contract, and distinguish transport success from business completion.' },
  { id: 'build-scale', title: 'Build and scale', groups: ['scalability', 'data-storage', 'caching', 'architecture'], prerequisite: 'Request paths, API contracts, and measurable requirements.', outcome: 'Choose storage, protect concurrent updates, and explain the limits of caches and extra instances.' },
  { id: 'distributed', title: 'Distributed systems', groups: ['messaging', 'distributed-primitives', 'data-pipelines'], prerequisite: 'Data ownership, local transactions, and failure boundaries.', outcome: 'Recover duplicates, delayed events, and partitions using explicit ordering and ownership rules.' },
  { id: 'production', title: 'Production readiness', groups: ['resilience', 'observability-security', 'deployment', 'testing-delivery'], prerequisite: 'A complete read/write path and its recovery behavior.', outcome: 'Bound overload, protect tenant data, measure outcomes, and deploy a compatible change.' },
  { id: 'applied', title: 'Apply the concepts', groups: ['worked-designs'], prerequisite: 'Foundational concepts plus the guarantees required by the selected scenario.', outcome: 'Present a complete design, estimate its bottleneck, and defend the tradeoffs under failure.' },
]

export const supportingChapters = [3, 4, 5, 9, 18, 28, 29]
export const sectionForChapter = (number: number | null): StudySection => number !== null && supportingChapters.includes(number) ? 'other-topics' : 'system-design'
export const sectionLabels: Record<StudySection, string> = { 'system-design': 'System Design', 'other-topics': 'Other Topics' }

export function displayChapterNumber(book: Book, entry: Entry): number | null {
  if (entry.number === null) return null
  const section = sectionForChapter(entry.number)
  const chapters = book.chapters.filter(chapter => sectionForChapter(chapter.number) === section)
  const index = chapters.findIndex(chapter => chapter.id === entry.id)
  return index < 0 ? null : index + 1
}

export function formatChapterReferences(book: Book, text: string): string {
  return text.replace(/\bchapters?\s+(\d+(?:\s*-\s*\d+)?(?:\s*(?:,|and|&)\s*\d+(?:\s*-\s*\d+)?)*)/gi, (match, references: string) => {
    const grouped = new Map<StudySection, number[]>()
    for (const range of references.split(/\s*(?:,|and|&)\s*/i)) {
      const [start, last] = range.split(/\s*-\s*/).map(Number)
      const end = last ?? start
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > book.chapters.length) return match
      for (let number = start; number <= end; number += 1) {
        const entry = book.chapters.find(chapter => chapter.number === number)
        if (!entry) return match
        const section = sectionForChapter(number)
        grouped.set(section, [...(grouped.get(section) ?? []), displayChapterNumber(book, entry)!])
      }
    }
    return [...grouped].map(([section, values]) => {
      const numbers = [...new Set(values)].sort((left, right) => left - right)
      const ranges: string[] = []
      for (let index = 0; index < numbers.length; index += 1) {
        const start = numbers[index]
        let end = start
        while (numbers[index + 1] === end + 1) end = numbers[++index]
        const first = String(start).padStart(2, '0')
        ranges.push(start === end ? first : `${first}-${String(end).padStart(2, '0')}`)
      }
      return `${sectionLabels[section]} ${numbers.length === 1 ? 'chapter' : 'chapters'} ${ranges.join(', ')}`
    }).join(' and ')
  })
}

export const systemDesignGroups: TopicGroup[] = [
  {
    id: 'core-fundamentals', title: 'System Design Fundamentals',
    description: 'Requirements, design levels, capacity, and the promises a system makes to its users.',
    topics: [
      { title: 'What Is System Design?', chapter: 1, heading: 'What system design actually means', coverage: 'Components, interfaces, ownership, constraints, and design tradeoffs.' },
      { title: 'Functional Requirements', chapter: 1, heading: 'Functional requirements and quality requirements', coverage: 'User actions, business rules, scope, and accepted outcomes.' },
      { title: 'Non-Functional Requirements', chapter: 1, heading: 'Functional requirements and quality requirements', coverage: 'Performance, availability, security, recovery, and measurable targets.' },
      { title: 'High-Level Design (HLD)', chapter: 1, heading: 'High-level design and low-level design', coverage: 'Major components, data flows, trust boundaries, and deployment choices.' },
      { title: 'Low-Level Design (LLD)', chapter: 9, heading: 'Object-oriented programming and interfaces', coverage: 'Classes, interfaces, invariants, dependencies, and implementation contracts.' },
      { title: 'Latency', chapter: 2, heading: 'Latency, throughput, and the slow tail', coverage: 'Response time, network delay, queueing, and p50/p95/p99 percentiles.', core: true },
      { title: 'Throughput', chapter: 2, heading: 'Saturation and queueing', coverage: 'RPS, QPS, concurrency, saturation, and Little\'s Law.' },
      { title: 'Capacity Estimation', chapter: 2, heading: 'Estimate from a workload, not a population count alone', coverage: 'Peak traffic, storage growth, bandwidth, headroom, and workload assumptions.' },
      { title: 'Availability', chapter: 2, heading: 'Availability, reliability, and durability are different promises', coverage: 'Uptime, successful operations, the nines, and service boundaries.' },
      { title: 'Reliability and Durability', chapter: 2, heading: 'Availability, reliability, and durability are different promises', coverage: 'Correct service over time and survival of committed data.' },
      { title: 'Maintainability', chapter: 9, heading: 'Maintainability', coverage: 'Clear ownership, change costs, modularity, tests, and operating a system.' },
      { title: 'Cost and Performance Optimization', chapter: 2, heading: 'Costs and failure budgets', coverage: 'Compute, storage, egress, operations, and the cost of meeting a target.' },
    ],
  },
  {
    id: 'traffic-networking', title: 'Networking & Web Protocols',
    description: 'How a client finds a server, establishes a connection, and sends a protected request.',
    topics: [
      { title: 'Client-Server Model', chapter: 6, heading: 'Client-server model', coverage: 'Request and response, client responsibilities, servers, and independent scaling.', core: true },
      { title: 'IP Addresses', chapter: 6, heading: 'IP addresses, ports, and NAT', coverage: 'IPv4, IPv6, public and private addresses, ports, routing, and NAT.', core: true },
      { title: 'DNS (Domain Name System)', chapter: 7, heading: 'DNS is a distributed naming system', coverage: 'Recursive resolution, authoritative servers, A, AAAA, and CNAME records.', core: true },
      { title: 'DNS Caching and TTL', chapter: 7, heading: 'DNS caching and TTL', coverage: 'Resolver caches, time to live, negative caching, flushing, and failover delays.' },
      { title: 'Anycast, GeoDNS, and Global Routing', chapter: 7, heading: 'Anycast, GeoDNS, latency routing, and ALIAS records', coverage: 'Routing policies, regional endpoints, ALIAS records, and data ownership.' },
      { title: 'Forward Proxy vs Reverse Proxy', chapter: 7, heading: 'Forward proxy versus reverse proxy', coverage: 'Client-side and server-side intermediaries, NGINX, Envoy, and trust boundaries.', core: true },
      { title: 'TCP vs UDP', chapter: 6, heading: 'TCP, UDP, flow control, and congestion', coverage: 'Byte streams, datagrams, ordering, retransmission, flow control, and congestion.' },
      { title: 'HTTP and HTTPS', chapter: 6, heading: 'HTTP and HTTPS', coverage: 'Methods, headers, response semantics, TLS, and certificate verification.', core: true },
      { title: 'HTTP/1.1, HTTP/2, and HTTP/3', chapter: 6, heading: 'HTTP/1.1, HTTP/2, and HTTP/3', coverage: 'Persistent connections, multiplexing, QUIC, and transport tradeoffs.' },
      { title: 'Web Servers and Application Servers', chapter: 6, heading: 'Web servers and application servers', coverage: 'Static responses, reverse proxying, business logic, and overlapping roles.' },
      { title: 'Service Discovery', chapter: 7, heading: 'Service discovery in practice', coverage: 'DNS, registries, changing endpoints, health information, and stale observations.' },
    ],
  },
  {
    id: 'api-communication', title: 'APIs & Real-Time Communication',
    description: 'Contracts for retrieving data, changing state, and delivering live updates.',
    topics: [
      { title: 'APIs', chapter: 8, heading: 'An API is a promise between components', coverage: 'Application programming interfaces, endpoints, contracts, SDKs, and compatibility.', core: true },
      { title: 'REST API', chapter: 8, heading: 'REST-style HTTP APIs', coverage: 'Resources, HTTP methods, stateless requests, caching, and safe retries.', core: true },
      { title: 'GraphQL', chapter: 8, heading: 'GraphQL', coverage: 'Schemas, field selection, resolvers, N+1 queries, and query-cost limits.', core: true },
      { title: 'RPC and gRPC', chapter: 8, heading: 'RPC and gRPC', coverage: 'Remote calls, Protocol Buffers, unary and streaming methods, and deadlines.' },
      { title: 'SOAP', chapter: 8, heading: 'SOAP, webhooks, and asynchronous interfaces', coverage: 'XML messages, explicit service contracts, and enterprise integrations.' },
      { title: 'WebSockets', chapter: 8, heading: 'WebSockets', coverage: 'Bidirectional connections, chat, connection limits, reconnects, and missed messages.', core: true },
      { title: 'Webhooks', chapter: 8, heading: 'Webhooks', coverage: 'Event-triggered callbacks, signatures, durable acceptance, retries, and duplicates.', core: true },
      { title: 'Server-Sent Events (SSE)', chapter: 8, heading: 'Server-Sent Events (SSE)', coverage: 'One-way server updates over HTTP, event IDs, buffering, and recovery.' },
      { title: 'Short Polling and Long Polling', chapter: 8, heading: 'Polling, SSE, and WebSockets', coverage: 'Repeated requests, held responses, request volume, timeouts, and freshness.' },
      { title: 'API Gateway', chapter: 7, heading: 'What an API gateway adds', coverage: 'Routing, authentication policies, quotas, aggregation, Kong, NGINX, and Envoy.', core: true },
      { title: 'Asynchronous Request-Reply', chapter: 8, heading: 'Asynchronous request-reply', coverage: '202 Accepted, durable jobs, status endpoints, result retention, and cancellation.' },
      { title: 'Pagination', chapter: 8, heading: 'Pagination and stable results', coverage: 'Offset versus cursor pagination, stable ordering, snapshots, and tie-breakers.' },
      { title: 'API Versioning and Compatibility', chapter: 8, heading: 'Performance and evolution', coverage: 'Additive changes, old clients, schema meaning, batching, and bounded responses.' },
    ],
  },
  {
    id: 'scalability', title: 'Scalability & Load Balancing',
    description: 'Increasing capacity, distributing traffic, and finding the resource that limits growth.',
    topics: [
      { title: 'Vertical Scaling', chapter: 10, heading: 'Vertical scaling', coverage: 'Larger machines, CPU and RAM, resource ceilings, costs, and failure domains.', core: true },
      { title: 'Horizontal Scaling', chapter: 10, heading: 'Horizontal scaling', coverage: 'Additional instances, shared state, coordination, and downstream capacity.', core: true },
      { title: 'Load Balancing', chapter: 10, heading: 'Distributing work is different from creating capacity', coverage: 'Healthy backend selection, existing capacity, and routing responsibilities.', core: true },
      { title: 'L4 and L7 Load Balancers', chapter: 10, heading: 'L4 and L7 balancing', coverage: 'Transport connections versus HTTP-aware routing, TLS, and regional balancing.' },
      { title: 'Load Balancing Algorithms', chapter: 10, heading: 'How balancing algorithms choose', coverage: 'Round robin, weights, least connections, IP hash, and power of two choices.' },
      { title: 'Stateful vs Stateless Systems', chapter: 10, heading: 'Statelessness and session affinity', coverage: 'Replaceable instances, shared sessions, sticky routing, and state recovery.' },
      { title: 'Liveness and readiness probes', chapter: 10, heading: 'Health checks and graceful removal', coverage: 'Startup checks, readiness, draining, shutdown, and bounded interrupted work.' },
      { title: 'Autoscaling and Bottlenecks', chapter: 10, heading: 'Find the bottleneck before scaling', coverage: 'CPU, queues, connection pools, startup delay, and downstream limits.' },
      { title: 'Load Balancing vs Failover', chapter: 16, heading: 'Active-passive and active-active', coverage: 'Traffic distribution versus recovery, spare capacity, and valid write ownership.' },
      { title: 'Concurrency and Parallelism', chapter: 5, heading: 'Working on several things versus executing simultaneously', coverage: 'Concurrent work, simultaneous execution, async I/O, and bounded resources.' },
    ],
  },
  {
    id: 'data-storage', title: 'Databases & Storage',
    description: 'Data models, query performance, transactions, and splitting or copying stored data.',
    topics: [
      { title: 'Databases', chapter: 12, heading: 'Databases', coverage: 'Durable records, access patterns, constraints, indexes, and recovery.', core: true },
      { title: 'SQL vs NoSQL', chapter: 12, heading: 'SQL vs NoSQL', coverage: 'Relational, key-value, document, wide-column, and graph models with real tradeoffs.', core: true },
      { title: 'Database Types and Product Choices', chapter: 12, heading: 'Database examples and the questions they answer', coverage: 'Redis, DynamoDB, MongoDB, Couchbase, Cassandra, ScyllaDB, and Neo4j.' },
      { title: 'Database Indexing', chapter: 11, heading: 'Indexes are extra data structures', coverage: 'Lookup indexes, composite keys, covering indexes, query plans, and write costs.', core: true },
      { title: 'Write-Ahead Logs (WAL)', chapter: 11, heading: 'Write-ahead logs and crash recovery', coverage: 'Commit acknowledgement, durable recovery records, checkpoints, and group commit.' },
      { title: 'LSM Trees and SSTables', chapter: 11, heading: 'LSM trees, SSTables, and compaction', coverage: 'Memtables, immutable files, compaction, tombstones, and read/write amplification.' },
      { title: 'MVCC and Optimistic Concurrency', chapter: 11, heading: 'MVCC and optimistic concurrency', coverage: 'Snapshots, row versions, conditional updates, locks, and stale editing intent.' },
      { title: 'B-Trees and B+ Trees', chapter: 11, heading: 'B-Trees and B+ Trees in a real query', coverage: 'Storage pages, ordered keys, range scans, composite indexes, and write costs.' },
      { title: 'Normalization', chapter: 11, heading: 'Normalization and denormalization', coverage: 'Separate facts, relationships, update anomalies, and constraints.' },
      { title: 'Denormalization', chapter: 11, heading: 'Denormalization', coverage: 'Duplicated read models, historical snapshots, update rules, and repair.', core: true },
      { title: 'Vertical Partitioning', chapter: 12, heading: 'Vertical partitioning', coverage: 'Splitting columns by access pattern, shared keys, joins, and ownership.', core: true },
      { title: 'Database Sharding', chapter: 12, heading: 'Partitioning and sharding split data', coverage: 'Horizontal partitioning, range/hash/directory routing, hot shards, and cross-shard work.', core: true },
      { title: 'Database Replication', chapter: 12, heading: 'Replication copies data', coverage: 'Single-leader, multi-leader, leaderless, synchronous, and asynchronous copies.', core: true },
      { title: 'Replica Lag and Read-Your-Writes', chapter: 12, heading: 'Read-your-writes and replica lag', coverage: 'Stale reads, session guarantees, cache refills, and version tracking.' },
      { title: 'Leaderless quorums: R + W > N', chapter: 12, heading: 'Leaderless quorums with a worked example', coverage: 'Three replicas, overlapping read/write sets, conflicts, repair, and why counts are not a proof.' },
      { title: 'Resharding and Data Migration', chapter: 12, heading: 'Rebalancing and migration', coverage: 'Copying data, following writes, cutover, routing, and preventing stale owners.' },
      { title: 'ACID Transactions', chapter: 11, heading: 'ACID in ordinary language', coverage: 'Atomicity, consistency, isolation, durability, constraints, and commit boundaries.' },
      { title: 'Transaction Isolation', chapter: 11, heading: 'Isolation, anomalies, and write skew', coverage: 'Dirty reads, phantoms, snapshots, write skew, and serializability.' },
      { title: 'SQL Query Optimization', chapter: 11, heading: 'Tuning a slow database-backed API', coverage: 'Execution plans, N+1 queries, locks, I/O, indexes, and connection waiting.' },
      { title: 'Blob and Object Storage', chapter: 3, heading: 'Blob and object storage', coverage: 'Images, videos, object keys, metadata, signed access, uploads, and lifecycle rules.', core: true },
      { title: 'Block, File, and Object Storage', chapter: 3, heading: 'Block, file, and object storage', coverage: 'Volumes, shared file paths, object APIs, and storage access contracts.' },
      { title: 'Bloom Filters', chapter: 4, heading: 'Bloom filters and approximate answers', coverage: 'Probabilistic membership, false positives, update lag, and exact verification.' },
      { title: 'HyperLogLog', chapter: 4, heading: 'Bloom filters and approximate answers', coverage: 'Approximate distinct counts, bounded error, and memory tradeoffs.' },
    ],
  },
  {
    id: 'caching', title: 'Caching & Content Delivery',
    description: 'Reusing data close to readers without losing control of freshness, privacy, and recovery.',
    topics: [
      { title: 'Caching', chapter: 13, heading: 'A cache is a reusable answer, not automatically the truth', coverage: 'Hits, misses, reusable answers, speed, freshness, and the source of truth.', core: true },
      { title: 'Cache placement and ownership', chapter: 13, heading: 'Where caches sit in the request path', coverage: 'Browser, CDN, proxy, local application memory, Redis, and Memcached.' },
      { title: 'Cache-aside and read-through', chapter: 13, heading: 'Cache-aside and read-through', coverage: 'Cache hits, misses, source loading, and simultaneous readers.' },
      { title: 'Write-through and write-behind', chapter: 13, heading: 'Write-through and write-behind', coverage: 'Synchronous and delayed writes, partial failure, and durable acceptance.' },
      { title: 'Cache Eviction Policies', chapter: 13, heading: 'Keys, expiration, and eviction', coverage: 'LRU, LFU, FIFO, TTL, sliding expiry, memory limits, and negative caching.' },
      { title: 'Cold Cache and Warm Cache', chapter: 13, heading: 'Cold cache and warm cache', coverage: 'Startup misses, controlled prewarming, deploys, and realistic performance tests.' },
      { title: 'Distributed Cache', chapter: 13, heading: 'Hot keys and distributed caches', coverage: 'Shared cache clusters, key placement, local copies, and hot-key pressure.' },
      { title: 'Stampedes, breakdown, and avalanches', chapter: 13, heading: 'Stampedes, avalanches, and penetration', coverage: 'Single-flight, locks, XFetch, early refresh, randomized TTLs, and bounded fallback.' },
      { title: 'Cache breakdown and XFetch', chapter: 13, heading: 'Cache breakdown and probabilistic early refresh with XFetch', coverage: 'Probabilistic early expiration, rebuild cost, refresh-ahead, and a live-standings scenario.' },
      { title: 'Cache Invalidation', chapter: 13, heading: 'The stale-fill race', coverage: 'Stale data, dual-write races, CDC with Debezium, version checks, lagging replicas, and repair.' },
      { title: 'CDC and Debezium cache updates', chapter: 13, heading: 'CDC and Debezium for cache invalidation', coverage: 'Committed changes, checkpoints, deletion, version-aware updates, and propagation delay.' },
      { title: 'Redis', chapter: 14, heading: 'What Redis contributes', coverage: 'Data structures, atomic operations, persistence, eviction, Pub/Sub, and Streams.' },
      { title: 'CDN (Content Delivery Network)', chapter: 14, heading: 'What a CDN does', coverage: 'Edge caches, origin fetches, push/pull delivery, and global content distribution.', core: true },
      { title: 'Edge Caching and Edge Computing', chapter: 14, heading: 'Dynamic CDN content and edge workers', coverage: 'Eligible dynamic content, edge functions, cache keys, origin protection, and privacy.' },
    ],
  },
  {
    id: 'architecture', title: 'Architecture & Design Patterns',
    description: 'Deployment boundaries, business responsibilities, and the structure inside each service.',
    topics: [
      { title: 'Monolithic Architecture', chapter: 9, heading: 'Modular monoliths and microservices', coverage: 'One deployment, modular boundaries, local transactions, and simpler operations.' },
      { title: 'Microservices', chapter: 9, heading: 'Microservices', coverage: 'Independent services, business capabilities, ownership, partial failure, and recovery.', core: true },
      { title: 'Multi-Tenancy and Isolation', chapter: 9, heading: 'Multi-tenant architecture and isolation', coverage: 'Shared tables, separate databases, tenant-scoped caches, noisy neighbors, and migration.' },
      { title: 'Monolith vs Microservices', chapter: 9, heading: 'Modular monoliths and microservices', coverage: 'Release independence, scaling needs, complexity, and the distributed monolith trap.' },
      { title: 'Serverless Architecture', chapter: 18, heading: 'Cloud service models', coverage: 'Managed execution, functions, cold starts, concurrency limits, and durable state.' },
      { title: 'Event-Driven Architecture', chapter: 19, heading: 'Why services communicate through messaging', coverage: 'Events, decoupling, independent consumers, consistency, and failed handlers.' },
      { title: 'OOP and Interfaces', chapter: 9, heading: 'Object-oriented programming and interfaces', coverage: 'Encapsulation, composition, polymorphism, invariants, and explicit contracts.' },
      { title: 'SOLID Principles', chapter: 9, heading: 'KISS, SOLID, and decisions that can evolve', coverage: 'Responsibilities, substitution, focused interfaces, and dependency direction.' },
      { title: 'DRY, KISS, and YAGNI', chapter: 9, heading: 'DRY, KISS, and YAGNI', coverage: 'One owner per rule, understandable solutions, and avoiding speculative features.' },
      { title: 'UML Diagrams', chapter: 9, heading: 'UML diagrams', coverage: 'Class, sequence, component, and state diagrams with meaningful relationships.' },
      { title: 'Design Patterns', chapter: 9, heading: 'Design patterns', coverage: 'Strategy, factory, adapter, observer, and choosing patterns for actual variation.' },
      { title: 'Backend for Frontend (BFF)', chapter: 9, heading: 'Backend for Frontend', coverage: 'Client-specific APIs, bounded aggregation, deadlines, and domain ownership.' },
    ],
  },
  {
    id: 'messaging', title: 'Message Queues & Event Streaming',
    description: 'Accepting work durably, processing it asynchronously, and recovering from duplicates or gaps.',
    topics: [
      { title: 'Message Queues', chapter: 19, heading: 'A shared queue divides work', coverage: 'Producers, consumers, competing workers, acknowledgements, buffering, and backlogs.', core: true },
      { title: 'Publish-Subscribe (Pub/Sub)', chapter: 19, heading: 'Topics and subscriptions distribute independent copies', coverage: 'Independent subscribers, fan-out, per-subscriber progress, and durability.' },
      { title: 'Commands vs Events', chapter: 19, heading: 'Commands and events express different meanings', coverage: 'Requests to perform work versus facts about accepted changes.' },
      { title: 'Kafka and Event Streaming', chapter: 20, heading: 'Kafka\'s retained partitioned log', coverage: 'Partitions, offsets, retained records, replay, ordering, and consumer groups.' },
      { title: 'RabbitMQ', chapter: 20, heading: 'RabbitMQ and routed work', coverage: 'Exchanges, routing keys, queues, acknowledgements, and failure handling.' },
      { title: 'Amazon SQS and redrive', chapter: 20, heading: 'Amazon SQS, delay queues, and redrive policies', coverage: 'Standard and FIFO queues, deduplication, visibility timeout, delay, DLQs, and recovery.' },
      { title: 'Apache Pulsar', chapter: 20, heading: 'Pulsar\'s separation of serving and storage', coverage: 'Brokers, durable storage, subscriptions, partitioning, and operating costs.' },
      { title: 'Azure Service Bus', chapter: 20, heading: 'Azure messaging services', coverage: 'Queues, topics, subscriptions, locks, settlement, sessions, and dead lettering.' },
      { title: 'Azure Event Hubs', chapter: 20, heading: 'Azure messaging services', coverage: 'Partitioned ingestion streams, consumer progress, checkpoints, and replay.' },
      { title: 'Azure Event Grid', chapter: 20, heading: 'Azure messaging services', coverage: 'Event routing, subscriptions, endpoint delivery, retries, and product-specific retention.' },
      { title: 'Delivery Guarantees', chapter: 21, heading: 'At-most-once and at-least-once', coverage: 'At-most-once, at-least-once, and the scope of exactly-once claims.' },
      { title: 'Idempotency', chapter: 21, heading: 'Idempotency in plain English', coverage: 'Stable operation IDs, deduplication, saved outcomes, and safe retries.', core: true },
      { title: 'Transactional Outbox', chapter: 23, heading: 'Transactional outbox', coverage: 'Atomic local state and event records, publishing relays, and duplicate delivery.' },
      { title: 'Event Sourcing', chapter: 23, heading: 'Event sourcing', coverage: 'Authoritative event history, rebuilding state, schema evolution, and snapshots.' },
      { title: 'CQRS', chapter: 23, heading: 'CQRS and materialized views', coverage: 'Separate command and query models, derived views, lag, and rebuilding.' },
      { title: 'Background jobs and catch-up', chapter: 24, heading: 'Event-driven and schedule-driven jobs', coverage: 'Scheduling, leases, snapshots, deltas, cancellation, and reconciliation.' },
    ],
  },
  {
    id: 'distributed-primitives', title: 'Distributed Systems & Coordination',
    description: 'Consistency, partition tradeoffs, agreement, placement, and ownership across machines.',
    topics: [
      { title: 'Consistency models', chapter: 15, heading: 'Consistency describes what readers may observe', coverage: 'Strong, eventual, causal, read-your-writes, monotonic reads, and serializability.' },
      { title: 'CAP Theorem', chapter: 15, heading: 'CAP during a network partition', coverage: 'Consistency versus availability during a network partition, with precise assumptions.', core: true },
      { title: 'BASE and PACELC', chapter: 15, heading: 'BASE and PACELC', coverage: 'Eventual consistency and latency/consistency tradeoffs during normal operation.' },
      { title: 'Consistent hashing and virtual nodes', chapter: 10, heading: 'A consistent-hashing ring with virtual nodes', coverage: 'Hash rings, key placement, virtual nodes, membership changes, and hot keys.' },
      { title: 'Consensus Algorithms', chapter: 15, heading: 'Quorums and consensus', coverage: 'Agreement, intersecting majorities, replicated state, and assumptions behind Raft and Paxos.' },
      { title: 'Lamport Clocks and Vector Clocks', chapter: 15, heading: 'Lamport clocks and vector clocks', coverage: 'Causality, concurrent versions, clock skew, logical time, and metadata costs.' },
      { title: 'Replica Repair and CRDTs', chapter: 15, heading: 'Replica repair and conflict resolution', coverage: 'Read repair, anti-entropy, Merkle trees, merge rules, and deletion safety.' },
      { title: 'Gossip and Failure Detection', chapter: 15, heading: 'Gossip, heartbeats, and failure detection', coverage: 'Heartbeats, indirect probes, suspicion, membership, and safe ownership changes.' },
      { title: 'Raft and replicated state machines', chapter: 15, heading: 'Replicated state machines and Raft step by step', coverage: 'Leaders, followers, elections, terms, commit rules, and quorum loss.' },
      { title: 'Paxos and ZooKeeper Atomic Broadcast', chapter: 15, heading: 'Paxos and ZooKeeper Atomic Broadcast', coverage: 'Prepare/accept, chosen values, Multi-Paxos, ZAB epochs, and ordered state changes.' },
      { title: 'Distributed locks, leases, and fencing', chapter: 15, heading: 'Redlock, ZooKeeper locks, and Consul sessions', coverage: 'Redlock, ZooKeeper ephemeral nodes, Consul sessions, paused owners, and stale writes.' },
      { title: 'Unique IDs across machines', chapter: 15, heading: 'Snowflake IDs, UUIDv4, UUIDv7, and ticket services', coverage: 'Snowflake IDs, UUIDv4/v7, ticket services, auto-increment ranges, clocks, and ordering.' },
      { title: '2PC and a coordinator failure', chapter: 23, heading: 'Two-phase commit and a failed coordinator', coverage: 'Prepare, durable decisions, blocked participants, and recovery.' },
      { title: '3PC and its assumptions', chapter: 23, heading: 'Three-phase commit and its timing assumptions', coverage: 'Can-commit, pre-commit, do-commit, timing bounds, and network partitions.' },
      { title: 'Distributed transactions and sagas', chapter: 23, heading: 'Sagas coordinate business steps', coverage: 'Orchestration, choreography, compensation, transaction boundaries, and recovery.' },
    ],
  },
  {
    id: 'resilience', title: 'Reliability & Traffic Protection',
    description: 'Containing failures, controlling demand, and recovering accepted work without causing new damage.',
    topics: [
      { title: 'Fault tolerance and recovery', chapter: 16, heading: 'Design for specified failures', coverage: 'Redundancy, failure domains, graceful degradation, and specified failure guarantees.' },
      { title: 'High Availability and Failover', chapter: 16, heading: 'Active-passive and active-active', coverage: 'Redundant instances, active/passive regions, data ownership, and spare capacity.' },
      { title: 'Backups and Disaster Recovery', chapter: 16, heading: 'Backups, snapshots, and point-in-time recovery', coverage: 'Restore testing, independent copies, corruption, snapshots, and recovery procedures.' },
      { title: 'RTO and RPO', chapter: 16, heading: 'Recovery objectives', coverage: 'Acceptable recovery time and data loss, verified through actual restore exercises.' },
      { title: 'Rate Limiting', chapter: 25, heading: 'Rate limiting', coverage: 'User and tenant quotas, overload protection, throttling, and honest rejection.', core: true },
      { title: 'Backpressure and Load Shedding', chapter: 25, heading: 'Control demand before resources collapse', coverage: 'Admission control, bounded work, concurrency, overload signals, and protecting essential operations.' },
      { title: 'Rate Limiting Algorithms', chapter: 25, heading: 'Fixed and sliding windows', coverage: 'Token bucket, leaky bucket, fixed windows, sliding windows, and distributed counters.' },
      { title: 'Backoff, jitter, and retry budgets', chapter: 22, heading: 'Backoff and jitter', coverage: 'Exponential delays, randomization, strict traffic budgets, deadlines, and retry amplification.' },
      { title: 'Calculate a strict retry traffic budget', chapter: 22, heading: 'A strict retry budget as a share of outgoing traffic', coverage: 'A percentage of total attempts, coordinated accounting, and a worked 10% example.' },
      { title: 'DLQs and poison messages', chapter: 22, heading: 'What a DLQ is for', coverage: 'Malformed input, repeated consumer crashes, failure isolation, ordering, and inspection.' },
      { title: 'Delay queues and safe redrive', chapter: 22, heading: 'Durable delayed retry', coverage: 'Saved retry schedules, redrive policy, attempt limits, and controlled manual replay.' },
      { title: 'Circuit breakers and bulkheads', chapter: 25, heading: 'Circuit breakers', coverage: 'Closed/open/half-open, trial calls, separate resource pools, timeouts, and fallbacks.' },
    ],
  },
  {
    id: 'observability-security', title: 'Observability & Security',
    description: 'Measuring real outcomes, finding failures, and protecting every data boundary.',
    topics: [
      { title: 'Metrics and useful measurements', chapter: 26, heading: 'Counters, gauges, histograms, and observability tools', coverage: 'Counters, gauges, histograms, Prometheus, Grafana, percentiles, and label cardinality.' },
      { title: 'Distributed Tracing and Structured Logs', chapter: 26, heading: 'Logs, metrics, and traces in practice', coverage: 'OpenTelemetry, Jaeger, ELK, OpenSearch, Loki, trace context, correlation, and protected logs.' },
      { title: 'Authentication and authorization', chapter: 27, heading: 'Authentication and authorization', coverage: 'Verified identity, tenant and object permissions, least privilege, and trust boundaries.' },
      { title: 'OAuth 2.0, OIDC, and JWT', chapter: 27, heading: 'OAuth 2.0 and OpenID Connect', coverage: 'Delegated access, login, tokens, signature validation, audiences, and expiry.' },
      { title: 'TLS and Secure Communication', chapter: 6, heading: 'HTTP and HTTPS', coverage: 'Encryption in transit, server certificates, modern TLS rather than obsolete SSL.' },
      { title: 'Zero trust and service-to-service security', chapter: 27, heading: 'Zero trust and mutual TLS between services', coverage: 'mTLS, workload identity, certificate rotation, firewalls, WAFs, and explicit authorization.' },
      { title: 'SLOs, alerts, and recovery ownership', chapter: 26, heading: 'Service-level indicators and objectives', coverage: 'SLIs/SLOs/SLAs, error budgets, actionable alerts, runbooks, and incident investigation.' },
    ],
  },
  {
    id: 'data-pipelines', title: 'Search & Data Pipelines',
    description: 'Searchable and analytical views, event-time processing, and rebuilding derived data.',
    topics: [
      { title: 'OLTP, OLAP, and data processing', chapter: 17, heading: 'Operational versus analytical workloads', coverage: 'Row and column stores, ClickHouse, Snowflake, BigQuery, CDC, ETL/ELT, and analytics.' },
      { title: 'Search and Inverted Indexes', chapter: 17, heading: 'Search is a specialized read problem', coverage: 'Candidate retrieval, ranking, query limits, freshness, and rebuilding indexes.' },
      { title: 'Lakehouse Architecture', chapter: 17, heading: 'What a lakehouse adds', coverage: 'Object storage, table formats, catalogs, engines, and analytical guarantees.' },
      { title: 'Batch vs Stream Processing', chapter: 17, heading: 'Batch and stream processing', coverage: 'Bounded inputs versus continuous processing, freshness, state, and replay.' },
      { title: 'Windows, Watermarks, and Checkpoints', chapter: 17, heading: 'Windows, watermarks, and stream recovery', coverage: 'Event-time windows, late corrections, idle partitions, and duplicate-safe sinks.' },
      { title: 'Backfills and Data Lineage', chapter: 17, heading: 'Data quality, lineage, and recovery', coverage: 'Source tracking, bounded backfills, transformation versions, and safe rebuilds.' },
    ],
  },
  {
    id: 'deployment', title: 'Deployment & Evolution',
    description: 'Release infrastructure and contracts that remain safe as applications and data change.',
    topics: [
      { title: 'Virtual Machines and Containers', chapter: 18, heading: 'Bare metal, virtual machines, and containers', coverage: 'Isolation boundaries, images, kernels, resource limits, and platform responsibilities.' },
      { title: 'Rolling, Canary, and Blue-Green Deployments', chapter: 28, heading: 'Deployment strategies', coverage: 'Controlled exposure, readiness, shadow traffic, feature flags, and recovery.' },
      { title: 'Schema Evolution and Replay', chapter: 28, heading: 'Schema evolution and replay compatibility', coverage: 'Backward/forward compatibility, retained messages, defaults, units, and rollback.' },
      { title: 'Database Migrations and Rollback', chapter: 28, heading: 'Database and message compatibility', coverage: 'Expand-and-contract, backfills, mixed versions, and forward repair.' },
    ],
  },
  {
    id: 'testing-delivery', title: 'Testing & Delivery',
    description: 'Checking business behavior, capacity, failure handling, and safe production changes.',
    topics: [
      { title: 'Unit Testing', chapter: 28, heading: 'Unit testing', coverage: 'Small behavior boundaries, deterministic inputs, rules, and useful test doubles.' },
      { title: 'Integration Testing', chapter: 28, heading: 'Integration testing', coverage: 'Real database, queue, API, and serialization contracts with isolated test data.' },
      { title: 'Load Testing', chapter: 28, heading: 'Load testing', coverage: 'Expected traffic, latency percentiles, realistic mixes, cold caches, and capacity.' },
      { title: 'Stress Testing', chapter: 28, heading: 'Stress testing', coverage: 'Beyond-capacity traffic, bounded rejection, degradation, and recovery.' },
      { title: 'CI/CD Pipeline', chapter: 28, heading: 'CI/CD pipeline', coverage: 'Repeatable builds, automated checks, staged releases, canaries, and rollback.' },
      { title: 'Secure SDLC', chapter: 28, heading: 'Secure software development lifecycle', coverage: 'Threat modeling, dependency checks, least privilege, release gates, and response.' },
    ],
  },
  {
    id: 'worked-designs', title: 'Worked Designs & Interview Preparation',
    description: 'Combine the building blocks in complete designs with requirements, data paths, and failure recovery.',
    topics: [
      { title: 'Order and Payment Workflow', chapter: 30, heading: 'Design A: an online order and payment workflow', coverage: 'Reservations, outbox events, payment identity, compensation, and reconciliation.' },
      { title: 'Hotel Booking and Seat Reservations', chapter: 30, heading: 'Design B: hotel rooms or event seats', coverage: 'Exclusive ownership, holds, expiry, and competing state transitions.' },
      { title: 'Notification Service', chapter: 30, heading: 'Design C: a multi-channel notification service', coverage: 'Per-channel progress, provider limits, preferences, and truthful delivery status.' },
      { title: 'Chat System', chapter: 31, heading: 'Design D: persistent chat', coverage: 'Durable messages, WebSockets, ordering, reconnects, and read receipts.' },
      { title: 'Video Upload and Streaming', chapter: 31, heading: 'Design E: video upload and processing', coverage: 'Object storage, processing jobs, versioned outputs, CDN delivery, and access.' },
      { title: 'Search and Autocomplete', chapter: 31, heading: 'Design F: product search and autocomplete', coverage: 'Derived indexes, change events, relevance, deletion, and query bounds.' },
      { title: 'URL Shortener', chapter: 31, heading: 'Design G: a URL shortener', coverage: 'Unique identities, redirects, caches, expiry, abuse prevention, and analytics.' },
      { title: 'News Feed', chapter: 31, heading: 'Design H: a news feed', coverage: 'Fan-out on read/write, large audiences, candidate feeds, ranking, and privacy.' },
      { title: 'System Design Interview Framework', chapter: 32, heading: 'A practical interview structure', coverage: 'Requirements, useful estimates, contracts, initial design, focused depth, and tradeoffs.' },
    ],
  },
]

export const otherTopicGroups: TopicGroup[] = [
  {
    id: 'computing-foundations', title: 'Computing Foundations',
    description: 'Memory, useful data structures, and safe concurrent work, with practical examples.',
    topics: [
      { title: 'Memory, storage, and runtimes', chapter: 3, coverage: 'RAM, durable writes, object storage, processes, garbage collection, and language tradeoffs.' },
      { title: 'Data structures and algorithmic cost', chapter: 4, coverage: 'Arrays, trees, tries, heaps, graphs, Bloom filters, Big-O, and practical measurement.' },
      { title: 'Concurrency and parallelism', chapter: 5, coverage: 'Threads, async I/O, event loops, races, locks, deadlocks, and cancellation.' },
    ],
  },
  {
    id: 'implementation-operations', title: 'Implementation & Engineering Practice',
    description: 'Structure applications, choose platforms, release changes, and diagnose problems.',
    topics: [
      { title: 'Application and client architecture', chapter: 9, coverage: 'Modules, microservices, MVC/MVP/MVVM, BFFs, SOLID, and design decisions.' },
      { title: 'Cloud platforms and containers', chapter: 18, coverage: 'VMs, containers, Kubernetes, serverless, resource limits, and platform responsibilities.' },
      { title: 'Testing, releases, and Git', chapter: 28, coverage: 'Test boundaries, CI/CD, canaries, schema compatibility, mobile releases, and repositories.' },
      { title: 'Linux and practical diagnosis', chapter: 29, coverage: 'Boot, files, permissions, SSH, CPU/memory/I/O, profiling, and focused debugging.' },
    ],
  },
]

export const scenarios: Topic[] = [
  { title: 'Route a traveler to a usable region', chapter: 7, heading: 'Anycast, GeoDNS, latency routing, and ALIAS records', coverage: 'Global DNS choices, Anycast, cached addresses, and reservation ownership.' },
  { title: 'Add a cache node without moving every key', chapter: 10, heading: 'A consistent-hashing ring with virtual nodes', coverage: 'Hash-ring positions, virtual nodes, a failed owner, and safe cache warmup.' },
  { title: 'Read an account history through a B+ Tree', chapter: 11, heading: 'B-Trees and B+ Trees in a real query', coverage: 'Index pages, ordered leaf reads, composite keys, and write costs.' },
  { title: 'Read current data from three replicas', chapter: 12, heading: 'Leaderless quorums with a worked example', coverage: 'R = 2, W = 2, old replicas, conflict rules, and repair.' },
  { title: 'Refresh popular standings without a stampede', chapter: 13, heading: 'Cache breakdown and probabilistic early refresh with XFetch', coverage: 'XFetch, regeneration cost, concurrent refresh, and allowed staleness.' },
  { title: 'Keep import jobs and cached prices in step', chapter: 13, heading: 'CDC and Debezium for cache invalidation', coverage: 'Several writers, Debezium, delayed events, versions, and checkout correctness.' },
  { title: 'Keep committed configuration after leader failure', chapter: 15, heading: 'Replicated state machines and Raft step by step', coverage: 'Three voting nodes, elections, current-term commits, and loss of quorum.' },
  { title: 'Reject a worker that resumes after losing its lease', chapter: 15, heading: 'Redlock, ZooKeeper locks, and Consul sessions', coverage: 'Old owner 41, new owner 42, and a resource-side fencing check.' },
  { title: 'Create order IDs in several regions', chapter: 15, heading: 'Snowflake IDs, UUIDv4, UUIDv7, and ticket services', coverage: 'Worker allocation, clock rollback, UUIDs, sequences, and uniqueness scope.' },
  { title: 'Recover a transaction after its coordinator fails', chapter: 23, heading: 'Two-phase commit and a failed coordinator', coverage: 'Prepared participants, a lost commit message, and recovery of the saved decision.' },
  { title: 'Investigate fast acceptance but slow invoice delivery', chapter: 26, heading: 'Counters, gauges, histograms, and observability tools', coverage: 'Queue levels, latency distributions, traces, logs, and official status.' },
  { title: 'Read a private invoice over mutual TLS', chapter: 27, heading: 'Zero trust and mutual TLS between services', coverage: 'Workload identity, tenant permission, certificate rotation, and protected cached data.' },
  { title: 'Book a doctor without double booking', chapter: 1, heading: 'A worked design conversation', coverage: 'Concurrency, the official reservation, lost replies, and confirmation emails.' },
  { title: 'Keep a ticket sale usable during a rush', chapter: 10, heading: 'Applied example: ticket-sale traffic', coverage: 'Load balancing, caching, admission control, and one accepted seat owner.' },
  { title: 'Keep product pages fast without selling old stock', chapter: 13, heading: 'A practical example: product browsing and checkout', coverage: 'Cache freshness, stale refills, a failed cache, and safe checkout.' },
  { title: 'Recover an invoice sent to an unavailable partner', chapter: 22, heading: 'Example: partner invoice integration', coverage: 'Backoff, poison input, DLQ inspection, and duplicate-safe replay.' },
  { title: 'Generate a report after its worker crashes', chapter: 24, heading: 'Example: document export', coverage: 'Saved jobs, leases, repeatable output, cancellation, and result access.' },
  { title: 'Finish an order when a payment reply is lost', chapter: 30, heading: 'Design A: an online order and payment workflow', coverage: 'Outbox, reservations, payment identity, sagas, and compensation.' },
  { title: 'Resolve payment and seat-hold expiry together', chapter: 30, heading: 'Design B: hotel rooms or event seats', coverage: 'Conditional transitions, scarce resources, expiry, and callbacks.' },
  { title: 'Send email, SMS, and push independently', chapter: 30, heading: 'Design C: a multi-channel notification service', coverage: 'Separate channel progress, preferences, provider limits, and honest delivery status.' },
  { title: 'Recover chat after a phone reconnects', chapter: 31, heading: 'Design D: persistent chat', coverage: 'WebSockets, saved history, message identity, ordering, and read receipts.' },
  { title: 'Upload, process, and stream a video', chapter: 31, heading: 'Design E: video upload and processing', coverage: 'Object storage, bounded workers, complete outputs, CDN delivery, and signed access.' },
  { title: 'Keep search and autocomplete current', chapter: 31, heading: 'Design F: product search and autocomplete', coverage: 'Versioned change feeds, indexing, cache keys, deletions, and safe rebuilds.' },
  { title: 'Design a URL shortener', chapter: 31, heading: 'Design G: a URL shortener', coverage: 'Unique IDs, collision checks, redirects, cache expiry, abuse control, and analytics.' },
  { title: 'Build a feed for ordinary and high-profile authors', chapter: 31, heading: 'Design H: a news feed', coverage: 'Hybrid fan-out, read budgets, candidate ranking, late propagation, and current visibility.' },
]

export function filterTopicGroups(groups: TopicGroup[], options: { query?: string; coreOnly?: boolean; groupId?: string; stageId?: string } = {}): TopicGroup[] {
  const terms = options.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? []
  const stage = courseStages.find(item => item.id === options.stageId)
  return groups.filter(group => (!options.groupId || group.id === options.groupId) && (!options.stageId || stage?.groups.includes(group.id))).map(group => ({
    ...group,
    topics: group.topics.filter(topic => (!options.coreOnly || topic.core) && terms.every(term => `${topic.title} ${topic.coverage} ${group.title}`.toLowerCase().includes(term))),
  })).filter(group => group.topics.length > 0)
}

export function resolveTopic(book: Book, topic: Topic): { entry: Entry; section?: string } {
  const entry = book.chapters.find(chapter => chapter.number === topic.chapter)
  if (!entry) throw new Error(`Missing chapter ${topic.chapter}: ${topic.title}`)
  const heading = topic.heading ? entry.headings.find(item => item.title === topic.heading) : undefined
  if (topic.heading && !heading) throw new Error(`Missing heading in chapter ${topic.chapter}: ${topic.heading}`)
  return { entry, section: heading?.id }
}

export function topicReading(book: Book, topic: Topic) {
  const resolved = resolveTopic(book, topic)
  const start = topic.heading ? resolved.entry.tokens.findIndex(token => token.type === 'heading' && plainText(token.tokens ?? []) === topic.heading) : -1
  const heading = resolved.entry.tokens[start]
  const rest = resolved.entry.tokens.slice(start + 1)
  const next = heading?.type === 'heading' ? rest.findIndex(token => token.type === 'heading' && token.depth <= heading.depth) : -1
  const tokens = next < 0 ? rest : rest.slice(0, next)
  const words = plainText(tokens).split(/\s+/).filter(Boolean).length
  return { ...resolved, minutes: Math.max(1, Math.ceil(words / 210)), diagrams: tokens.filter(token => token.type === 'code' && token.lang === 'mermaid').length }
}