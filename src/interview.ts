import { slug } from './book'
import { otherTopicGroups, systemDesignGroups, type Topic } from './curriculum'
import { interviewCases, type InterviewCase } from './interview-cases'

export const questionsPerTopic = 100
export interface InterviewTopic extends Topic { id: string; group: string; groupId: string }
export interface InterviewQuestion { id: string; topicId: string; topic: string; chapter: number; number: number; angle: string; scenario: string; prompt: string; options: string[]; correct: number; explanation: string }
export interface InterviewAnswer { selected: number | null; revealed: boolean; updatedAt: number }

const topics = [...systemDesignGroups, ...otherTopicGroups].flatMap(group => group.topics.map(topic => ({ ...topic, id: `t${topic.chapter}-${slug(topic.title)}`, group: group.title, groupId: group.id })))
export const interviewTopics: InterviewTopic[] = [...new Map(topics.map(topic => [topic.id, topic])).values()]
const topicIds = new Set(interviewTopics.map(topic => topic.id))
const cases = new Map(Object.entries(interviewCases).map(([title, profile]) => [title.toLowerCase(), profile]))

const situations = [
  ['Peak traffic', 'A scheduled campaign triples request arrivals for thirty minutes. The team must preserve its accepted business contract while restoring useful throughput.'],
  ['Regional rollout', 'The service is being introduced in a second region with higher network delay and a staged rollout. Existing users must keep the same correctness guarantees.'],
  ['Large customer', 'A new enterprise customer creates much more work than a typical account. The team must support it without weakening other customers\' correctness or isolation.'],
  ['Recovery exercise', 'A controlled recovery exercise replaces instances while test clients continue working. The team must distinguish durable outcomes from temporary observations.'],
  ['Compatibility release', 'Old and new application versions will run together during a release. The team must retain compatible behavior through deployment and recovery.'],
] as const

const angles: { label: string; question: string; facet: 1 | 2 | 3 | 4 }[] = [
  { label: 'Incident response', question: 'Which response addresses the demonstrated problem most directly?', facet: 1 },
  { label: 'Design decision', question: 'Which decision should be recorded in the design review to address this incident?', facet: 1 },
  { label: 'First release', question: 'The team can deliver one focused correction before its next release. Which correction is the strongest choice?', facet: 1 },
  { label: 'Runbook action', question: 'Which action belongs in the runbook for this failure, rather than just treating its symptoms?', facet: 1 },
  { label: 'Service contract', question: 'A stakeholder asks what the technology can actually promise. Which limitation must the engineer explain?', facet: 2 },
  { label: 'Misleading evidence', question: 'The component-level checks are green. Which caveat prevents treating that as proof of end-to-end correctness?', facet: 2 },
  { label: 'Tradeoff discussion', question: 'Which statement should accompany the proposed fix so its guarantees are not overstated?', facet: 2 },
  { label: 'Capacity review', question: 'A proposal says extra infrastructure alone settles the issue. Which boundary still matters?', facet: 2 },
  { label: 'Acceptance test', question: 'Which verification would provide the most direct evidence that the relevant behavior is correct?', facet: 3 },
  { label: 'Regression test', question: 'Which check would best prevent this specific incident from returning after a refactor?', facet: 3 },
  { label: 'Release evidence', question: 'What evidence should the release owner request before approving the correction?', facet: 3 },
  { label: 'Failure exercise', question: 'Which controlled exercise is most likely to expose the weak assumption in this design?', facet: 3 },
  { label: 'Proposal review', question: 'Which proposed shortcut should be rejected because it relies on the wrong guarantee?', facet: 4 },
  { label: 'Incident prevention', question: 'Which change is most likely to preserve or worsen the underlying problem?', facet: 4 },
  { label: 'Dangerous assumption', question: 'Which assumption should the reviewer explicitly challenge before implementation?', facet: 4 },
  { label: 'Recovery risk', question: 'Which recovery instruction would be unsafe or unjustified for this incident?', facet: 4 },
  { label: 'Technical handoff', question: 'The implementation moves to another team. Which corrective responsibility must remain explicit?', facet: 1 },
  { label: 'Customer explanation', question: 'Which explanation is accurate when a customer asks why the component did not prevent this outcome?', facet: 2 },
  { label: 'Observability plan', question: 'The team wants evidence beyond successful logs. Which behavior should it deliberately exercise and inspect?', facet: 3 },
  { label: 'Interview follow-up', question: 'Which recommendation would fail a follow-up question about the actual failure boundary?', facet: 4 },
]

function optionsFor(profile: InterviewCase, facet: 1 | 2 | 3 | 4): string[] {
  if (facet === 1) return [profile[1], profile[4], 'Increase every application timeout and keep the existing correctness mechanism unchanged.', 'Roll out more replicas first and infer correctness from the higher request acceptance rate.']
  if (facet === 2) return [profile[2], 'A successful health probe proves the complete business operation and all its side effects are correct.', 'More replicas remove the need to define this operation\'s failure and ownership rules.', 'Once a retry eventually returns success, earlier uncertain outcomes no longer need investigation.']
  if (facet === 3) return [profile[3], 'Run only the happy-path unit tests with dependencies replaced by unconditional-success mocks.', 'Verify that the service starts and the dashboard contains no unhandled exceptions.', 'Measure average latency on a small warm dataset without introducing the reported failure.']
  return [profile[4], profile[1], profile[3], 'Document the exact assumptions and verify behavior at the boundary where the failure occurred.']
}

function hash(value: string): number {
  let result = 2166136261
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619)
  return result >>> 0
}

export function interviewQuestion(topicId: string, number: number): InterviewQuestion {
  const topic = interviewTopics.find(topic => topic.id === topicId)
  if (!topic || !Number.isInteger(number) || number < 1 || number > questionsPerTopic) throw new Error('Unknown interview question.')
  const profile = cases.get(topic.title.toLowerCase())
  if (!profile) throw new Error(`Missing interview material: ${topic.title}`)
  const situation = situations[Math.floor((number - 1) / angles.length)]
  const angle = angles[(number - 1) % angles.length]
  const id = `iv1:${topicId}:${number}`
  const options = optionsFor(profile, angle.facet)
  const correct = hash(id) % options.length
  const ordered = options.map((_, index) => options[(index - correct + options.length) % options.length])
  const explanation = angle.facet === 4
    ? `The selected shortcut is the proposal to reject: ${profile[4]} A better response is: ${profile[1]} The important boundary is that ${profile[2][0].toLowerCase() + profile[2].slice(1)} Verify the outcome rather than relying on a product label or a successful log: ${profile[3]} The workload context changes urgency and capacity, but does not remove that guarantee.`
    : `${profile[1]} ${profile[2]} The directly relevant verification is: ${profile[3]} The tempting shortcut, "${profile[4]}", does not address the stated failure. The other choices rely on proxy measurements or assume extra capacity can replace correctness. In this ${situation[0].toLowerCase()} scenario, keep the business contract explicit and judge the result at the affected boundary.`
  return { id, topicId, topic: topic.title, chapter: topic.chapter, number, angle: angle.label, scenario: situation[0], prompt: `${situation[1]}\n\nFocus: ${topic.title}. ${profile[0]}\n\n${angle.question}`, options: ordered, correct, explanation }
}

export function parseInterviewId(id: string): { topicId: string; number: number } | undefined {
  const match = /^iv1:([^:]+):(\d{1,3})$/.exec(id)
  if (!match || !topicIds.has(match[1])) return undefined
  const number = Number(match[2])
  return number >= 1 && number <= questionsPerTopic ? { topicId: match[1], number } : undefined
}

export function shuffledInterviewIds(selectedTopics: string[], random = Math.random): string[] {
  const result = [...new Set(selectedTopics)].filter(id => topicIds.has(id)).flatMap(id => Array.from({ length: questionsPerTopic }, (_, index) => `iv1:${id}:${index + 1}`))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export function validateInterviewAnswers(value: unknown): Record<string, InterviewAnswer> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, InterviewAnswer> = {}
  for (const [id, answer] of Object.entries(value)) {
    if (!parseInterviewId(id) || !answer || typeof answer !== 'object') continue
    const item = answer as Partial<InterviewAnswer>
    if (item.selected !== null && (!Number.isInteger(item.selected) || item.selected! < 0 || item.selected! > 3)) continue
    if (typeof item.revealed !== 'boolean' || !Number.isFinite(item.updatedAt) || item.updatedAt! < 0) continue
    result[id] = { selected: item.selected!, revealed: item.revealed, updatedAt: item.updatedAt! }
  }
  return result
}