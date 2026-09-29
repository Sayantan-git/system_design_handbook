# System Design Studio

A standalone, static study website built from the complete System Design handbook. This folder is independent of the surrounding Menu Manager application. No API, database, account, token, or cloud configuration is required to read it.

## Local Review

Use Node.js 22.12 or newer. Node 22 is also configured in the GitHub workflow.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4185 --strictPort
```

Open <http://127.0.0.1:4185/>. If that port is occupied, choose another unused port. Browser storage belongs to the exact origin, so changing hostname or port creates a separate local progress store.

The standalone source ZIP is prepared for transfer after local review. Extract it into its own folder before uploading or using Git. No GitHub repository, commit, push, or public deployment has been created on your behalf. See [HOSTING.md](HOSTING.md) for publishing instructions.

## Included Experience

- Two primary sections: **System Design**, with 170 named topics in fifteen categories and five learning stages, and **Other Topics**, with seven supporting topics and 65 individually linked subtopics.
- 242 guided lesson entries with explanatory paragraphs, key-point bullets, three-step walkthroughs, worked scenarios, tradeoffs, and memorable takeaways. Each lesson includes one short reasoning paragraph after its steps to explain an important mechanism or practical consequence without substantially increasing its length. Comparison tables cover HTTP/HTTPS and other commonly confused concepts. All 32 complete chapters, mathematics, and 58 architecture diagrams remain available in **Full reference**.
- Stable hierarchical labels such as **1.1**, **1.2**, and **1.1.1**. The fifteen System Design categories are followed by **16. Other Topics**, whose seven topics run from **16.1** to **16.7** across both supporting groups. Deeper lessons and supporting reference headings continue as **16.1.1**, **16.1.2**, and so on. Existing chapter/heading identities are unchanged, preserving bookmarks, notes, diagram links, and saved answers.
- A topic-first catalog with stage and category selection, a **30 core concepts** filter, searchable expandable topic navigation, and a Chapters navigation mode. Every core concept opens a specific reading section. There are 25 linked real-life scenarios, including global routing, B+ Trees, quorums, cache refresh, consensus, fencing, IDs, commit recovery, mTLS, and a hybrid news feed.
- An animated request-flow view on the System Design page: browser to DNS, secure edge, gateway, load balancer, application, cache/database, and back to the user. Separate read, CDN-hit, and write/background paths include brief stage explanations and direct topic links.
- Detailed explanations in easier English across the handbook, glossary, practice feedback, and flashcards. Technical terms are explained in context; the material is not an abridged summary.
- Each full-reference chapter retains its key points and interview catch, including the question, common trap, stronger answer, and follow-up.
- Named topic links inside each chapter, chapter navigation, full-text concept search, section links, reading position, and previous/next navigation.
- Browser-local completed chapters, bookmarks, notes, theme, and reading size. Dark mode is the default for fresh sessions; an explicitly saved light or dark preference is preserved.
- A daily completion heat map with a thirteen-week sidebar preview, yearly calendar, day details, and streaks. Dated chapter activity is included in backups and optional account sync.
- A separate eight-week **Tracker** with 56 daily checkboxes, links covering all 242 existing project lessons, weekly revision, an optional start date, and an in-app **Study Report**. Checked days and the start date are saved in this browser when signed out, or in the active Google account's sync workspace when signed in.
- 58 scenario questions with detailed feedback and 58 concept flashcards. All prior question identities and chapter-card progress are preserved; new topic cards have independent saved identities.
- Separate System Design and Other Topics roadmaps, with the twelve-week reading plan retained as an additional reference.
- All 103 verified playlist references, a searchable video index, and the source/roadmap coverage notes.
- Interactive diagrams with inline and expanded pan/zoom controls, touch gestures, keyboard navigation, component focus, connected-path highlighting, and clean SVG downloads. Code copying remains available. The full-guide download option has been removed; notes PDFs and progress exports remain.
- Data-flow playback on all 58 diagrams: moving packets, sender/receiver highlights, message and branch labels, play/pause, previous/next, restart, a step selector, a progress slider, and speed selection. Sequence diagrams follow message order; flowcharts and state diagrams tour their connections and transitions.
- A colorful six-panel **Visual lab** with stateful load-balancing, cache, queue, replication, rate-limiting, and WebSocket simulations. Each also appears alongside its corresponding lesson. Existing Mermaid diagrams have component colors, participant keys, and clickable activity history.
- A persistent **Ask Gemini** button on every page. Readers may connect their own API key, select an available text model, and ask questions with optional current-reading context. Keys and chat are held only in page memory.
- A separate **Interview** section with 100 practical scenario variants for each of 176 distinct main and supporting topics: 17,600 variants in total. Select multiple topics for shuffled MCQ revision, reveal answers without scoring, or browse the complete selected bank with explanations and lesson links.
- **My Notes**, directly above Ask Gemini: capture selected main-page text with its topic heading, edit or delete passages, and download a locally generated, paginated PDF that also includes chapter notes.
- Optional Google sign-in and private Firestore synchronization on Firebase's no-billing Spark plan. Account caches are separate from guest data and from other accounts.
- Export/import of personal progress and notes as a small JSON file.

Without Firebase configuration or sign-in, study data remains browser-local. Export study data from settings and import it on another device to merge progress manually. Imported notes and answers replace matching identities; unrelated entries remain. With Firebase configured, sign in to the same Google account to sync its study data. **Copy guest data** explicitly adds the current browser's guest data to that account. Signing out restores the separate guest workspace. Browser clearing, private browsing, storage restrictions, or a different origin can affect persistence. Keep an export for important notes.

Video links open YouTube; no videos are embedded or downloaded. Fonts, icons, Markdown/math rendering, and Mermaid are bundled locally. External reference links require an Internet connection. The website is a static hosted application, not an installed offline/PWA application.

## Topic Navigation

The System Design page opens on **Visual lab**. The **Topics** tab retains the learning path: Foundations, Build and scale, Distributed systems, Production readiness, and Apply the concepts. Stage, category, search, and **30 core concepts** filters work together. Topic numbers remain stable when filtering. The sidebar follows the active section, includes expandable Other Topics subtopics, and has a **Collapse all** control beside Topics/Chapters. Catalog completion still belongs to the original chapters; the eight-week tracker records its own daily checkboxes.

The naming and coverage reference [AlgoMaster's 30 Must-Know System Design Concepts](https://algomaster.io/learn/system-design/top-30-system-design-concepts) and the [GeeksforGeeks System Design Tutorial](https://www.geeksforgeeks.org/system-design/system-design-tutorial/). Lessons use original explanations and scenarios. The full handbook and its topic index remain intact as reference material, with tests checking catalog coverage and source links.

The public [AlgoMaster system-design index](https://algomaster.io/learn/system-design) and [course introduction](https://algomaster.io/learn/system-design/course-introduction) inform the learning order, practical depth, and visual-learning approach. The lesson explanations, scenarios, and comparison wording in this project are original. Premium lessons were not accessed or copied, and the project does not claim to reproduce their contents.

Topic links open **Lesson** by default. Each lesson explains the idea in paragraphs, separates key points into bullets, walks through the mechanism in numbered steps, and develops a practical scenario. Decision guidance, a short takeaway, and a check for understanding connect the mechanism to its limits. Reading-time estimates use the actual expanded text rather than a fixed one-minute label. **Full reference** retains the original chapter, formulas, and additional exercises. Diagrams from the selected source section remain alongside the lesson; introductory topics may link to diagrams in their subtopics.

Side-by-side comparison tables cover HTTP vs HTTPS, TCP vs UDP, HTTP versions, REST vs GraphQL, polling/SSE/WebSockets, vertical vs horizontal scaling, SQL/NoSQL models, sharding vs replication, cache strategies, VMs vs containers, authentication vs authorization, and other relevant distinctions. Tables include semantic headings and horizontal scrolling on narrow screens. They explain limitations rather than assigning universal speed, consistency, or security guarantees to a product category.

The sticky bar, outline, search results, interview links, and captured notes keep the selected topic identity. Topics sharing one old heading still have distinct lesson routes. Existing source heading IDs and saved study data are unchanged. Optional Gemini reading context includes the expanded lesson and comparison text within the existing request-size limit; no provider request is needed to read the material.

Other Topics uses the same fuller format for memory and storage, data structures, concurrency, application architecture, cloud platforms, testing and releases, and Linux diagnosis. Its 65 subtopic lessons supplement the seven topic overviews. Tests require substantive explanations, practical scenarios, bullet points, and walkthroughs for all 242 lesson entries. The original 176-topic interview bank stays unchanged; the supporting subtopics do not create new saved question IDs. No paid generation or summarization service is used.

## Completion Activity

The sidebar shows daily **chapter** completions, not page visits or MCQ attempts. Each chapter counts once per local calendar day. Undoing a completion removes today's entry; older activity remains. Completing the chapter again on another day records that day's revision. Existing completed chapters have no historical timestamps, so the app does not invent dates for them.

Select a day or the calendar icon for the yearly view, chapter links, totals, active days, and longest streak. Arrow keys move through calendar cells; the date input supports direct selection. The current streak remains active when yesterday was completed but today is not yet complete. Future days are disabled. The calendar refreshes across midnight and when returning to the page.

History is validated, deduplicated during imports, included in study-data exports, and synced in separate per-day records when Google sync is configured. Independent chapter completions on the same day merge; undo and account reset use the existing deletion-marker protocol. The heat map requires no additional cloud service or paid plan.

## Eight-Week Study Tracker

Open **Tracker** for a 56-day plan made only from the lessons already in this project, including **16. Other Topics**. Each week has six learning days and one revision day. The 48 learning days cover all 242 lesson entries once; revision days revisit that week's material without adding to the lesson count. Each day has numbered lesson links, a short understanding or revision task, and a checkbox. This is an intensive suggested schedule, not a promise of mastery in eight weeks.

Choose an optional start date or **Start today** to assign scheduled dates. Dates identify pending, today, upcoming, and overdue days; they are not recorded study times or actual completion timestamps. You can finish ahead, uncheck a day, or clear the schedule without deleting checked days. **Continue** opens the first unfinished day.

The **Study Report** stays inside the app. It shows overall completion, remaining days, lessons in checked learning days, revision totals, weekly progress, and all daily statuses with expandable topic links. Pending and completed filters narrow the daily list. Week and day links return to the plan. There is no report download control, and a checked day is self-reported progress, not verified mastery.

When signed out, checkbox changes and the start date are saved automatically in this browser and restored after reload on the same origin. When signed in with Google, they are saved to an account-specific local cache and synced to that account's Firestore records. Offline or failed sync keeps pending changes locally; check the account status before closing the browser. Real account sync requires the Firebase setup in [HOSTING.md](HOSTING.md).

Guest and account trackers stay separate. Use **Copy guest data** after signing in to add existing browser progress to the account; signing out restores the guest tracker. Days from different devices can merge, and unchecking a day syncs a deletion marker. Tracker state is also included in the existing study-data JSON backup and import. These checkboxes do not change completed chapters or the chapter-completion heat map.

## Visual Lab

The six simulations use compact cyan, mint, and amber panels with changing values and moving packets. Load balancing distributes eight requests among four servers. Cache-aside distinguishes hits, misses, database reads, and fills. The queue separates waiting, processing, and acknowledged work. Replication shows a stale replica read before convergence. The token bucket rejects its fourth request before refill. The WebSocket example completes the HTTP/1.1 upgrade before exchanging frames in both directions.

Play, pause, previous/next, reset, and speed controls are available on each panel. The page-level controls operate all six; off-screen or hidden panels pause. Expand a simulation for its full numbered timeline and select components by pointer or keyboard. Reduced motion disables autoplay and moving packets but retains manual steps. These deterministic examples illustrate specific behavior, not actual network performance or full distributed protocol implementations. Frame values show the outcome of the selected step; packet movement illustrates the corresponding transfer. The original 58 Mermaid diagrams and their Markdown/SVG downloads remain separate and intact.

## Ask Gemini

Use the fixed **Ask Gemini** button while reading or browsing any view. Enter a personal Gemini API key in the password field, select **Connect**, then choose a returned text model. The app discovers compatible models using Google's REST API rather than relying on a permanently hard-coded model name. The button remains accessible in expanded diagram dialogs in browsers supporting the Popover API.

Keys stay in this page's memory and are sent only in the `x-goog-api-key` header to `https://generativelanguage.googleapis.com`. They are not placed in URLs, saved to local/session storage, or included in progress exports. Reloading or disconnecting clears the key; disconnect also clears the conversation. Closing the panel keeps the conversation available while navigating the app. Stop cancels the browser request, but Google may still process or charge for work already received. Failed requests are retried only on request, not automatically.

**Include current reading** optionally attaches an excerpt of up to 10,000 characters, with its title shown in a preview. Questions and recent conversation are also sent to Google. Private notes, saved progress, and unrelated page contents are not automatically attached. Do not paste secrets or sensitive personal data into questions. Gemini's answers can be inaccurate; verify important claims against the handbook and primary sources. Rendered answers are sanitized and cannot load remote images or execute model-generated HTML/scripts.

This is an optional, bring-your-own-key integration for a static site, not a secure server-side credential vault. Scripts running on a trusted page and browser extensions can access credentials held in memory. Use a restricted personal key, monitor quotas and billing, and review [Google's API-key guidance](https://ai.google.dev/gemini-api/docs/api-key) and [data terms](https://ai.google.dev/gemini-api/terms). Never publish a shared organization key in this app. A managed production integration needs a backend proxy and appropriate secret management. Automated checks use mocked API responses; real model access, browser-origin restrictions, quotas, regional availability, and billing require verification with the reader's own account.

## Interview Revision

Select one or more topics and start a shuffled session. Each selected topic contributes exactly 100 stable questions. A session does not repeat an ID before exhausting its pool. Choose one of four options and check the answer, or reveal the answer without counting it as a scored attempt. Previous, next, and retry controls are available. Browse mode exposes every selected question in pages of ten, with searchable prompts and expandable answers. Topic selections and answers are saved; the active shuffled session starts afresh when the view is reopened.

The bank contains independently authored, topic-specific incident, corrective-action, limitation, verification, and misconception material. It combines this material with 20 interview angles and five operating contexts. These are **scenario variants**, not 17,600 independently human-reviewed or unrelated incidents. Repeated underlying decisions are intentional revision. The 170 main topics and seven supporting entries include one shared concurrency topic, producing 176 distinct selectable topics. No Gemini calls, paid generation service, or cloud question storage is involved. The original 58-question Practice bank remains separate, with its saved IDs unchanged.

## My Notes and PDF

Open **My Notes**, leave **Capture selected text** enabled, and select a passage in the main study view. The selection is added with its current topic heading. Close the panel or turn off capture to stop collecting selections. Identical saved selections are deduplicated. Notes can be edited or deleted, and their source links reopen the relevant chapter when available.

**Download PDF** creates an A4 document locally with grouped topic headings, selectable text, bundled fonts, margins, and page numbers. Existing chapter notes are included. No text or PDF is uploaded to a PDF service, and no Cloud Storage bucket is required. The PDF preserves text, not the original rich Markdown formatting, diagrams, or arbitrary Unicode glyphs unsupported by the bundled font. Up to 1,000 captured passages of 20,000 characters each are accepted, but browser storage can fill much earlier; keep exports and respond to storage warnings. The PDF library and fonts load when first requested, so an initial export needs the deployed assets to be reachable.

## Free Google Sync

See [HOSTING.md](HOSTING.md#optional-google-login-and-free-sync) for Firebase setup and the Spark quota table. No Firebase project, billing account, or live Google login has been created or configured by this code change. The app remains usable when configuration is absent.

Use a dedicated **Spark** project without attaching a billing account. Enable only Google Authentication and a default Firestore database for this feature. The app does not need Cloud Functions, phone/SMS authentication, Cloud Storage, or paid generation. The existing optional **Ask Gemini** integration has its own Google API quotas and possible charges; Spark does not make Gemini usage free. Leave Gemini disconnected for the entirely local interview and PDF workflows.

Sync includes captured and chapter notes, completion and daily activity, the eight-week tracker's start date and checked days, bookmarks, reading positions and preferences, practice progress, selected interview topics, and interview answers. It excludes Gemini keys, chat history, question-bank content, and PDF files. Auth uses browser-session persistence; account data is cached separately under the authenticated UID, and signing out does not silently copy it into the guest workspace. Account caches remain unencrypted on that device. On a shared computer, sign out and clear site data after exporting or completing sync.

Private records live under `users/{uid}/study/{recordId}`. Each passage and chapter note has its own record; interview answers are grouped by topic. Per-item timestamps preserve independent changes within a record. Deletion markers prevent an older offline device from restoring deleted content. Competing edits to the same item use last-write-wins, with a stable device tie-breaker; text is not collaboratively merged. Keep device clocks accurate and export before simultaneous editing or large imports. Deletion markers are retained without paid TTL cleanup. Account reset clears loaded study data and syncs those deletions; it is not Firebase account deletion.

Writes are debounced for eight seconds of inactivity, with at least fifteen seconds between automatic flushes and a maximum of fifty records per pass. **Sync now** requests an immediate flush; remaining work continues automatically. Initial connections and reconnects read stored records, transactions read records before writing them, and live changes consume read quota. Quotas are shared by all site users. Offline or quota failures retain pending changes locally and stop repeated writes until reconnection or **Retry sync**. Closing the tab before syncing requires signing in again on that same browser/origin to finish pending work.

The sync model and Firebase lifecycle have automated mocked tests for deletions, concurrent edits, in-flight writes, account switching, and quota errors. Live authentication, deployed security rules, authorized domains, and actual project quotas must be verified against the owner's configured Firebase project before public use.

## Request Flow

The **Request flow** tab retains the animated walkthrough. Switch between **Read data**, **CDN cache hit**, and **Write + async** to follow different paths. Play/pause, previous/next, restart, a step selector, a progress slider, and playback speed control the walkthrough. Select any component for its role and related concepts; each **View more** link opens the corresponding named concept. The browser Back button restores the current scenario and step within the same session.

Blue paths are requests, teal paths are responses, and amber paths are background work. The map distinguishes DNS lookups from the HTTP data path, cache misses from origin-free edge hits, and a committed order from later worker completion. The layout is illustrative, not a claim that every deployment needs all components or uses this exact gateway/balancer ordering. An outbox relay may run concurrently with the original response, and external side effects still require idempotency or reconciliation.

Security, recovery, and observability controls explain concerns that apply across several hops. Playback pauses when the walkthrough leaves the viewport or the document becomes hidden. With reduced motion enabled, automatic playback and packet movement are disabled while manual stepping and topic links remain available. Animation timing is for explanation, not simulated network latency.

## Diagram Controls

Each diagram has a **Data flow** panel. Play follows the arrows while naming the sender, receiver, and message or condition. Previous/next, restart, the step selector, and the slider work independently of automatic playback. Speed adjusts the pacing. Lost sequence messages fade before reaching their receiver, and a self-call stays with the same participant.

Sequence diagrams follow the message order in the drawing. A flowchart's **Connection tour** and a state diagram's **State transitions** visit arrows individually: alternative branches do not imply that one request executes every branch, and a state transition is not necessarily a network transfer. These are explanatory animations, not measured latency or executable protocol simulations.

Playback is available in both inline and expanded views. Only one chapter diagram plays at a time, and it pauses when its drawing leaves the viewport, the page becomes hidden, a component is inspected, or the view is closed. Reduced-motion preferences disable moving packets and autoplay while keeping manual stepping and highlights. SVG and Markdown downloads retain the original static diagrams without playback highlights or packets.

Flowcharts start with a complete overview. Select a component in the drawing or the menu below it to bring it into readable focus and highlight its direct connections. Choose **Overview** or use the fit icon to see the whole diagram again.

Use the hand control to enable dragging, wheel zoom, and touch pinch gestures. Turning it off restores normal scrolling over the diagram. Zooming in enables pan mode automatically; Ctrl/Cmd + wheel also zooms over a diagram. The expanded viewer starts in pan mode.

With the canvas focused, use `+` and `-` to zoom, arrow keys to pan, and `0` or `Home` to fit. Tab reaches the component buttons, Enter or Space selects one, and Escape clears a selection before closing the expanded view. SVG downloads always contain the complete diagram, without viewport transforms or selection dimming.

## Build and Validate

```sh
npm test
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4186 --strictPort
```

The output is in `dist/`. Serve that directory over HTTP(S); double-clicking its HTML file is not the supported runtime because the application uses JavaScript modules and dynamic imports.

Vite uses relative asset paths and the application uses hash-based chapter routes. That supports GitHub project pages such as `https://YOUR-NAME.github.io/YOUR-REPOSITORY/` without server rewrite rules or a hard-coded repository name.

The focused tests verify requested-topic coverage within the actual chapters, substantial new explanations and scenarios, complete chapter content, diagram counts, source links, all video references, study weeks, topic routes, section-local numbering, download integrity, detailed review content, stable saved-answer identities, and progress validation/merging. Browser review additionally checks the UI, persistence, mobile layout, and actual diagram labels. The book's infrastructure exercises are learning instructions, not production systems implemented by this website.

## GitHub Pages From Another Computer

Transfer only this project's contents, not the surrounding proprietary application repository. The source ZIP contains the application, handbook, assets, tests, lockfile, configuration, instructions, and `.github` workflow. It excludes dependencies, generated build output, Git history, local editor state, and personal browser exports. GitHub Actions installs dependencies and creates the production build.

1. Create a new repository with a `main` branch. A public repository is the simplest free GitHub Pages option, but its uploaded source and handbook will be public. Private-repository Pages availability depends on the account plan and organization policy; a private repository does not automatically make its Pages website private.
2. In **Settings > Pages**, choose **GitHub Actions** as the source.
3. Upload the extracted project contents to the repository root, including `.github/`. Do not upload just the ZIP or place the project inside an extra folder.
4. Open **Actions > Publish Study Studio** and wait for the build and deployment jobs to finish. If necessary, run the workflow manually on `main` after enabling Pages.
5. Open the Pages URL shown in **Settings > Pages** or in the completed deployment. Node.js is not needed on the upload computer because GitHub runs the build.

The complete browser-only walkthrough, required folder layout, troubleshooting, and progress-transfer steps are in [HOSTING.md](HOSTING.md).

The workflow has been prepared but cannot be verified against a real repository until the user chooses and configures one. It contains no credentials. GitHub provides its scoped workflow token during a run.

## Project Structure

```text
content/handbook.md         Complete standalone source book
src/book.ts                Markdown parsing, chapter index, and rendering
src/curriculum.ts          Named topic categories, core concepts, filters, scenarios, and reading numbers
src/guide-export.ts        Internal reference Markdown serialization with stable anchors
src/state.ts               Validated browser progress and import/merge
src/lesson-ideas.ts        Short concept introductions for the named topic catalog
src/lesson-guides.ts       Original explanations, bullets, steps, scenarios, and tradeoffs
src/lesson-comparisons.ts  Structured side-by-side concept comparison tables
src/supporting-lessons.ts  Introductions and expanded guides for supporting subtopics
src/lessons.ts             Hierarchical numbering, guided rendering, and topic routes
src/activity.ts            Local-date completion history, calendars, and streaks
src/activity-view.ts       Sidebar heat map and yearly completion details
src/study-tracker.ts       Eight-week project lesson schedule and report calculations
src/study-tracker-view.ts  Daily checkboxes, scheduled dates, and in-app study report
src/questions.ts           Chapter review questions and flashcards
src/extended-questions.ts  Additional review questions for the expanded system-design topics
src/app.ts                 Reader and learning interactions
src/diagrams.ts            Diagram gestures, component focus, exports, and cleanup
src/diagram-playback.ts    SVG connection, message, and state-transition playback
src/diagram-appearance.ts  Component colors and self-contained SVG styling
src/visual-labs.ts         Six deterministic simulation state sequences
src/visual-labs-view.ts    Compact interactive simulation panels and lifecycle
src/gemini-client.ts       Gemini model discovery and bounded text requests
src/gemini-chat.ts         Persistent personal-key chat and optional reading context
src/interview-cases.ts     Practical engineering material for each interview topic
src/interview.ts           Stable scenario variants and no-repeat session shuffling
src/interview-view.ts      Multi-topic MCQ revision and paginated question browsing
src/notebook.ts            Validated selected-text notes and topic grouping
src/notebook-view.ts       Selection capture, editing, and local PDF download
src/notes-pdf.ts           Lazy-loaded PDF generation and typography
src/sync-state.ts          Size-bounded per-item merges and deletion markers
src/cloud-sync.ts          Optional Google login and account-scoped Firestore sync
firestore.rules           Private per-account data access rules
.env.example              Optional public Firebase web configuration names
src/request-flow.ts        Request/response scenarios and verified topic references
src/request-flow-view.ts   Animated walkthrough, responsive map, and playback controls
src/studio.css             Responsive reading interface
src/*.test.ts              Focused content and persistence tests
.github/workflows/pages.yml GitHub Pages build/deployment
vite.config.ts             Relative static paths and test configuration
```

The content copy is intentionally inside the project so another computer does not need the parent workspace. To revise the book, edit `content/handbook.md`, then run tests and build. Keep stable heading identities because bookmarks, notes, and links use them. Source chapter numbers are stable internal references; `curriculum.ts` supplies the display numbering and `guide-export.ts` supplies the reorganized download. Do not renumber source headings merely to change reading labels.

The local math-plugin declaration maps TypeScript to a declaration-only interface because the installed plugin publishes its implementation as its type entry. Runtime code still comes from the package, while strict application checks remain enabled.

## Source and Publication Notes

The handbook includes a full source map and distinguishes verified public playlist titles from independently reviewed source material. It does not claim that all video transcripts were reviewed or that illustrative designs reproduce current private company implementations.

Before publishing, review the content and dependency terms for the intended repository. The site does not copy application configuration, connection strings, or source code from Menu Manager. Guest notes stay in the browser unless exported or explicitly copied to a signed-in account. Signed-in study data synchronizes to the configured private Firestore paths.