import { extendedQuestions } from './extended-questions'

export interface Question {
  id: string
  cardId?: string
  chapter: number
  prompt: string
  options: string[]
  correct: number
  explanation: string
  term: string
  definition: string
}

const items: Omit<Question, 'id' | 'chapter'>[] = [
  {
    prompt: 'Two patients select the same appointment. What should the design establish first?',
    options: ['A larger application server', 'A rule enforced in the official data store that allows only one reservation', 'A cache for appointment details', 'A separate microservice for every table'], correct: 1,
    explanation: 'Both patients may see the appointment as available before either booking is saved. The system must protect the rule that only one accepted reservation can own that slot. Enforce it with a suitable database constraint, atomic operation, or transaction. A faster server can process more requests, but it does not decide which competing booking is valid. A cache can also show an older availability result.',
    term: 'System design', definition: 'Deciding how the parts of an application work together. Explain which part owns the official data, how requests move between parts, what a success response promises, and how accepted work is protected when traffic grows or something fails.',
  },
  {
    prompt: 'A service receives 200 requests per second, each taking 0.25 seconds on average. Roughly how many requests are in flight in a stable system?',
    options: ['8', '800', '50', '200'], correct: 2,
    explanation: 'Little\'s Law gives the average number of requests in progress as the request rate multiplied by the average time spent in the system. Here, 200 x 0.25 = 50. Measure the rate and duration over the same part of the system, including waiting where appropriate. This estimate assumes a stable flow; it does not prove that a queue growing without limit will eventually clear.',
    term: 'Latency vs. throughput', definition: 'Latency is how long one operation takes. Throughput is how much work finishes in a period of time. Concurrency counts work still in progress. More simultaneous work can help until a shared resource becomes fully busy, after which waiting increases.',
  },
  {
    prompt: 'A database serves many reads from RAM. Does that mean its committed data is not durable?',
    options: ['No; durability depends on how writes are saved and when success is acknowledged', 'Yes; all durable reads must access a disk', 'Only if the database has an index', 'A larger heap guarantees durability'], correct: 0,
    explanation: 'Reading quickly and saving safely are different jobs. A database can keep a read cache in RAM while protecting committed writes through a log, storage flushes, and its configured replication rules. The important question is what must happen before it confirms a write. Keeping the only copy in RAM would not survive a process or machine failure, but using RAM for faster reads does not remove durable storage.',
    term: 'Durability', definition: 'The promise that a confirmed, committed write survives the kinds of failure covered by the storage configuration. It is different from availability: the service may be temporarily unreachable while its saved data is still safely preserved.',
  },
  {
    prompt: 'A catalog suggests names as a user types the first few letters. Which structure is designed to follow these shared prefixes efficiently?',
    options: ['A stack', 'An unordered queue', 'A single counter', 'A trie'], correct: 3,
    explanation: 'A trie follows a key one part at a time, often one character at a time, so names with the same beginning share a path. This fits prefix suggestions. A larger autocomplete service may also need language handling and relevance ranking from a search index. Start with the queries the application needs, rather than assuming that a structure good at exact ID lookups will also be best for every search.',
    term: 'Designing around access patterns', definition: 'Choose how to organize data by the operations it must support. Looking up one exact key, reading a price range, finding names by prefix, and ranking text matches need different structures. The most useful choice follows the actual queries.',
  },
  {
    prompt: 'A process-local lock protects an inventory update. The API now runs on five machines. What has changed?',
    options: ['All machines automatically share the lock', 'Other processes can still race at the shared database', 'The network makes updates serial', 'Async code removes the race'], correct: 1,
    explanation: 'Each application process has its own memory and its own local lock. One process holding its lock does not stop another process from reading the same stock value and updating it. Protect the shared inventory rule in the database with an appropriate constraint, conditional update, or transaction, or another mechanism that covers all writers. Async code helps manage waiting; it does not make a shared business update safe by itself.',
    term: 'Concurrency vs. parallelism', definition: 'Concurrency means making progress on tasks whose work overlaps in time, including switching tasks while one waits. Parallelism means executing tasks at the same instant on separate resources. Both still need rules for safely reading and changing shared data.',
  },
  {
    prompt: 'A TCP connection drops after a purchase request was sent. What can the client safely conclude?',
    options: ['The purchase definitely failed', 'The purchase definitely succeeded', 'The business outcome may be unknown', 'TCP will roll back the purchase'], correct: 2,
    explanation: 'The server may have saved the purchase before the connection dropped, or it may never have completed the request. The client cannot tell from the broken connection alone. Keep the same operation identity and check its status or use a supported safe retry. TCP moves bytes and recovers transport errors; it does not roll back a purchase in the application database when a reply is lost.',
    term: 'Transport vs. business outcome', definition: 'Delivering request bytes and saving a business result are separate steps. A secure, reliable connection does not prove that a purchase committed. The application needs saved operation identities and status information to explain what actually completed after communication fails.',
  },
  {
    prompt: 'An operator changes DNS to a recovery region. Why might some clients still use the old endpoint?',
    options: ['Cached answers and existing connections can outlive the change', 'DNS always routes every request independently', 'HTTPS prevents DNS updates', 'Only the database can change a hostname'], correct: 0,
    explanation: 'Changing an official DNS record does not erase every cached answer held by a client or resolver. Clients may also keep using a connection already opened to the old address. Moving traffic through DNS therefore takes time. Recovery needs more than the new address: check that the replacement region has suitable capacity, current enough data, and clear permission to own new writes.',
    term: 'Reverse proxy', definition: 'A server-facing intermediary that receives requests before they reach application servers. It can route traffic, handle the client TLS connection, or apply limits. A forward proxy has the opposite role: it sends outgoing requests on behalf of clients.',
  },
  {
    prompt: 'A report endpoint returns 202 Accepted and an operation ID. What should the client display?',
    options: ['Report complete', 'All downstream work succeeded', 'The report can never fail', 'Accepted or pending, with a way to obtain its result'], correct: 3,
    explanation: 'The response says the request was accepted, not that the report is ready. Show it as accepted or pending and provide a way to check progress and retrieve the result. If acceptance promises recovery after a restart, the job must be safely saved before the response. Later states should honestly show completion, failure, cancellation, or expiry, and the finished report must still be protected by access checks.',
    term: 'Asynchronous request-reply', definition: 'An API accepts work now and provides its result later. It returns an operation ID so the caller can check saved status. Define what acceptance guarantees, how unfinished work survives restarts, and how callers see completion, failure, cancellation, or expiry.',
  },
  {
    prompt: 'Every small change requires synchronized deployments across ten services. What does this suggest?',
    options: ['The system is automatically more scalable', 'The service boundaries may form a distributed monolith', 'Each table needs another service', 'A message bus eliminates all coupling'], correct: 1,
    explanation: 'Separate services provide useful independence only when their responsibilities and interfaces allow them to change separately. If every change needs a coordinated release of all ten services, the application may still be tightly connected, with extra network failures added. Review the business boundaries and transaction needs. A modular monolith may be easier to maintain until a genuine need for independent releases or scaling justifies a service split.',
    term: 'Modular monolith', definition: 'One deployable application divided into clear business modules, such as billing and enrollment. The modules can have well-defined responsibilities without becoming separate network services. The application can still use background queues and run several instances when those features are needed.',
  },
  {
    prompt: 'Adding API replicas worsens database latency. What is the most useful next investigation?',
    options: ['Add more replicas immediately', 'Disable every health check', 'Check total database connections, query cost, and simultaneous calls', 'Increase only the load balancer timeout'], correct: 2,
    explanation: 'Each new API instance may create another connection pool and send more database requests at once. If the database is already fully busy, this adds waiting rather than useful capacity. Compare total connections, query times, pool waits, and completed work before and after scaling. Limit demand and improve the actual bottleneck. A load balancer shares traffic among API instances; it does not make their shared database faster.',
    term: 'Load balancing vs. autoscaling', definition: 'Load balancing chooses among backends that are already available. Autoscaling adds or removes capacity according to rules and measurements. Both depend on work being shareable, and neither automatically increases the capacity of a shared database or external provider.',
  },
  {
    prompt: 'Two transactions each read that another doctor is on call, then take different doctors off duty. Together they leave nobody on call. What problem is this?',
    options: ['Write skew', 'CDN invalidation', 'DNS propagation', 'A guaranteed dirty read'], correct: 0,
    explanation: 'This is write skew. Each transaction can see a consistent snapshot, update a different row, and still make a decision that breaks a rule shared across rows. For example, two doctors may each see the other on call and both leave. Protect the actual business rule with suitable isolation, constraints, locking, or an atomic representation. Merely saying both requests use transactions does not prove the shared rule is safe.',
    term: 'ACID isolation', definition: 'Isolation defines how transactions interact while their work overlaps and which data changes each may observe. Different levels prevent different problems. Choose protection for the rule that must remain true, including rules spanning several rows, and account for waiting or retries.',
  },
  {
    prompt: 'What is the essential distinction between a shard and a replica?',
    options: ['Both are only cache names', 'A shard must always be read-only', 'Replicas contain unrelated data', 'Shards divide data; replicas copy a data subset'], correct: 3,
    explanation: 'Shards hold different subsets of the data, such as different groups of accounts. Replicas hold copies of a subset so it can be available elsewhere or support suitable reads. These ideas can be combined: every shard may have its own replicas. The system still needs to route requests to the right shard, manage write ownership, account for replication delay, and recover failed nodes safely.',
    term: 'Sharding', definition: 'Dividing data into subsets placed on different nodes. The shard key decides where a record belongs, which related data stays together, and where traffic may concentrate. Queries, moves between shards, and cross-shard transactions become part of the design.',
  },
  {
    prompt: 'A writer commits version 11 and invalidates the cache. A reader then inserts version 10, fetched earlier. What happened?',
    options: ['The TTL guaranteed correctness', 'A stale-fill race', 'A successful distributed transaction', 'A cache cannot behave this way'], correct: 1,
    explanation: 'The reader fetched the old value before the writer changed the database, but stored it after the cache was deleted. The deletion succeeded and the cache still became stale again. Possible protections include version checks, separate immutable version keys, coordinated loading, or a clearly accepted stale period. A TTL limits the lifetime of that new cache entry; it does not make the earlier database read current.',
    term: 'Cache stampede', definition: 'Many callers miss the same popular cache entry and all try to rebuild it at once. They can overwhelm the original source. Share one ongoing load where possible, limit concurrent loads, refresh selected entries early, or serve an explicitly allowed older value.',
  },
  {
    prompt: 'A subscriber disconnects from Redis Pub/Sub. Can it rely on receiving everything it missed after reconnecting?',
    options: ['Yes, indefinitely', 'Yes, if its process has more memory', 'No; Pub/Sub is not a durable offline mailbox', 'Only if the channel name is unique'], correct: 2,
    explanation: 'Redis Pub/Sub sends live messages to subscribers that are connected. It does not save a private backlog for a disconnected receiver to read later. That may be fine for a temporary refresh signal if the client can later fetch the official current state. Required jobs need a feature whose retention and recovery rules preserve the work. Redis Streams and other messaging systems have different guarantees that must be checked separately.',
    term: 'CDN', definition: 'A Content Delivery Network serves suitable cached files from locations nearer users, reducing travel time and repeated work at the source. The design still needs correct cache keys, freshness rules, access checks, and policies for file versions and expiry.',
  },
  {
    prompt: 'Two isolated regions accept conflicting reservations for the same seat. What is missing from saying they are eventually consistent?',
    options: ['A rule for deciding valid ownership and resolving the conflicting promises', 'A different name for the database', 'More copies of the same unresolved conflict', 'A promise that both reservations can remain valid'], correct: 0,
    explanation: 'The copies agreeing later does not make two conflicting seat promises valid now. Decide whether the business allows overbooking. If it requires one exclusive owner, a region that cannot perform the required coordination may have to refuse or defer the reservation. If conflicting local work is accepted, explain exactly how it is resolved and what users may lose. The label eventual consistency is not a conflict policy.',
    term: 'CAP', definition: 'During a network partition, parts of the system cannot communicate reliably. The theorem limits the ability to provide both its strong single-copy consistency and availability on every non-failed side. Explain the affected operation and failure behavior, not a permanent pick-any-two slogan.',
  },
  {
    prompt: 'An accidental deletion propagates to every live database replica. What recovery mechanism addresses this class of failure?',
    options: ['Round-robin routing', 'Another replica of the deleted state', 'A longer request timeout', 'Restore-tested backup and point-in-time recovery'], correct: 3,
    explanation: 'Replication copies changes, including many accidental deletions. Another copy of the already deleted state does not recover the missing records. A tested backup and suitable retained logs can restore an earlier valid point. After restoring, compare local state with messages and external effects that may have happened later, such as provider charges. Database restoration is one recovery step; it does not automatically reverse the outside world.',
    term: 'RTO and RPO', definition: 'RTO is the target time to restore a defined service. RPO is the acceptable interval of recent data that recovery may lose. Test both with detection, access, restore time, routing, and business checks included, not only the backup-copy time.',
  },
  {
    prompt: 'A phone uploads yesterday\'s activity today. Which distinction matters for daily streaming analytics?',
    options: ['Only the time the upload finished', 'When the event happened versus when it was processed', 'Only the size of the uploaded file', 'Only the number of running workers'], correct: 1,
    explanation: 'The activity happened yesterday, but the processor sees it today. Grouping only by arrival time may put it in the wrong daily total. Define event-time windows and how late records affect previously reported results. Watermarks help estimate processing progress, but the application still needs a lateness policy. Retries and replay also need safe aggregation so the same activity does not count twice.',
    term: 'Derived projection', definition: 'A view built from official source records, such as a search index or sales report. It can be shaped for fast reads, but may update later. Plan reliable updates, acceptable delay, deletion handling, and a way to rebuild it.',
  },
  {
    prompt: 'A database runs in a Kubernetes StatefulSet. What does Kubernetes still not implement for that database?',
    options: ['A scheduling abstraction', 'Pod identity mechanisms', 'Its database-specific replication, backup, and transaction protocol', 'A control loop for desired state'], correct: 2,
    explanation: 'A StatefulSet helps manage workload identity and lifecycle. It does not decide which database writes are committed or how data is copied and recovered. You still need appropriate storage, replica placement, quorum rules, ownership, upgrades, backups, and restore procedures. Test those database guarantees under realistic failures, or choose a managed service that provides the required behavior. Running the process in Kubernetes does not replace that design.',
    term: 'Container', definition: 'A packaged application and its user-space dependencies running with isolation and resource controls while sharing a host kernel. It is not automatically a virtual machine with its own kernel. Its packaging also does not make local files durable after replacement.',
  },
  {
    prompt: 'Billing and analytics must each process every order event independently. Which model fits?',
    options: ['Independent durable subscriptions or consumer groups', 'One competing-consumer queue with one event', 'A shared in-memory array in one worker', 'Sending the event only to whichever service responds first'], correct: 0,
    explanation: 'Billing and analytics each need to know which order events they have processed. Give each its own durable subscription or consumer group under the selected broker model. Workers inside billing can then share billing work, while analytics makes progress separately. A single queue with competing consumers divides jobs among those consumers; it does not give every service every event. Check retention, routing, and receive permissions too.',
    term: 'Message bus', definition: 'A shared way for components to exchange commands and events, including messaging infrastructure and agreed conventions. The term does not itself promise durable storage or exactly-once effects. Those guarantees depend on the broker, settings, and application processing rules.',
  },
  {
    prompt: 'One Kafka partition is overloaded by a busy key whose events must be handled in order. Will adding 100 consumers necessarily solve the problem?',
    options: ['Yes, every record can then be processed independently', 'Yes, offsets become unnecessary', 'Yes, Kafka automatically repartitions the topic without affecting order', 'No; the key still needs ordered work within its assigned partition'], correct: 3,
    explanation: 'The group assigns partitions to consumers, so adding consumers does not automatically divide one partition among them. If one key must be processed in order, that sequence may still be limited by one processing path. Review the key distribution, cost of each step, and which work can safely run independently. Splitting an ordered business sequence without preserving its rules can make the system faster but incorrect.',
    term: 'Retained event log', definition: 'An ordered record history that consumers read by position. Reading does not normally delete the record. Separate groups can keep their own progress and replay retained data, but retention or compaction may remove history before a slow consumer catches up.',
  },
  {
    prompt: 'A worker commits its effect, then crashes before acknowledging the broker. What should handle redelivery?',
    options: ['A new business operation ID on every attempt', 'An atomic inbox and duplicate-safe business effect', 'Acknowledging before every transaction starts', 'Disabling all recovery'], correct: 1,
    explanation: 'Save the operation identity and its local business change in the same protected transaction. If the broker delivers the message again, the worker can find the committed identity and acknowledge without applying the change again. A separate check before the transaction is not enough when consumers compete. External effects, such as provider charges, still need their own supported idempotency or status checks because the local transaction cannot include them automatically.',
    term: 'Idempotency key', definition: 'A stable key for one intended business operation, reused when that operation is retried. Scope it to the right caller and action, reject incompatible input under the same key, and keep enough evidence for as long as old attempts may return.',
  },
  {
    prompt: 'A malformed message repeatedly fails validation. What should happen before replaying it from the DLQ?',
    options: ['Replay the whole queue without checking results', 'Delete all operation identities', 'Fix the cause and check validity, prior effects, and replay scope', 'Wait for the DLQ to repair the payload automatically'], correct: 2,
    explanation: 'The DLQ keeps failed work out of normal processing, but it does not repair it. Inspect the reason, fix the cause, and check whether the effect already happened or the command is now expired or replaced by newer state. Keep the business identity for unchanged intent. Start with a small authorized replay, monitor actual results, and stop if failures return rather than resending the whole queue blindly.',
    term: 'Dead-letter queue', definition: 'A destination for messages taken out of normal processing under a failure policy. Assign an owner to inspect causes, manage retention, repair eligible work, and control replay. It is not an automatic retry scheduler or a backup of every business record.',
  },
  {
    prompt: 'An order is saved, but the process crashes before sending its event. Which pattern keeps a saved record that the event still needs to be sent?',
    options: ['Transactional outbox', 'A longer cache TTL', 'A client-side loading spinner', 'Sending before the transaction without coordination'], correct: 0,
    explanation: 'Save the order and a record saying its event must be sent in one local transaction. A relay can then find that record after a crash and send it. If sending succeeds but recording dispatch fails, the relay may send again, so consumers must handle duplicates safely. The outbox protects outgoing intent from being forgotten. It does not make every service in the order workflow part of one global transaction.',
    term: 'Saga', definition: 'A saved business workflow made of local transactions and explicit recovery steps across participants. A compensation, such as a refund, is another business action with its own result and failure possibilities. It is not a local rollback of all earlier external effects.',
  },
  {
    prompt: 'Two scheduler instances both find that the same account needs its monthly invoice. What prevents two jobs being accepted for that same bill?',
    options: ['Different thread names', 'Both machines having accurate clocks', 'A boolean stored inside one process', 'A stable account-and-period key, with uniqueness enforced in storage and safe job claiming'], correct: 3,
    explanation: 'The bill for one account and one period is a single business occurrence, even if several schedulers discover it or a worker tries again. Give it that stable identity and enforce uniqueness when saving accepted work. Claiming and output handling must also recover safely after a crash. Accurate clocks alone do not provide this protection. Define the business time zone, missed-run handling, and cancellation behavior separately.',
    term: 'Reconciliation', definition: 'Comparing the official desired or recorded state with what is observed, then taking controlled action to resolve a difference. Repairs may run again, so they must be safe to repeat. Late reports must not replace newer accepted state with an older result.',
  },
  {
    prompt: 'A partner API keeps failing. Which mechanism can pause calls and later allow a few trial calls to check whether it has recovered?',
    options: ['A larger DNS TTL', 'A circuit breaker', 'An unbounded retry loop', 'A unique database index'], correct: 1,
    explanation: 'A circuit breaker allows normal calls while closed, temporarily stops them while open, and later permits a few trial calls while half-open. This reduces repeated pressure on an unhealthy dependency. It does not fix the partner or store your unfinished business work. Accepted operations still need saved state and a recovery policy so they can resume safely when the dependency becomes usable.',
    term: 'Backpressure', definition: 'A way for a slower stage to make the stage sending it work slow down too. Match incoming work to capacity using appropriate buffers and concurrency limits. If work cannot be accepted safely, reject or delay it clearly rather than silently losing it.',
  },
  {
    prompt: 'The queue is empty, but a user says the result never arrived. What is the strongest next evidence?',
    options: ['Assume the user is wrong', 'Only the broker\'s CPU graph', 'The official saved operation status and evidence from each delivery step', 'The number of application servers'], correct: 2,
    explanation: 'An empty queue can mean messages finished, but it can also mean they expired, went to the wrong destination, or were acknowledged before the required work was saved. Follow the saved operation from acceptance through dispatch, processing, and the provider result. Compare logs and traces with official business status. Report only the strongest delivery outcome supported by that evidence, and keep unresolved results visible.',
    term: 'SLI and SLO', definition: 'An SLI measures a clearly defined service behavior, such as the share of eligible requests completed within a time limit. An SLO sets the target over a stated period. Define what counts and what completion means before quoting a success percentage.',
  },
  {
    prompt: 'A valid token identifies tenant A. The request asks for tenant B\'s invoice. What must the service do?',
    options: ['Check permission for the requested invoice, even though the token is valid', 'Return it because the caller authenticated', 'Rely only on CORS', 'Trust whichever tenant ID is in the route'], correct: 0,
    explanation: 'A valid token tells the service which identity is calling, after all required token checks. It does not give that identity permission to read every invoice. Check the allowed tenant and the requested resource before returning data. The same rule applies to cached responses, file links, and background results. A tenant ID supplied in the URL is input to validate, not proof of ownership.',
    term: 'Least privilege', definition: 'Give an identity only the actions and resources its job needs. A message consumer usually does not need broker administration rights. Separate worker, publisher, operator, and administrator permissions, and plan how credentials are rotated and revoked when access changes.',
  },
  {
    prompt: 'A rolling release removes a field while old consumers and queued messages still depend on it. What is the safer approach?',
    options: ['Assume all clients update immediately', 'Delete retained messages without review', 'Only increase the deployment timeout', 'Expand-and-contract with a compatibility and migration plan'], correct: 3,
    explanation: 'Old and new code can run together during a rollout, and queued messages may last much longer than the release that created them. First add compatible structures, then move readers and writers and migrate existing data. Remove old forms only when supported participants no longer need them. Plan recovery separately: putting yesterday\'s binary back does not automatically reverse a destructive data change or an external effect.',
    term: 'Canary deployment', definition: 'Send a controlled portion of representative traffic to a new release before expanding it. Compare technical and business outcomes, then continue or recover based on evidence. A canary can miss a defect if it never receives the affected client version or workload.',
  },
  {
    prompt: 'An API has low CPU usage but requests wait a long time. Which explanation is still plausible?',
    options: ['The system must have spare capacity everywhere', 'I/O, locks, or connection-pool exhaustion', 'CPU is the only possible bottleneck', 'A new programming language always fixes it'], correct: 1,
    explanation: 'A request can spend most of its time waiting rather than using CPU. It may be waiting for a database connection, a lock, storage, or another service. Follow a trace and inspect the relevant resource measurements before changing unrelated code. Compare a healthy period with the slow one. Choose a small check that can show whether the suspected waiting point is actually causing the delay.',
    term: 'Resource saturation', definition: 'A resource becomes fully busy and cannot keep up with demand. The limit may be CPU, memory, disk, connections, locks, or an external service quota. More incoming work then creates waiting or rejection, even when other resources still appear mostly idle.',
  },
  {
    prompt: 'Payment succeeds but order confirmation is unresolved. What should the workflow preserve?',
    options: ['Only a generic failed flag', 'No record until every service succeeds', 'Saved payment identity, an accurate unresolved status, and a way to recover', 'A new payment on the next click'], correct: 2,
    explanation: 'Record that payment succeeded and that order confirmation is still unresolved instead of replacing both facts with a generic failed flag. Compare the provider result with the saved order state and continue or recover the workflow according to the business rules. If compensation is needed, track it as a new operation that may also fail. A delayed or failed receipt email should not erase a valid paid order.',
    term: 'Business invariant', definition: 'A rule that must always stay true, such as one accepted owner for a seat or one ledger effect for a payment identity. It determines which checks and changes must be protected together, including when several callers or retries act at once.',
  },
  {
    prompt: 'A chat client reconnects after losing its WebSocket. What recovers missed messages?',
    options: ['Saved history the user may read, with message IDs and a position to resume from', 'The fact that the old socket was connected yesterday', 'A presence flag alone', 'Opening more sockets without reading saved history'], correct: 0,
    explanation: 'The WebSocket carries live traffic, but it does not store the messages missed while the device was disconnected. Read the permitted saved history from a known resume position and use message IDs to handle overlaps or repeated delivery safely. Check access on history reads as well as live sends. A connected presence flag, server acceptance, device delivery, and a read receipt each describe a different outcome.',
    term: 'Source of truth vs. projection', definition: 'The source of truth holds the official accepted facts. A projection is a view built from them, such as search, analytics, or a cache. It needs rules for update delay, deletions, and rebuilding, and should not silently replace official business checks.',
  },
  {
    prompt: 'What makes a system-design answer easier to justify than simply listing products?',
    options: ['Drawing as many services as possible', 'Promising every guarantee at no cost', 'Using one memorized topology for every problem', 'Connecting requirements, mechanisms, failure behavior, and tradeoffs'], correct: 3,
    explanation: 'Start with the user\'s needs and the business rule that must stay true. Estimate a realistic workload, follow a normal operation, then introduce a specific failure and explain the result. Show why each component helps, what it costs, and what it does not guarantee. Be clear about assumptions and unverified product behavior. A small complete design with this reasoning is stronger than a large diagram of unexplained names.',
    term: 'A design you can justify', definition: 'A design you can explain from its requirements: why each part exists, what success means, where its limits are, and how it recovers after failure. Product names support that explanation; they do not replace the reasoning or evidence behind it.',
  },
]

export const questions: Question[] = [...items.map((question, index) => ({ ...question, id: `q${index + 1}`, chapter: index + 1 })), ...extendedQuestions]