import { systemDesignGroups, type Topic } from './curriculum'

export interface RequestFlowNode {
  id: string
  label: string
  icon: string
  layer: 'client' | 'edge' | 'compute' | 'data' | 'async'
  summary: string
  topics: string[]
}

export interface RequestFlowStep {
  node: string
  from?: string
  phase: 'request' | 'response' | 'background'
  title: string
  explanation: string
  payload: string
  topics?: string[]
}

export interface RequestFlow {
  id: string
  label: string
  request: string
  summary: string
  steps: RequestFlowStep[]
}

export const requestFlowNodes: RequestFlowNode[] = [
  { id: 'client', label: 'Browser / app', icon: 'monitor-smartphone', layer: 'client', summary: 'The client starts a request and presents the result. Browser caches and existing connections can avoid work; a timeout means the outcome may be unknown, not that a write failed.', topics: ['HTTP and HTTPS', 'APIs', 'Idempotency'] },
  { id: 'dns', label: 'DNS resolver', icon: 'globe', layer: 'client', summary: 'DNS resolves a hostname to an address, often using a cached answer. It does not carry the API request or its response. Global routing can choose a nearby healthy region.', topics: ['DNS (Domain Name System)', 'Anycast, GeoDNS, and Global Routing'] },
  { id: 'edge', label: 'CDN / WAF', icon: 'shield-check', layer: 'edge', summary: 'The edge terminates a secure connection, filters unwanted traffic, and may serve reusable content. Private responses must not enter a shared cache without a correct access and cache-key policy.', topics: ['CDN (Content Delivery Network)', 'HTTP and HTTPS', 'Zero trust and service-to-service security'] },
  { id: 'gateway', label: 'API gateway', icon: 'door-open', layer: 'edge', summary: 'The gateway routes an API request and applies entry policies such as token verification, validation, and quotas. These checks do not replace object-level authorization inside the application.', topics: ['API Gateway', 'Authentication and authorization', 'Rate Limiting'] },
  { id: 'balancer', label: 'Load balancer', icon: 'split', layer: 'compute', summary: 'A load balancer chooses a healthy application instance. Readiness checks, draining, and a suitable routing algorithm matter; adding instances does not remove a shared database bottleneck.', topics: ['Load Balancing', 'Liveness and readiness probes', 'Horizontal Scaling'] },
  { id: 'service', label: 'Application', icon: 'server', layer: 'compute', summary: 'The application checks permissions and business rules, then coordinates storage or downstream calls. Deadlines, circuit breakers, and idempotency keep failures and retries from causing extra damage.', topics: ['APIs', 'Authentication and authorization', 'Circuit breakers and bulkheads', 'Idempotency'] },
  { id: 'cache', label: 'Redis cache', icon: 'zap', layer: 'data', summary: 'A cache reuses a result while its freshness policy allows it. In cache-aside, the application handles a miss, reads the database, and fills the cache. TTLs, invalidation, and stampede control limit stale data and overload.', topics: ['Cache-aside and read-through', 'Cache Eviction Policies', 'Cache Invalidation', 'Stampedes, breakdown, and avalanches'] },
  { id: 'database', label: 'Database', icon: 'database', layer: 'data', summary: 'The database is the authoritative store in this example. Indexes speed suitable reads; transactions and constraints protect writes. Sharding changes data placement, while replication adds copies with explicit consistency and durability choices.', topics: ['ACID Transactions', 'B-Trees and B+ Trees', 'Database Sharding', 'Database Replication', 'Consistency models'] },
  { id: 'relay', label: 'Outbox relay', icon: 'send', layer: 'async', summary: 'An outbox row is committed with the business change in one database transaction. A relay later publishes it. Publishing and marking it sent can race with a crash, so consumers must tolerate duplicates.', topics: ['Transactional Outbox', 'Idempotency'] },
  { id: 'queue', label: 'Message broker', icon: 'list-ordered', layer: 'async', summary: 'A durable broker holds accepted messages until consumers can process them. Queue depth, retention, ordering scope, and backpressure affect recovery. Broker acceptance is not proof that the business work finished.', topics: ['Message Queues', 'Kafka and Event Streaming', 'Delivery Guarantees'] },
  { id: 'worker', label: 'Background worker', icon: 'workflow', layer: 'async', summary: 'A worker processes the event, records its outcome, and acknowledges it. Retryable failures use bounded backoff; repeated failures need a dead-letter queue and investigation. A repeated delivery must not repeat a business effect.', topics: ['Background jobs and catch-up', 'Backoff, jitter, and retry budgets', 'DLQs and poison messages', 'Idempotency'] },
]

export const requestFlowConnections: [string, string][] = [
  ['client', 'dns'], ['client', 'edge'], ['edge', 'gateway'], ['gateway', 'balancer'],
  ['balancer', 'service'], ['service', 'cache'], ['service', 'database'],
  ['database', 'relay'], ['relay', 'queue'], ['queue', 'worker'], ['worker', 'database'],
]

const connectionSteps: RequestFlowStep[] = [
  { node: 'client', phase: 'request', title: 'A user starts the request', explanation: 'A click or app action becomes an HTTP request with a method, URL, headers, and sometimes a body. This example starts with no reusable browser response; a fresh local cache entry could finish here.', payload: 'User action -> HTTP request' },
  { from: 'client', node: 'dns', phase: 'request', title: 'Find the destination address', explanation: 'The client asks a DNS resolver for the hostname. Cached answers are reused until their TTL expires; global DNS routing may return a regional endpoint.', payload: 'api.example.com -> DNS query' },
  { from: 'dns', node: 'client', phase: 'response', title: 'DNS returns an address', explanation: 'The address comes back to the client. DNS is now out of the data path: the client connects to the endpoint, rather than sending the API call through the resolver.', payload: 'DNS answer -> endpoint IP address', topics: ['DNS (Domain Name System)', 'HTTP and HTTPS'] },
  { from: 'client', node: 'edge', phase: 'request', title: 'Send an encrypted HTTP request', explanation: 'For a new connection, HTTPS establishes secure transport using TLS over TCP, or QUIC for HTTP/3. The CDN and web application firewall inspect the request; connections can be reused by later requests.', payload: 'HTTPS request + headers' },
]

const originSteps: RequestFlowStep[] = [
  { from: 'edge', node: 'gateway', phase: 'request', title: 'Apply the API entry policies', explanation: 'This response cannot be served from the edge cache. The gateway verifies credentials, validates the request shape, applies rate limits, and propagates request and trace context.', payload: 'Origin request + identity + trace context' },
  { from: 'gateway', node: 'balancer', phase: 'request', title: 'Choose a healthy instance', explanation: 'The load balancer uses routing policy and readiness information to select an application instance. In some deployments the gateway and load balancer are one component, or appear in a different order.', payload: 'Routed request -> ready instance' },
  { from: 'balancer', node: 'service', phase: 'request', title: 'Check access and business rules', explanation: 'The application checks whether this user may act on this specific resource. It validates business rules and gives dependency calls a bounded time budget.', payload: 'Authorized application operation' },
]

function responseSteps(write: boolean): RequestFlowStep[] {
  return [
    { from: 'service', node: 'balancer', phase: 'response', title: 'Build the HTTP response', explanation: write ? 'The application returns 201 Created only after the order and its outbox event are committed. The order can still be pending; background completion is a separate state.' : 'The application serializes the result and chooses status, content type, and cache headers. The response returns through the reverse proxies on this connection.', payload: write ? '201 Created + order ID + pending status' : '200 OK + product JSON' },
    { from: 'balancer', node: 'gateway', phase: 'response', title: 'Return through the entry layer', explanation: 'The load balancer forwards the response to the gateway. Timeouts and transport failures can still hide an already-completed write, so a client retry needs a stable operation identity.', payload: 'Status + response headers + body' },
    { from: 'gateway', node: 'edge', phase: 'response', title: 'Apply the response cache policy', explanation: write ? 'The private order response is not stored in a shared CDN cache. Transport encryption protects it on the way back to the client.' : 'The edge may keep this public product response only if its cache key and cache-control policy permit reuse. Compression can reduce the number of bytes sent.', payload: write ? 'Private response / no shared caching' : 'Cache-Control + eligible response bytes' },
    { from: 'edge', node: 'client', phase: 'response', title: write ? 'The user sees the accepted order' : 'The user sees the result', explanation: write ? 'The browser reads the status and order ID, then shows the saved order as pending. It has a response now; it does not wait for the email worker.' : 'The client receives and parses the response, updates its local state, and renders the product. Network latency, server work, transfer time, and rendering all contribute to what the user experiences.', payload: write ? 'Order created / background work pending' : 'JSON -> client state -> visible screen' },
  ]
}

export const requestFlows: RequestFlow[] = [
  {
    id: 'read', label: 'Read data', request: 'GET /products/42',
    summary: 'A cache-aside read with a CDN miss and a Redis miss. The application fetches authoritative data, warms the cache, and returns the result.',
    steps: [...connectionSteps, ...originSteps,
      { from: 'service', node: 'cache', phase: 'request', title: 'Look for a reusable result', explanation: 'The application checks a versioned product key in Redis. A valid hit would skip the database read; this walkthrough follows a miss.', payload: 'GET product:42:v3' },
      { from: 'cache', node: 'service', phase: 'response', title: 'The cache reports a miss', explanation: 'Redis returns no usable value. In cache-aside, Redis does not fetch the row itself: the application owns the fallback and should limit concurrent cache rebuilds.', payload: 'MISS -> application fallback' },
      { from: 'service', node: 'database', phase: 'request', title: 'Read the authoritative record', explanation: 'The application runs a parameterized query using a suitable index. This example reads the primary; reading a replica requires deciding whether replica lag is acceptable.', payload: 'SELECT product WHERE id = 42' },
      { from: 'database', node: 'service', phase: 'response', title: 'Return the database result', explanation: 'The database returns the row from the chosen transaction snapshot. The application maps stored fields into the public response instead of exposing the database schema directly.', payload: 'Product row + version' },
      { from: 'service', node: 'cache', phase: 'request', title: 'Fill the cache with bounded freshness', explanation: 'The application stores the result with a TTL and a version-aware invalidation policy. A failed cache fill need not fail a successful read; stale refills and stampedes still need a design.', payload: 'SET product:42:v3 + value + TTL' },
      { from: 'cache', node: 'service', phase: 'response', title: 'Continue with the response', explanation: 'The cache acknowledges the fill in this example. The database remains authoritative, and later changes must expire, invalidate, or version the cached value.', payload: 'Cache fill acknowledged' },
      ...responseSteps(false)],
  },
  {
    id: 'edge-hit', label: 'CDN cache hit', request: 'GET /images/product-42.webp',
    summary: 'A public, fresh object is already at the edge. The API gateway, application, Redis, and database receive no request on this path.',
    steps: [...connectionSteps,
      { from: 'edge', node: 'client', phase: 'response', title: 'Return cached bytes directly to the user', explanation: 'The CDN finds an eligible, unexpired object for this cache key and sends it to the client. The origin is skipped, reducing latency and origin load. The client decodes and displays the image.', payload: '200 OK + cached image -> rendered screen' }],
  },
  {
    id: 'write', label: 'Write + async', request: 'POST /orders',
    summary: 'An order and its outbox event commit together. The user gets an honest pending result before a worker processes the event and publishes a status update.',
    steps: [{ ...connectionSteps[0], title: 'Submit one logical order', explanation: 'The client sends order details and a stable idempotency key. If the response is lost, retrying with the same key lets the server recover the saved result instead of creating another order.', payload: 'POST /orders + body + Idempotency-Key', topics: ['APIs', 'Idempotency'] }, ...connectionSteps.slice(1), ...originSteps,
      { from: 'service', node: 'database', phase: 'request', title: 'Commit the order and its event together', explanation: 'One local transaction writes the order, a unique idempotency record, and an outbox event. Constraints protect invariants. Reusing the same idempotency key returns the saved outcome instead of creating another order.', payload: 'BEGIN -> order + idempotency key + outbox -> COMMIT' },
      { from: 'database', node: 'service', phase: 'response', title: 'Confirm the durable commit', explanation: 'The database acknowledges the commit according to its configured durability policy. Replication, backups, and failover have separate guarantees; a Redis write alone would not prove the order was saved.', payload: 'Committed order ID + pending status' },
      ...responseSteps(true),
      { from: 'database', node: 'relay', phase: 'background', title: 'Read the committed outbox event', explanation: 'Independently of the HTTP response, a relay reads committed outbox records, by polling or change capture. The animation shows this after the reply for clarity; in production the relay may run concurrently.', payload: 'Committed OrderCreated event + event ID' },
      { from: 'relay', node: 'queue', phase: 'background', title: 'Publish pending work durably', explanation: 'The relay publishes the event and records progress after broker confirmation. A crash can cause a repeat publication, so the event keeps a stable identity. Queueing does not make the worker side effect exactly once.', payload: 'OrderCreated -> durable broker acknowledgement' },
      { from: 'queue', node: 'worker', phase: 'background', title: 'Process the event safely', explanation: 'The worker uses stable identities to avoid repeated business effects. External email or payment calls need provider idempotency or reconciliation; a local database row alone is not enough. Temporary failures use bounded backoff, and repeated failures need a dead-letter queue.', payload: 'Event delivery -> idempotent work' },
      { from: 'worker', node: 'database', phase: 'background', title: 'Save the background outcome', explanation: 'The worker commits its result and progress before acknowledging the message. A crash between commit and acknowledgement may cause redelivery; the saved event identity makes repeating the business work unnecessary.', payload: 'Saved outcome + processing record / then ACK' },
      { from: 'database', node: 'service', phase: 'background', title: 'Expose the saved status', explanation: 'The application reads or receives the committed status change. A real design needs a reliable change feed or bounded polling, and must authorize each subscriber before sending an update.', payload: 'Committed order status -> authorized subscription' },
      { from: 'service', node: 'balancer', phase: 'response', title: 'Send a live status event', explanation: 'An existing server-sent events connection can carry the update through the reverse proxies. Connection timeouts, reconnects, and missed-event recovery still need an explicit policy.', payload: 'SSE: order-status / saved outcome' },
      { from: 'balancer', node: 'gateway', phase: 'response', title: 'Forward the status stream', explanation: 'The load balancer keeps the stream attached to a healthy instance. After a reconnect, the client recovers the official status instead of assuming it received every event.', payload: 'Authorized status event' },
      { from: 'gateway', node: 'edge', phase: 'response', title: 'Keep the private stream unbuffered', explanation: 'The gateway and edge must support streaming and disable inappropriate response buffering or caching. The event is private to this authorized client.', payload: 'Private event stream / no shared cache' },
      { from: 'edge', node: 'client', phase: 'response', title: 'The user sees the updated outcome', explanation: 'The client updates the order from pending to its saved outcome. If a live connection is unavailable, an authorized status API with polling is another option; a lost notification must not lose the order.', payload: 'Saved status -> updated screen' }],
  },
]

export const requestFlowConcerns = [
  { id: 'security', label: 'Security', icon: 'shield-check', explanation: 'TLS protects each transport hop; authentication identifies callers, while authorization checks each resource and tenant. Re-encrypt internal hops where required, use least privilege, and keep secrets and personal data out of logs.', topics: ['Authentication and authorization', 'Zero trust and service-to-service security'] },
  { id: 'resilience', label: 'Failure & recovery', icon: 'heart-pulse', explanation: 'Set end-to-end deadlines and bounded dependency timeouts. Retry only safe operations with backoff and a retry budget; use idempotency for uncertain write outcomes, circuit breakers for failing dependencies, and backups plus tested recovery for durable data.', topics: ['Backoff, jitter, and retry budgets', 'Circuit breakers and bulkheads', 'Fault tolerance and recovery'] },
  { id: 'observability', label: 'Logs, metrics & traces', icon: 'activity', explanation: 'Propagate trace context through synchronous calls and link it to asynchronous events. Measure request latency and errors, cache hit rate, database latency, and queue age. Alert on user-facing SLOs, not just whether a process is running.', topics: ['Distributed Tracing and Structured Logs', 'Metrics and useful measurements', 'SLOs, alerts, and recovery ownership'] },
]

export function requestFlowTopics(titles: string[]): Topic[] {
  const topics = systemDesignGroups.flatMap(group => group.topics)
  return titles.map(title => {
    const topic = topics.find(topic => topic.title === title)
    if (!topic) throw new Error(`Missing request-flow topic: ${title}`)
    return topic
  })
}