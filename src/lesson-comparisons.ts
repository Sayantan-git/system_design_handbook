import type { LessonComparison } from './lesson-guides'

interface TopicComparison extends LessonComparison { topics: readonly string[] }

export const lessonComparisons: readonly TopicComparison[] = [
  {
    topics: ['Latency', 'Throughput'], title: 'Latency vs throughput', columns: ['Aspect', 'Latency', 'Throughput'],
    rows: [
      ['Question', 'How long does one operation take?', 'How much useful work finishes per unit of time?'],
      ['Typical unit', 'Milliseconds per request.', 'Completed requests or jobs per second.'],
      ['Important evidence', 'Distribution, including p95 and p99.', 'Completion rate together with backlog growth.'],
      ['Common trap', 'An average can hide slow users.', 'Accepted requests can hide unfinished work.'],
      ['Tradeoff example', 'Waiting to fill a batch increases delay.', 'Batching can reduce overhead per item.'],
    ], takeaway: 'A system can have high throughput and poor latency. Measure both at the same meaningful boundary.',
  },
  {
    topics: ['Availability', 'Reliability and Durability'], title: 'Availability, reliability, and durability', columns: ['Property', 'What it asks', 'Example failure'],
    rows: [
      ['Availability', 'Can the user complete the required operation now?', 'Checkout is unreachable during a dependency outage.'],
      ['Reliability', 'Does the service perform its intended function correctly over time?', 'Checkout responds but sometimes charges the wrong amount.'],
      ['Durability', 'Does acknowledged data survive the promised failures?', 'A confirmed order disappears after storage failure.'],
      ['Evidence', 'Use separate outcome and recovery measurements.', 'A green health probe cannot prove all three.'],
    ], takeaway: 'Reachable, correct, and preserved are different promises.',
  },
  {
    topics: ['Forward Proxy vs Reverse Proxy'], title: 'Forward proxy vs reverse proxy', columns: ['Aspect', 'Forward proxy', 'Reverse proxy'],
    rows: [
      ['Represents', 'Clients contacting destinations.', 'Servers receiving client requests.'],
      ['Typical placement', 'On an outbound client path.', 'At a service entry point.'],
      ['Common uses', 'Outbound access policy and controlled egress.', 'Routing, TLS termination, caching, and balancing.'],
      ['Identity concern', 'Which client is allowed to use the proxy?', 'Which forwarded metadata is trusted by the backend?'],
      ['Does not replace', 'Destination authentication and permission checks.', 'Backend resource-level authorization.'],
    ], takeaway: 'Identify whose traffic the proxy represents before reasoning about its policies.',
  },
  {
    topics: ['TCP vs UDP'], title: 'TCP vs UDP', columns: ['Aspect', 'TCP', 'UDP'],
    rows: [
      ['Data model', 'Ordered byte stream.', 'Independent datagrams.'],
      ['Delivery and ordering', 'Retransmission and ordered delivery while the connection is viable.', 'No built-in delivery or ordering guarantee.'],
      ['Message boundaries', 'Application framing is required.', 'Datagram boundaries are preserved, subject to size limits.'],
      ['Control', 'Built-in flow and congestion control.', 'Applications or higher-level protocols provide required control.'],
      ['Typical fit', 'Reliable streams such as many APIs and file transfers.', 'Loss-tolerant real-time data or protocols such as QUIC built above it.'],
      ['Business meaning', 'Transport delivery is not a committed purchase.', 'Application success still needs its own contract.'],
    ], takeaway: 'Compare complete protocols and application needs; UDP is not universally faster and TCP is not exactly-once business processing.',
  },
  {
    topics: ['HTTP/1.1, HTTP/2, and HTTP/3'], title: 'HTTP version comparison', columns: ['Aspect', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'],
    rows: [
      ['Transport', 'Usually TCP.', 'TCP.', 'QUIC, which runs over UDP.'],
      ['Concurrent messages', 'Commonly uses multiple persistent connections.', 'Multiplexed streams on a connection.', 'Multiplexed QUIC streams.'],
      ['Loss behavior', 'Lost TCP data delays that connection.', 'TCP loss can delay otherwise independent HTTP streams.', 'Loss in one stream need not block delivery in another stream.'],
      ['Security', 'HTTPS adds TLS.', 'Browsers normally use TLS.', 'TLS is integrated into QUIC.'],
      ['Unchanged responsibility', 'Application rules and database work.', 'Application rules and database work.', 'Application rules and database work.'],
    ], takeaway: 'Transport improvements cannot remove an unchanged slow query or overloaded dependency.',
  },
  {
    topics: ['REST API', 'GraphQL'], title: 'REST-style APIs vs GraphQL', columns: ['Aspect', 'REST-style HTTP API', 'GraphQL'],
    rows: [
      ['Interaction model', 'Resources and HTTP operations.', 'Typed schema with client-selected fields.'],
      ['Response shape', 'Usually designed per endpoint or representation.', 'Selected by the query within the schema.'],
      ['Caching', 'Can use standard HTTP resource-cache semantics.', 'Usually needs query-aware or application-aware caching.'],
      ['Typical risk', 'Too many endpoints or repeated client round trips.', 'Expensive nested queries and resolver fan-out.'],
      ['Cost controls', 'Bound endpoint work and page sizes.', 'Bound query depth, breadth, execution cost, and pages.'],
      ['Authorization', 'Required for each action and resource.', 'Required for fields and underlying resources.'],
    ], takeaway: 'Choose from client needs and operating cost, not from the number of frontend HTTP requests alone.',
  },
  {
    topics: ['WebSockets', 'Server-Sent Events (SSE)', 'Short Polling and Long Polling'], title: 'Polling, SSE, and WebSockets', columns: ['Aspect', 'Polling', 'SSE', 'WebSockets'],
    rows: [
      ['Direction', 'Client repeatedly requests updates.', 'Server-to-client event stream.', 'Two-way message channel.'],
      ['Freshness', 'Depends on interval or long-poll completion.', 'Updates can arrive as they are produced.', 'Updates can flow in either direction as produced.'],
      ['Connection cost', 'Repeated requests, or held long-poll requests.', 'A long-lived HTTP response.', 'A long-lived bidirectional connection.'],
      ['Typical fit', 'Occasional status checks.', 'Dashboards and progress notifications.', 'Chat and interactive collaboration.'],
      ['Recovery', 'Query current state or a cursor.', 'Replay retained event IDs or refresh a snapshot.', 'Application-defined history and reconnect protocol.'],
    ], takeaway: 'A persistent connection improves immediacy, but durable recovery still requires saved state.',
  },
  {
    topics: ['Vertical Scaling', 'Horizontal Scaling'], title: 'Vertical vs horizontal scaling', columns: ['Aspect', 'Vertical scaling', 'Horizontal scaling'],
    rows: [
      ['Change', 'Increase resources on one machine.', 'Add machines or instances.'],
      ['Initial complexity', 'Often simpler data and ownership boundaries.', 'Needs distribution and shared-state handling.'],
      ['Limit', 'Largest useful machine and serialized work.', 'Partitionability, shared dependencies, and coordination.'],
      ['Failure planning', 'The larger machine remains a failure domain.', 'Remaining instances need enough capacity and valid state.'],
      ['Example', 'More RAM for a database working set.', 'More API instances behind suitable routing.'],
    ], takeaway: 'Both are valid tools. Improve the resource that actually limits completed work.',
  },
  {
    topics: ['L4 and L7 Load Balancers'], title: 'L4 vs L7 balancing', columns: ['Aspect', 'Layer 4', 'Layer 7'],
    rows: [
      ['Visibility', 'Transport flows, addresses, and ports.', 'Application messages such as HTTP paths and headers.'],
      ['Typical unit', 'Connection or flow.', 'Application request or stream, depending on implementation.'],
      ['Routing options', 'Transport-level eligibility and distribution.', 'Content-aware routing, versions, and endpoint policies.'],
      ['TLS choice', 'Can pass encrypted traffic through.', 'Often terminates TLS to inspect HTTP.'],
      ['Caution', 'One connection may carry many expensive requests.', 'Extra application processing and trust configuration.'],
    ], takeaway: 'Use the layer that exposes the information needed for the routing decision.',
  },
  {
    topics: ['Stateful vs Stateless Systems'], title: 'Stateful vs stateless request handling', columns: ['Aspect', 'Stateful instance', 'Stateless instance'],
    rows: [
      ['Necessary state', 'Some required state belongs to that instance or partition owner.', 'Required state can be recovered through the request or external owner.'],
      ['Replacement', 'Needs state recovery or ownership transfer.', 'Another eligible instance can handle the next request.'],
      ['Routing', 'May require affinity or partition-aware routing.', 'Usually more freely distributed.'],
      ['Typical use', 'Owned stream state or database partitions.', 'Replaceable API handlers using durable shared records.'],
      ['Common misconception', 'Sticky routing alone is not durability.', 'Stateless does not mean the application stores no data.'],
    ], takeaway: 'The distinction concerns where necessary state lives, not whether state exists.',
  },
  {
    topics: ['SQL vs NoSQL', 'Database Types and Product Choices'], title: 'Relational and non-relational models', columns: ['Aspect', 'Relational model', 'Non-relational models'],
    rows: [
      ['Organization', 'Related tables with keys and constraints.', 'Key-value, documents, wide columns, graphs, and others.'],
      ['Access strengths', 'Structured queries, joins, and relational constraints.', 'Operations suited to the selected specific model.'],
      ['Schema', 'Explicit structure with planned evolution.', 'May be flexible, but still needs application schema rules.'],
      ['Transactions', 'Verify the engine and chosen transaction scope.', 'Support varies by product and operation; not universally absent.'],
      ['Scaling and consistency', 'Depend on architecture and configuration.', 'Depend on architecture and configuration.'],
      ['Decision input', 'Queries, invariants, distribution, and operating skill.', 'The same inputs, evaluated against a concrete product.'],
    ], takeaway: 'NoSQL is several models, not one opposite of SQL with one universal guarantee.',
  },
  {
    topics: ['Database Sharding', 'Database Replication'], title: 'Sharding vs replication', columns: ['Aspect', 'Sharding', 'Replication'],
    rows: [
      ['Purpose', 'Divide records and work among owners.', 'Maintain additional copies of records.'],
      ['Data placement', 'Each shard owns a subset.', 'Replicas hold overlapping data.'],
      ['Capacity benefit', 'Can distribute storage and writes when work partitions well.', 'Can help eligible reads and recovery; not automatic write scaling.'],
      ['Main challenges', 'Shard keys, skew, cross-shard work, migration.', 'Lag, acknowledgement, promotion, and conflicting writers.'],
      ['Together', 'A shard can have multiple replicas.', 'Each replica set can protect one shard.'],
    ], takeaway: 'Split data to distribute ownership; copy data to support the selected replication goals.',
  },
  {
    topics: ['Normalization', 'Denormalization'], title: 'Normalization vs denormalization', columns: ['Aspect', 'Normalization', 'Denormalization'],
    rows: [
      ['Goal', 'Keep shared facts under clear related ownership.', 'Precompute or duplicate data for selected reads.'],
      ['Read cost', 'May require joins or multiple lookups.', 'Can reduce read-time joins and computation.'],
      ['Write cost', 'Often updates a shared fact in one place.', 'May need several copies or projections updated.'],
      ['Risk', 'Expensive access if queries and indexes are poorly designed.', 'Stale copies, missed updates, and rebuild complexity.'],
      ['History', 'Keep relationships for current facts.', 'Historical snapshots may be intentional authoritative facts.'],
    ], takeaway: 'Optimize reads without losing track of which copy owns the current or historical truth.',
  },
  {
    topics: ['Cache-aside and read-through'], title: 'Cache-aside vs read-through', columns: ['Aspect', 'Cache-aside', 'Read-through'],
    rows: [
      ['Miss owner', 'Application explicitly loads the source.', 'The cache-facing loader owns source loading.'],
      ['Application path', 'Check cache, load source, populate cache.', 'Ask the cache abstraction for the value.'],
      ['Control', 'Explicit application handling of source and cache failures.', 'Centralized loading behavior behind the abstraction.'],
      ['Shared risks', 'Concurrent misses, stale refills, source overload.', 'Concurrent misses, stale refills, source overload.'],
    ], takeaway: 'The pattern changes loading responsibility; both need a bounded, correct miss path.',
  },
  {
    topics: ['Write-through and write-behind'], title: 'Write-through vs write-behind', columns: ['Aspect', 'Write-through', 'Write-behind'],
    rows: [
      ['Source update', 'Part of the foreground write path.', 'Deferred after acceptance into a buffer.'],
      ['Latency', 'Caller generally waits for the required source work.', 'Can reduce foreground waiting and batch updates.'],
      ['Recovery focus', 'Partial failure across cache and source.', 'Durable buffering, replay, ordering, and lag.'],
      ['Acknowledgement', 'Must define which writes have succeeded.', 'Must define whether buffered acceptance is durable.'],
    ], takeaway: 'Delayed persistence is a contract change that needs a recovery protocol.',
  },
  {
    topics: ['Block, File, and Object Storage', 'Blob and Object Storage'], title: 'Block, file, and object storage', columns: ['Aspect', 'Block', 'File', 'Object'],
    rows: [
      ['Interface', 'Addressable volume blocks.', 'Paths and filesystem operations.', 'Keys and object APIs.'],
      ['Common use', 'Database or filesystem volumes.', 'Shared files and path-based applications.', 'Media, documents, backups, and large artifacts.'],
      ['Update model', 'Application or filesystem writes blocks.', 'File operations defined by the filesystem.', 'Object operations defined by the provider API.'],
      ['Important check', 'Volume durability, attachment, and filesystem behavior.', 'Locking, rename, sharing, and mount semantics.', 'Consistency, access, object lifecycle, and publication semantics.'],
    ], takeaway: 'Do not assume a filesystem operation remains atomic after switching to an object API.',
  },
  {
    topics: ['Concurrency and Parallelism', 'Threads, tasks, and event loops'], title: 'Concurrency vs parallelism', columns: ['Aspect', 'Concurrency', 'Parallelism'],
    rows: [
      ['Meaning', 'Several tasks have overlapping lifetimes.', 'Several tasks execute at the same instant.'],
      ['Example', 'An event loop serves other work while I/O waits.', 'Several CPU cores process independent chunks.'],
      ['Main benefit', 'Better use of time otherwise spent waiting.', 'More computation at once when work can be divided.'],
      ['Limits', 'Queues, connections, memory, and scheduling.', 'Cores, synchronization, memory, and downstream capacity.'],
      ['Shared-state rule', 'Interleaving can still produce races.', 'Simultaneous execution can also produce races.'],
    ], takeaway: 'Async does not mean parallel, and neither means unlimited or race-free.',
  },
  {
    topics: ['Monolithic Architecture', 'Microservices', 'Monolith vs Microservices'], title: 'Modular monolith vs microservices', columns: ['Aspect', 'Modular monolith', 'Microservices'],
    rows: [
      ['Deployment', 'One application release boundary.', 'Several independently operated release boundaries.'],
      ['Communication', 'Often in-process module calls.', 'Network contracts and asynchronous messages.'],
      ['Transactions', 'Local transactions can cover suitable shared operations.', 'Cross-service operations need explicit coordination or compensation.'],
      ['Scaling', 'Can run multiple application instances.', 'Capabilities can scale separately when boundaries support it.'],
      ['Operating cost', 'Usually simpler initial deployment and diagnosis.', 'More observability, compatibility, and failure handling.'],
      ['Best reason to choose', 'Cohesive workload and a simpler team operating model.', 'Real independent ownership, release, or scale needs.'],
    ], takeaway: 'Network separation is useful when it reduces meaningful coordination, not merely code size.',
  },
  {
    topics: ['Message Queues', 'Publish-Subscribe (Pub/Sub)', 'Kafka and Event Streaming'], title: 'Work queue, Pub/Sub, and retained log', columns: ['Aspect', 'Work queue', 'Pub/Sub subscriptions', 'Retained log'],
    rows: [
      ['Consumption', 'Workers commonly divide jobs.', 'Each logical receiver gets its own copy or progress.', 'Consumers read positions in ordered partitions.'],
      ['Primary use', 'Distribute asynchronous work.', 'Independent reactions to accepted events.', 'Streaming, replay, and rebuilding projections.'],
      ['Progress', 'Acknowledgement or settlement of jobs.', 'Independent subscription progress where supported.', 'Offsets or cursors per consumer group.'],
      ['Replay', 'Depends on retention and settlement behavior.', 'Depends on subscription durability and retention.', 'Available within retained history.'],
      ['Shared responsibility', 'Duplicate-safe business effects.', 'Duplicate-safe business effects.', 'Duplicate-safe business effects.'],
    ], takeaway: 'Choose the actual delivery and retention mode; product names alone do not specify it.',
  },
  {
    topics: ['Delivery Guarantees'], title: 'Delivery guarantees and business effects', columns: ['Model', 'What may happen', 'Application responsibility'],
    rows: [
      ['At most once', 'A message may be lost, with no repeated delivery under the defined contract.', 'Decide whether lost work is acceptable or can be recovered elsewhere.'],
      ['At least once', 'A message may be delivered repeatedly.', 'Deduplicate or make the effect idempotent.'],
      ['Exactly once in a boundary', 'A supported protocol avoids repeated committed effects inside its scope.', 'Verify the scope and handle anything outside it.'],
      ['External side effect', 'Provider acceptance may be uncertain after a lost reply.', 'Use provider identity, supported idempotency, or reconciliation.'],
    ], takeaway: 'Ask exactly once for which effect and across which components.',
  },
  {
    topics: ['Lamport Clocks and Vector Clocks'], title: 'Lamport clocks vs vector clocks', columns: ['Aspect', 'Lamport clock', 'Vector clock'],
    rows: [
      ['State', 'One logical counter per participant.', 'Progress counters associated with participants.'],
      ['Causal property', 'Causally earlier events have smaller timestamps.', 'Comparison can distinguish causal order from concurrency.'],
      ['Key limitation', 'A smaller timestamp does not prove causality.', 'Participant growth and identity management add overhead.'],
      ['Use', 'Ordering compatible with causal relationships.', 'Detecting concurrent versions needing a merge decision.'],
      ['Not provided', 'Elapsed physical time or automatic conflict resolution.', 'Elapsed physical time or automatic business conflict resolution.'],
    ], takeaway: 'Ordering numbers is easier than proving which update knew about another.',
  },
  {
    topics: ['2PC and a coordinator failure', 'Distributed transactions and sagas'], title: 'Two-phase commit vs saga', columns: ['Aspect', 'Two-phase commit', 'Saga'],
    rows: [
      ['Goal', 'One atomic commit decision across supported participants.', 'Recover a sequence of locally committed business steps.'],
      ['Intermediate state', 'Participants may remain prepared and hold resources.', 'Completed steps can be externally visible.'],
      ['Failure response', 'Recover the durable global decision.', 'Retry, compensate, or reconcile unfinished work.'],
      ['Participation', 'Requires compatible transaction protocol support.', 'Uses business operations and compensations.'],
      ['Important limit', 'Can block when the decision cannot be learned.', 'Compensation may fail or not fully undo an effect.'],
    ], takeaway: 'A saga is not a distributed rollback button, and 2PC does not include arbitrary APIs automatically.',
  },
  {
    topics: ['RTO and RPO'], title: 'RTO vs RPO', columns: ['Aspect', 'RTO', 'RPO'],
    rows: [
      ['Expanded name', 'Recovery Time Objective.', 'Recovery Point Objective.'],
      ['Question', 'How soon must the agreed service return?', 'How much recent accepted data may be missing?'],
      ['Measurement', 'Full time from disruption through validated recovery.', 'Gap between acknowledged work and recovered data.'],
      ['Typical design inputs', 'Detection, access, provisioning, restore, routing, validation.', 'Backup frequency, replication acknowledgement, retention.'],
      ['Proof', 'A complete timed recovery drill.', 'Comparison of acknowledged and restored records.'],
    ], takeaway: 'Fast file copying alone proves neither objective.',
  },
  {
    topics: ['Authentication and authorization', 'Zero trust and service-to-service security'], title: 'Authentication vs authorization', columns: ['Aspect', 'Authentication', 'Authorization'],
    rows: [
      ['Question', 'Who is making the request?', 'May this identity perform this action on this resource?'],
      ['Evidence', 'Validated credentials, session, or workload identity.', 'Ownership, roles, scopes, policy, and current resource state.'],
      ['Example', 'Verify a signed-in customer\'s token.', 'Check that invoice 42 belongs to that customer.'],
      ['Service-to-service', 'mTLS can authenticate a workload.', 'Policy still restricts the workload\'s actions and data.'],
      ['Failure mode', 'Accepting an invalid or wrong-audience token.', 'Returning another tenant\'s object to a valid user.'],
    ], takeaway: 'A correct identity check is necessary but not sufficient for resource access.',
  },
  {
    topics: ['OAuth 2.0, OIDC, and JWT'], title: 'OAuth 2.0, OIDC, and JWT', columns: ['Term', 'Role', 'Do not assume'],
    rows: [
      ['OAuth 2.0', 'Framework for delegated access to resources.', 'Every OAuth access token is a JWT or a login assertion.'],
      ['OIDC', 'Identity layer built on OAuth for authentication.', 'An ID token is intended for every resource API.'],
      ['JWT', 'A token representation carrying claims with supported protection.', 'Decoding is equivalent to signature and claim validation.'],
      ['Resource authorization', 'Applies policy to the actual requested action and data.', 'A valid token permits every object.'],
    ], takeaway: 'A flow, an identity protocol, and a token format solve different parts of the problem.',
  },
  {
    topics: ['Batch vs Stream Processing'], title: 'Batch vs stream processing', columns: ['Aspect', 'Batch', 'Streaming'],
    rows: [
      ['Input', 'A bounded dataset or range.', 'An ongoing event flow.'],
      ['Result timing', 'After a scheduled or triggered run.', 'Incrementally, according to processing and window policies.'],
      ['Operating concerns', 'Job retries, partitions, scheduling, and publication.', 'Continuous state, checkpoints, lag, and late data.'],
      ['Common fit', 'Daily reports or historical rebuilds.', 'Live monitoring or near-real-time projections.'],
      ['Correctness needs', 'Identity, replay, and complete output validation.', 'Identity, replay, and complete output validation.'],
    ], takeaway: 'Both need time and duplicate semantics; streaming is not automatically more accurate.',
  },
  {
    topics: ['Virtual Machines and Containers', 'Bare metal, virtual machines, and containers'], title: 'Virtual machines vs containers', columns: ['Aspect', 'Virtual machine', 'Container'],
    rows: [
      ['Kernel', 'Normally runs a guest OS kernel.', 'Normally shares the host kernel.'],
      ['Packaging', 'Machine image and guest environment.', 'Application layers and runtime configuration.'],
      ['Isolation', 'Hardware virtualization boundary, depending on platform.', 'Process and OS isolation, depending on platform.'],
      ['Startup and density', 'Often larger startup and resource footprint.', 'Often lighter, but workload and platform matter.'],
      ['Persistent state', 'Needs an explicit durable storage and backup plan.', 'Needs an explicit durable storage and backup plan.'],
    ], takeaway: 'Choose isolation and control deliberately; neither packaging model guarantees application durability.',
  },
  {
    topics: ['Rolling, Canary, and Blue-Green Deployments', 'Deployment strategies'], title: 'Deployment strategy comparison', columns: ['Aspect', 'Rolling', 'Canary', 'Blue-green'],
    rows: [
      ['Method', 'Replace instances gradually.', 'Expose a limited audience, then expand.', 'Switch between prepared environments.'],
      ['Main benefit', 'Avoid replacing all instances at once.', 'Measure impact before broad exposure.', 'A prepared alternative enables traffic switching.'],
      ['Typical cost', 'Mixed versions during rollout.', 'Traffic control and meaningful evaluation.', 'Extra environment capacity and data compatibility.'],
      ['Rollback limit', 'Old code must still understand current data.', 'Already completed effects remain real.', 'Switching traffic does not reverse data changes.'],
    ], takeaway: 'All three need a data-aware recovery plan.',
  },
  {
    topics: ['Unit Testing', 'Integration Testing', 'Tests protect different boundaries'], title: 'Unit, integration, and end-to-end tests', columns: ['Aspect', 'Unit', 'Integration', 'End to end'],
    rows: [
      ['Scope', 'Focused local behavior.', 'A real boundary or component interaction.', 'A representative user journey.'],
      ['Example', 'Reject an expired reservation.', 'Enforce concurrent uniqueness in the real database.', 'Show the correct booking outcome to the customer.'],
      ['Strength', 'Fast, deterministic feedback.', 'Find contract and configuration mismatches.', 'Verify the important pieces work together.'],
      ['Blind spot', 'Mocks cannot prove external guarantees.', 'May omit unrelated workflow interactions.', 'Slower failures can be harder to diagnose.'],
    ], takeaway: 'Use a focused mix; no single test level proves every promise.',
  },
  {
    topics: ['Client patterns: MVC, MVP, and MVVM'], title: 'MVC, MVP, and MVVM', columns: ['Aspect', 'MVC', 'MVP', 'MVVM'],
    rows: [
      ['Coordinator', 'Controller handles input and coordination.', 'Presenter coordinates the view.', 'View model exposes state and commands.'],
      ['View relationship', 'Varies by framework and interpretation.', 'Often an explicit view interface.', 'Often binding to presentation state.'],
      ['Testing focus', 'Controller and model behavior.', 'Presenter decisions with a testable view boundary.', 'State transitions and commands.'],
      ['Shared purpose', 'Separate presentation responsibilities.', 'Separate presentation responsibilities.', 'Separate presentation responsibilities.'],
      ['Not determined', 'Backend deployment or resource authorization.', 'Backend deployment or resource authorization.', 'Backend deployment or resource authorization.'],
    ], takeaway: 'Follow the client framework and keep authoritative business rules at their actual owner.',
  },
]