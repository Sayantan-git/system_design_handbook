# Host System Design Studio on GitHub Pages

Google login and Firestore study-data sync are implemented in this project. They are **not yet connected to your Firebase project**: the four local Firebase configuration values are absent, and the supplied environment file is an empty template. Uploading the source by itself publishes the study app, but does not enable Google login until you complete the Firebase and build-variable steps below.

The eight-week tracker saves checked days and the optional start date in the browser when signed out. With Google sign-in configured, it uses the active account's separate cache and Firestore sync, including changes from another device. **Copy guest data** explicitly adds browser progress to the account; signing out restores the guest tracker. The report remains an in-app view and needs no download service.

GitHub Pages hosts the website. Firebase Authentication signs users in. Cloud Firestore stores private per-account study records. No custom backend server, Firebase Hosting, Cloud Functions, Cloud Storage bucket, or shared Gemini key is needed.

GitHub Actions installs dependencies, runs tests, builds the app with your public Firebase configuration, and publishes the result. You do not need Node.js or a Firebase CLI on the computer used for the browser-only setup.

No repository has been created, no source has been pushed, and no Firebase project, rules, or indexes have been deployed on your behalf.

## Readiness Check: September 29, 2026

| Item | Local Status | Still Required in Your Account |
| --- | --- | --- |
| Google sign-in | Implemented with Firebase's Google popup flow | Enable the Google provider and authorize the site domain |
| Private study sync | Implemented with account-separated caches, merge handling, and deletion markers | Create the default Firestore database and publish its rules |
| Firebase web configuration | All four required values are currently absent | Add the exact values as GitHub repository variables |
| Security rules | Owner-UID checks and bounded record envelopes are supplied | Publish and verify them in your actual project |
| Index configuration | Unneeded indexing of the `payload` field is disabled in the supplied config | Apply the field exemption in the console or deploy the index file |
| GitHub Pages workflow | Present; builds on `main` and supports manual runs | Create/configure your repository and choose GitHub Actions as the Pages source |
| Source dependencies | Manifest matches the lockfile; required source/config files are present | Upload the current source and lockfile together |
| Automated release checks | 98 tests passed across 15 suites; production TypeScript/build passed | GitHub Actions will repeat the clean install, tests, and build |
| Dependency checks | `npm ci --dry-run` passed; production dependency audit reported zero known vulnerabilities | Keep the lockfile and monitor future advisories |
| Real Google login and cross-device sync | Cannot be verified without your configured project | Perform the launch checks below |

A cache-to-server readiness edge case was fixed during this audit, with a regression test. Sync now receives Firestore metadata-only updates, so a server-confirmed unchanged cached result can unblock pending writes. The Pages artifact action was updated to the currently documented version. Local environment files, ZIPs, and personal exports are excluded by Git ignore rules.

The production build still emits the known large-bundle warning for the complete study material and its libraries. It is not a failed build. The install check here was a dry run against the current lockfile, not a new clean installation; GitHub Actions performs `npm ci` on its clean runner.

The sync tests use mocked Firebase services. Java and the Firebase CLI are not installed in this environment, so the Firestore rules have **not** been executed in the local emulator. Source inspection and mocked tests are not proof that your deployed Firebase rules or OAuth settings work. Complete the Rules Playground and two-account checks before sharing the site publicly.

## Recommended First-Release Order

1. Export any important study data from the current local app before changing origins or accounts.
2. Prepare the current source using [Step 1](#1-prepare-the-current-source).
3. Create the GitHub repository and enable Pages using Steps 2 and 3.
4. Complete [Google Login and Free Sync](#optional-google-login-and-free-sync), including the four repository variables, **before uploading the application**.
5. Upload the source, deploy, and open the site using Steps 4 through 6.
6. Run [Verify Before Public Use](#verify-before-public-use), then import your personal study data into the correct account.

The handbook itself is public on GitHub Pages. Google login gives each user a private study workspace; it does **not** put the public lessons behind a login screen. Any eligible Google account can create its own workspace. An email allowlist or organization-only access policy is not implemented.

## 1. Prepare the Current Source

Use the current project files, not an older ZIP from before the lesson, heatmap, Firebase, or eight-week tracker changes. A release ZIP is only a transport package: extract it before uploading to GitHub. On Windows, use **Extract All** into a new, separate folder such as `Documents/system-design-studio-upload`.

Upload only the standalone app. Do not upload a surrounding company repository or unrelated personal files.

The extracted project root should contain:

```text
.github/
  workflows/
    pages.yml
.gitignore
content/
src/
HOSTING.md
README.md
index.html
package.json
package-lock.json
firebase.json
firestore.rules
firestore.indexes.json
.env.example
tsconfig.json
vite.config.ts
```

The `src/` folder includes the application assets and tests. An empty `public/` folder may not appear in the ZIP; Vite does not require an empty folder. `node_modules/` and `dist/` are intentionally excluded because GitHub recreates them during the build.

Keep `.env.example`, which contains empty variable names. Exclude `.env.local`, all other private environment files, service-account files, private keys, personal progress JSON, notes PDFs, editor settings, dependencies, build output, and the ZIP itself. Browser uploads do **not** apply `.gitignore`, so review the selected files yourself. Do not upload the whole working folder with `node_modules/` inside it.

The audited source set is below GitHub's browser limit of 100 files per upload, and its largest source file is well below the 25 MiB per-file limit. Generated dependencies and build artifacts are not part of this count.

## 2. Create or Choose the GitHub Repository

If this site already has a GitHub repository, use that repository and skip creating a second one. Confirm the destination and retain any remote changes that are not in this local source before replacing matching files. Do not overwrite an unrelated repository.

For a new repository, open <https://github.com/new> and sign in to your own account.

Choose a repository name, for example `system-design-studio`. For the simplest free GitHub Pages setup, choose **Public**. This makes the uploaded source and handbook public, so use a repository and account where publishing this material is appropriate.

Enable **Add a README file** so the repository has an initial branch, then create the repository. Confirm that the default branch is named `main`, which is the branch the included workflow builds. The supplied README can replace the initial README when you upload the project.

For an existing repository using another default branch, deliberately update the workflow's push branch or use `main` for this publication. If branch protection requires a pull request, upload on a new branch, review it, then merge into the publishing branch. A force push is not needed for browser upload.

Private-repository Pages support depends on your plan and organization policy. A private repository does not automatically make its Pages website private. Do not upload private notes, credentials, or unrelated company code to this repository.

## 3. Enable GitHub Pages

In the new repository, open **Settings > Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.

If this choice is unavailable, check that Pages is supported for the repository and that your organization permits it. Actions must also be enabled. The included workflow requests the Pages and identity-token permissions it needs; you should not add a personal token or any secrets to the project.

For this first release with Google login, leave this repository open and complete the Firebase setup and repository variables below before Step 4. You can configure variables while the repository still contains only its initial README.

## 4. Upload the extracted project

Open the repository's **Code** tab, choose **Add file > Upload files**, and upload the files and folders from inside the extracted project directory.

Include `.github/`, `src/`, `content/`, and all root files. On macOS, **Command+Shift+.** shows dot-prefixed files in Finder. On Windows, confirm that `.github` and `.gitignore` are included along with the other extracted items.

Upload the contents, not the outer extraction folder. Do not upload only the ZIP: GitHub Pages does not unpack a source ZIP and run it automatically.

Upload the original `content/handbook.md` file directly from the extracted folder. Do not copy text from a rendered Markdown preview, browser page, or exported document into this file. The app needs the original Markdown heading markers, links, tables, and code fences to find chapters and references. In GitHub's **Code** or **Raw** view of the file, its first line must be `# System Design Concepts: The Complete Study Guide`, and chapter headings must begin with `##`, such as `## 1. Thinking Like a System Designer`.

At the repository root, you must be able to see `package.json` directly. Open `.github/workflows/pages.yml` on GitHub to confirm that the workflow uploaded with its directory structure intact. If browser upload omits this file, use GitHub's **Add file > Create new file**, enter `.github/workflows/pages.yml` as the full filename, and use the workflow contents included in the extracted project.

Commit the upload to `main`. This commit starts the included workflow.

If the browser omits `.github/workflows/pages.yml`, create that path explicitly in GitHub's file editor using the supplied workflow. Windows File Explorer's **View > Show > Hidden items** can help reveal hidden entries. Confirm the workflow exists before waiting for an Actions run.

## 5. Wait for the deployment

Open the repository's **Actions** tab, then the workflow named **Publish Study Studio**. Its build job uses Node 22 and runs:

```sh
npm ci
npm test
npm run build
```

It uploads the generated `dist/` site and runs a separate Pages deployment job. Wait until both jobs succeed. A first deployment can take a few minutes.

This workflow deploys **only the website**. It does not publish Firestore rules or indexes. Do those separately in Firebase as described below. The application builds with Node 22; individual GitHub Actions may use a newer Node runtime internally, which is normal.

If you uploaded before enabling Pages, enable Pages first, then choose **Actions > Publish Study Studio > Run workflow**, select `main`, and run it again. The workflow supports manual runs as well as pushes to `main`.

## 6. Open the website

Use **Settings > Pages > Visit site**, or follow the URL in the successful deployment. For a project named `system-design-studio`, it will normally look like:

```text
https://YOUR-USERNAME.github.io/system-design-studio/
```

Use your actual account or organization name and repository name. The Vite build uses relative asset URLs and the app uses hash-based routes, so project subpaths do not need a hard-coded repository name. For this workflow, Pages should keep **GitHub Actions** as its source rather than being changed to branch-based deployment.

## Bring your progress and notes

The hosted website uses a different browser-storage origin from the local app. Your existing progress does not move automatically.

Before leaving the local app, open **Reading and progress settings > Export progress & notes**. On the hosted site, open the same settings and choose **Import progress & notes**, then select that export. Do not upload your progress JSON to the GitHub repository.

For cloud sync, sign in on the hosted site first and confirm the displayed Google email. Then import the JSON and press **Sync now**. Wait until there are no pending records before checking another device. Importing while signed out stores guest data; use **Copy guest data** later only when you deliberately want to merge that guest workspace into the displayed account.

The **Copy guest data** action reads the guest data at the current origin only. It cannot fetch data from your old local server. `localhost`, `127.0.0.1`, different ports, and your GitHub Pages host have separate browser stores. Export from whichever origin contains the notes you want to keep.

An import keeps existing completed chapters and bookmarks while merging the imported ones. Incoming notes, answers, and reading positions replace matching saved entries; unrelated entries remain. Guest data stays in that browser. With Google sync configured, imports made while signed in become part of that account and synchronize to its other signed-in devices.

Daily chapter-completion history is included in these exports and in configured account sync. Old exports without dates still import normally, but cannot populate past activity. Guided lesson content and topic numbering preserve chapter identities, so saved progress remains valid. The expanded paragraphs, bullet points, and comparison tables are bundled with the site and need no generation API. Notes PDF export remains available; the full-guide download control has been removed.

## Optional Google Login and Free Sync

The interview bank, study content, notebook, and PDF export do not require Firebase. To enable Google login and cross-device study data, the site owner must configure a Firebase project. The code does not contain a shared Firebase project or credentials.

### Keep It on Spark

Create a new, dedicated project at <https://console.firebase.google.com/> and keep the **Spark** plan. Do **not** attach a Cloud Billing account: doing so upgrades the project to Blaze. Do not enable paid add-ons, Cloud Functions, Cloud Storage for PDFs, phone/SMS sign-in, TTL deletion, point-in-time recovery, or backups for this feature. Analytics is unnecessary.

Published free Firestore quotas, checked September 2026:

| Resource | Spark Free Quota |
| --- | --- |
| Stored data | 1 GiB |
| Document reads | 50,000 per day |
| Document writes | 20,000 per day |
| Document deletes | 20,000 per day |
| Outbound data transfer | 10 GiB per month |
| Free database | One per project |
| Maximum document size | 1 MiB |

These quotas are shared across the whole project, not granted to each user. Daily Firestore quotas reset around midnight Pacific time. Spark restricts the affected service when its no-cost quota is exhausted rather than charging overage. The app retains pending changes locally and offers retry; it cannot increase or guarantee capacity. The app bounds its record payloads to 120 KB and stores notes separately to avoid the document limit.

Google sign-in is a no-charge authentication provider. If you separately upgrade Authentication to **Identity Platform**, its Spark Tier 1 limit is **3,000 daily active users**; do not confuse that with paid-plan monthly active-user allowances. Check the current [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Authentication limits](https://firebase.google.com/docs/auth/limits), and [plan behavior](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) before launch. No free-tier commitment overrides Google changes or your organization's policies.

The existing optional **Ask Gemini** button uses the reader's personal Gemini API account. It is separate from Spark and may incur charges under that account's settings. Interview questions and PDF notes make no Gemini requests.

### Configure the Project

1. Open <https://console.firebase.google.com/> and choose **Create a project** or **Add project**. Use a dedicated project for this app. Choose a name and record its **Project ID**; that ID is not necessarily the display name or GitHub repository name.
2. Leave Analytics and unrelated products disabled unless you independently need them. Confirm the project shows **Spark** and has no linked billing account. If a setup path requires a payment method or Blaze upgrade, stop and verify that you selected the services listed here.
3. Open **Project overview > Add app > Web** (the `</>` icon), or **Project settings > General > Your apps > Add app**. Give the web app a nickname and register it. Leave **Also set up Firebase Hosting** unchecked: this site uses GitHub Pages.
4. In the web app's **SDK setup and configuration**, select the configuration view and locate `apiKey`, `authDomain`, `projectId`, and `appId`. Keep the tab open for the build-variable mapping below. Firebase is already an npm dependency; do not paste another initialization script into the HTML or replace the existing application code.
5. Open **Authentication > Get started** if necessary. The console may group Authentication under **Security** or **Build**. Under **Sign-in method**, choose **Google**, enable it, choose the required support email, set an appropriate public-facing project name, and save. You do not need a GitHub OAuth App or additional Contacts/Drive scopes.
6. Under **Authentication > Settings > Authorized domains**, add your exact Pages hostname, for example `YOUR-USERNAME.github.io`. Do not include `https://`, a port, a slash, or the repository path. Keep Firebase's default authorized domains. If you later add a custom website domain, authorize that hostname too.
7. For local review only, also authorize `localhost` and/or `127.0.0.1`. New projects may not include localhost automatically. The authorized site hostname and the SDK `authDomain` are different settings: normally keep the SDK `authDomain` exactly as Firebase supplied it, such as `YOUR_PROJECT_ID.firebaseapp.com`.
8. Open **Firestore Database > Create database** (sometimes under **Databases & Storage** or **Build**). Choose **Standard edition** with Firestore's native APIs if prompted. Do not choose Realtime Database, Datastore mode, or MongoDB-compatible Enterprise setup for this app.
9. Use database ID **`(default)`**, select an appropriate region near the expected users, and choose **Production mode**. The location is an important long-term choice; review it before creating the database. The app calls the default database and does not configure a named database.
10. Open the database's **Rules** tab. Replace the starting deny-all rules with the complete supplied [firestore.rules](firestore.rules), then select **Publish**. Do not append a broad `allow read, write: if true` rule or leave test-mode access enabled. The supplied rules allow a user only their own `users/{uid}/study/*` records; all unmatched paths remain denied.
11. Open **Indexes > Single field** and create an exemption for collection ID/group **`study`**, field path **`payload`**. Disable automatic indexing for that field, including the available ascending, descending, and array options. This matches [firestore.indexes.json](firestore.indexes.json); the app does not query inside that opaque payload. Apply the configuration to this dedicated project's default database.
12. Complete **Build Configuration** below, then upload and build the website. The first actual study-data change creates its private records automatically. Do not manually create a sample user collection containing personal notes or secrets.

Publishing this complete rules file replaces the database's active rules, so do not use a project shared with another application unless you deliberately integrate its access policy first. The rules validate the record envelope and limit its size; the application validates the JSON payload contents. Direct document deletion is denied because note deletion and reset are synchronized through retained deletion markers.

Google popup sign-in is used by the app. Allow its popup in your browser. If Google's consent screen requires additional audience configuration, use the **Google Auth Platform** settings in the same project: a testing audience may require adding test users; an internal audience restricts access to its organization. Follow Google's publishing/verification prompts for your intended audience rather than bypassing them.

App Check is not integrated in this version. Do not turn on App Check enforcement and assume the current client is already configured for it; that would require a separate tested integration. Owner-only rules protect users from other users, but are not a global anti-abuse or usage-rate cap. A public user can consume their own permitted records and contribute to shared Spark usage limits.

### Optional Firebase CLI Route

The console steps above need no CLI installation. If you prefer CLI deployment, use Node 22.12 or newer and run the following yourself from this project directory. Complete authentication in the browser, never by placing credentials in source files or chat.

```sh
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only "firestore:rules,firestore:indexes" --project YOUR_FIREBASE_PROJECT_ID
```

Replace only `YOUR_FIREBASE_PROJECT_ID` with the real project ID. [firebase.json](firebase.json) already points to the supplied rule and index files; there is no need to run `firebase init` and risk overwriting the Vite project. The explicit `--project` selects the destination without requiring a `.firebaserc` file. This command does not create the database or enable Google for you, and it does not deploy the website.

### Build Configuration

For local development, create an uncommitted `.env.local` using the names in [.env.example](.env.example), with the public values from the Firebase Web app. Restart the Vite server after changing them.

For GitHub Pages, open **Repository Settings > Secrets and variables > Actions > Variables** and add these four **repository variables**:

| Repository Variable Name | Value From the Firebase Web App |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | The `apiKey` string |
| `VITE_FIREBASE_AUTH_DOMAIN` | The `authDomain` string, usually `YOUR_PROJECT_ID.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | The `projectId` string, not the numeric project number |
| `VITE_FIREBASE_APP_ID` | The complete `appId` string, including its colons |

Choose **New repository variable** for each row. Enter only the value, without JavaScript quotes, commas, backticks, or the surrounding `firebaseConfig` object. Use these exact case-sensitive names. Do not put them in the **Secrets** tab: the supplied workflow reads `vars.NAME`, not `secrets.NAME`. Repository variables also avoid accidentally placing values in a deployment environment that the separate build job does not use.

The supplied workflow passes them to the Vite build. They will be visible in the built JavaScript; Firestore security must depend on the authenticated UID and deployed rules, never on hiding these public values. Missing values leave Google sign-in disabled and preserve local-only use. After adding or changing variables, rerun **Publish Study Studio** because Vite embeds values at build time.

These are public Firebase client identifiers, not admin credentials. Never supply a Firebase service-account private key, Google client secret, personal access token, or Gemini key as one of these variables. Do not put configuration into [src/cloud-sync.ts](src/cloud-sync.ts) or change the `authDomain` to the GitHub hostname. Keep any API-key restrictions compatible with Firebase Authentication and Firestore; do not remove security controls blindly to resolve an error.

For local testing, the four values can also go into `.env.local`, using [.env.example](.env.example) as the naming reference. That local file is deliberately excluded from the upload package. Restart Vite to pick up changes. Local configuration does not automatically become a GitHub repository variable.

### Verify Before Public Use

1. Open the actual HTTPS GitHub Pages URL, then the account icon near the top-right. **Sign in with Google** must be enabled; a "not configured" message means the build did not receive all four variables.
2. Sign in and confirm the displayed email. In **Firebase Authentication > Users**, confirm that this account has been created. It is normal for Firestore to have no study documents until a study-data change is saved.
3. Add a small test note, bookmark a chapter, answer an interview question, and mark a chapter complete. In **Tracker**, check a day and set a start date. Press **Sync now** and wait for the pending-record count to reach zero. Automatic writes are debounced; large imports may require several passes.
4. In Firestore's data viewer, inspect `users / YOUR_AUTH_UID / study`. Records such as `preferences`, `progress`, `note-*`, `interview-*`, `activity-*`, or `study-tracker` appear according to the actions taken. The UID comes from Firebase Authentication, not the email address. Data uses a versioned `payload` string; the website remains the normal editor for it.
5. Open another browser or device and sign in to the **same Google account**. Confirm the note, bookmark, interview answer, completion activity, and tracker day/date appear. Edit the note and uncheck the tracker day on one device, then verify the changes and report totals on the other. Delete the test note and confirm it stays deleted after a reload.
6. Sign in as a **different Google account** and confirm the first account's notes, answers, and tracker progress do not appear. Signing in never automatically uploads or displays another account's local cache. A displayed guest note before sign-in is not evidence of a cloud leak: guest data and account data are separate workspaces.
7. While signed in, briefly go offline, edit a test note, and reconnect. Verify the pending state and eventual sync. If a quota or permission error pauses sync, use **Retry sync** only after resolving the cause. Pending changes stay in that account's local cache; sign in again on the same browser/origin to finish syncing after closing a tab.
8. Test popup sign-in in the desktop and mobile browsers you intend to support. Authentication uses tab/session persistence; a new session may require signing in again. Account caches remain on the device even after sign-out and are not encrypted.
9. Complete the rule checks below, review **Firestore > Usage**, and confirm the project still shows **Spark** with no billing account. Keep private notes and progress exports out of your public repository.
10. Before inviting users, explain that Google account identity and signed-in study data are handled by your configured Firebase project, and provide an appropriate privacy notice for your audience. The existing optional Gemini chat has a separate data and billing contract.

### Check the Firestore Rules

Use **Firestore > Rules > Rules Playground** if available, or the Firebase Emulator Suite on a machine with its prerequisites installed. Simulate these cases against the supplied rule logic. Use synthetic UIDs such as `alice` and `bob`; the path in the rules is `users/{uid}/study/{recordId}`.

| Simulation | Expected Result |
| --- | --- |
| No authentication; read `users/alice/study/progress` | Denied |
| Authenticated UID `bob`; read or write `users/alice/study/progress` | Denied |
| Authenticated UID `alice`; read/list only her `study` records | Allowed |
| UID `alice`; create/update her `study/release-check` with the valid envelope below | Allowed |
| UID `alice`; write version `2`, omit `payload`, use a non-string payload, or add an extra envelope field | Denied |
| Any client; read the top-level users collection or an unrelated path | Denied |
| UID `alice`; directly delete a study document | Denied; app deletion uses a marker update |

The valid simulated write data is:

```json
{ "version": 1, "payload": "{}" }
```

Also verify the size limit if your test tooling can generate a payload over 120,000 characters. These checks validate the access policy, not collaborative text merging or a substitute for the real two-account test. Do not create open rules to make a failing test pass. A console administrator can bypass client rules, so editing records as an administrator is not evidence that ordinary users have the correct permissions.

Live Google login and deployed rules cannot be verified until these project-specific steps are complete. Automated tests use mocked Firebase services; they are not a substitute for checking the deployed rules. Cached account data is not encrypted on the local device, and signing out retains unsynced changes in its account-specific cache. Keep an export and clear site data on shared computers after completing sync. Do not expose your study-data exports in the public repository.

## Local Release Checks

On Node.js 22.12 or newer, the normal release gates are:

```sh
npm ci
npm test
npm run check
npm run build
```

The build output is `dist/`. GitHub Actions performs a clean dependency installation and the tests/build automatically. Large-chunk warnings from the full handbook, diagrams, and lazy PDF library are not deployment failures. A successful local build does not verify GitHub permissions, Firebase configuration, OAuth audience, or deployed security rules.

On this Windows machine, the system Node version may be older. The already-used temporary toolchain is:

```powershell
npx --yes --package=node@22 --package=npm@10 --call "npm test"
npx --yes --package=node@22 --package=npm@10 --call "npm run check"
npx --yes --package=node@22 --package=npm@10 --call "npm run build"
```

There is no need to run these commands on the upload computer when using the browser-only GitHub Actions path.

## Updates and common problems

To publish an update, upload or commit the changed project files to `main`. The workflow rebuilds and redeploys the site. Keep the lockfile with dependency changes, and preserve source chapter IDs so existing notes and bookmarks still refer to the same content.

Rules and index changes must also be published to Firebase separately. Changing GitHub variables requires a new build, not merely refreshing an old page. Use the latest source archive when moving between computers; an older ZIP does not contain later local fixes.

- **No workflow appears:** confirm `.github/workflows/pages.yml` exists at the repository root, Actions is allowed, and the upload was committed to `main`.
- **A package file cannot be found:** the project is probably nested in an extra directory. `package.json` and the workflow must be in their expected root locations.
- **Handbook tests report zero chapters, zero videos, or undefined entries:** inspect `content/handbook.md` in GitHub's **Raw** view. Plain text copied from a rendered document loses the Markdown structure, so the parser cannot find the 32 chapters. In the repository's `content` folder, choose **Add file > Upload files** and upload the original local `handbook.md` to replace it. Commit the replacement to `main` and open the new workflow run. Re-running an old failed job uses the old commit and will not pick up the replacement. Keep the tests enabled; they prevent an empty or incomplete handbook from being published.
- **A Node.js 20 deprecation warning names checkout or setup-node:** upload the current `.github/workflows/pages.yml`, which uses `actions/checkout@v6` and `actions/setup-node@v6`. These actions use Node 24 internally, while the application still builds with Node 22. This warning is separate from a handbook test failure.
- **Pages deployment fails:** confirm **Settings > Pages > Source = GitHub Actions**, then inspect the first failed step in the workflow. Account, organization, or environment policies may require an administrator's approval.
- **The build reports large chunks:** the current app has a non-blocking size warning from its complete handbook and diagram libraries. A warning alone is not a failed build; inspect the job result.
- **The website shows 404:** confirm the deployment job succeeded and use the exact URL from Settings > Pages, including the repository segment. A source upload alone is not a completed deployment.
- **Local progress is missing online:** export from the original local origin and import on the hosted site, or explicitly copy guest data to a configured Google account and finish sync. GitHub Pages itself does not synchronize personal progress.
- **Google sign-in is not configured:** set all four Firebase repository variables and rebuild. For local use, set `.env.local` and restart Vite.
- **Variables were added but login remains disabled:** confirm they are repository **Variables**, not Secrets or environment-only values, use the exact names, and run a fresh build after saving them.
- **Google rejects the domain or popup:** authorize the exact hosting domain in Firebase and allow its sign-in popup. Do not include the repository path in an authorized domain.
- **Google reports access blocked or a testing restriction:** review the same project's Google Auth Platform audience and test-user settings. An internal app may reject personal Google accounts. Do not create unrelated OAuth clients to work around it.
- **Sync permission denied:** confirm the signed-in account and deploy the provided private rules to the same project used by the build. Never publish open rules as a workaround.
- **Login succeeds but no database exists:** create Cloud Firestore Standard edition with ID `(default)` and publish the rules; enabling Authentication does not create the database automatically.
- **Sync remains connecting after a reload:** use the current source package with the metadata-listener fix, inspect network access and project rules, and retry after restoring connectivity.
- **Sync breaks after enabling App Check enforcement:** this client does not yet integrate App Check. Restore the previous deliberate enforcement configuration or implement and test App Check before enabling it.
- **Quota exceeded:** keep Spark and wait for the relevant quota reset. Export pending local changes as a backup. Adding billing is not required for local study, interviews, or PDF export.
- **Opening the extracted HTML directly is blank:** this app uses JavaScript modules. Use GitHub Pages or the local Vite instructions in README.md instead of double-clicking the source HTML.

The workflow and application have been checked locally. Your actual GitHub deployment can be verified only after you create and configure the destination repository.

## Official Setup References

- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Cloud Firestore Standard edition setup](https://firebase.google.com/docs/firestore/quickstart)
- [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)
- [Firebase Spark and billing behavior](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub browser upload limits](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)