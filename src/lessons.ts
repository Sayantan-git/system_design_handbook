import { escapeHtml, markdown, plainText, slug, type Book, type Entry } from './book'
import { displayChapterNumber, otherTopicGroups, resolveTopic, sectionForChapter, systemDesignGroups, type StudySection, type Topic } from './curriculum'
import { interviewCases } from './interview-cases'
import { lessonIdeas } from './lesson-ideas'
import { supportingLessonGuides, supportingLessonNotes } from './supporting-lessons'
import { lessonGuides, type LessonComparison } from './lesson-guides'
import { lessonComparisons } from './lesson-comparisons'

export interface NumberedTopic extends Topic { key: string; number: string; section: StudySection; groupId: string; parentKey?: string; materialTitle?: string }
export const otherTopicsSectionNumber = 16
export const learningTopics: NumberedTopic[] = (['system-design', 'other-topics'] as const).flatMap(section => {
  const groups = section === 'system-design' ? systemDesignGroups : otherTopicGroups
  let sectionTopicIndex = 0
  return groups.flatMap((group, groupIndex) => group.topics.map((topic, topicIndex) => {
    sectionTopicIndex += 1
    return { ...topic, key: `${section}:${group.id}:${slug(topic.title)}`, number: section === 'other-topics' ? `${otherTopicsSectionNumber}.${sectionTopicIndex}` : `${groupIndex + 1}.${topicIndex + 1}`, section, groupId: group.id }
  }))
})
const ideas = new Map(Object.entries(lessonIdeas).map(([title, idea]) => [title.toLowerCase(), idea]))
const profiles = new Map(Object.entries(interviewCases).map(([title, profile]) => [title.toLowerCase(), profile]))
const guides = new Map(Object.entries({ ...lessonGuides, ...supportingLessonGuides }).map(([title, guide]) => [title.toLowerCase(), guide]))
const comparisons = new Map(lessonComparisons.flatMap(comparison => comparison.topics.map(title => [title.toLowerCase(), comparison] as const)))

export function supportingSubtopics(book: Book): NumberedTopic[] {
  const excluded = new Set(['Key Points to Remember', 'Interview Catch', 'Practical understanding check', 'What to explain in an interview', 'A useful checkpoint', 'Explain it back', 'Practical checkpoint'])
  return learningTopics.filter(topic => topic.section === 'other-topics').flatMap(parent => {
    const { entry } = resolveTopic(book, parent)
    let topicIndex = 0
    let childIndex = 0
    return entry.headings.filter(heading => !excluded.has(heading.title) && heading.depth <= 4).map(heading => {
      if (heading.depth === 3) { topicIndex += 1; childIndex = 0 }
      else childIndex += 1
      const shared = learningTopics.find(topic => topic.section === 'system-design' && topic.chapter === parent.chapter && topic.heading === heading.title)
      return { ...parent, title: heading.title, heading: heading.title, coverage: shared?.coverage ?? supportingLessonNotes[heading.title]?.[0] ?? '', key: `${parent.key}:${slug(heading.title)}`, number: `${parent.number}.${topicIndex}${childIndex ? `.${childIndex}` : ''}`, parentKey: parent.key, materialTitle: shared?.title }
    })
  })
}

export function allLearningTopics(book: Book): NumberedTopic[] {
  const children = supportingSubtopics(book)
  return learningTopics.flatMap(topic => [topic, ...children.filter(child => child.parentKey === topic.key)])
}

export function numberedTopic(topic: Topic): NumberedTopic | undefined {
  return learningTopics.find(candidate => candidate.chapter === topic.chapter && candidate.title === topic.title && candidate.heading === topic.heading)
}

export function topicRoute(book: Book, topic: NumberedTopic, section?: string): string {
  const reading = resolveTopic(book, topic)
  const query = new URLSearchParams({ topic: topic.key })
  if (section ?? reading.section) query.set('section', (section ?? reading.section)!)
  return `#/read/${encodeURIComponent(reading.entry.id)}?${query.toString()}`
}

export function topicForReading(book: Book, entry: Entry, section?: string, key?: string): NumberedTopic | undefined {
  const topics = allLearningTopics(book)
  const explicit = topics.find(topic => topic.key === key && topic.chapter === entry.number)
  if (explicit) return explicit
  if (section) {
    const matching = topics.filter(topic => topic.chapter === entry.number && resolveTopic(book, topic).section === section)
    return matching.find(topic => topic.section === sectionForChapter(entry.number)) ?? matching[0]
  }
  return learningTopics.find(topic => topic.section === 'other-topics' && topic.chapter === entry.number) ?? learningTopics.find(topic => topic.chapter === entry.number)
}

export function topicLesson(topic: NumberedTopic) {
  const custom = topic.parentKey ? supportingLessonNotes[topic.heading ?? ''] : undefined
  if (custom) return { idea: custom[0], example: custom[1], mechanism: custom[2], caveat: custom[3], check: custom[4] }
  const title = (topic.materialTitle ?? topic.title).toLowerCase()
  const idea = ideas.get(title)
  const profile = profiles.get(title)
  if (!idea || !profile) throw new Error(`Missing lesson foundation: ${topic.title}`)
  return { idea, example: profile[0], mechanism: profile[1], caveat: profile[2], check: profile[3] }
}

export function topicGuide(topic: NumberedTopic) {
  const title = topic.title.toLowerCase()
  const sharedTitle = (topic.materialTitle ?? topic.title).toLowerCase()
  const guide = guides.get(title) ?? guides.get(sharedTitle)
  return guide ? { ...guide, comparison: guide.comparison ?? comparisons.get(title) ?? comparisons.get(sharedTitle) } : undefined
}

export function lessonText(topic: NumberedTopic): string {
  const lesson = topicLesson(topic)
  const guide = topicGuide(topic)
  return [...Object.values(lesson), ...(guide ? [guide.explanation, ...guide.keyPoints, ...guide.steps, ...(guide.reasoning ? [guide.reasoning] : []), guide.example, guide.decision, guide.remember, ...(guide.comparison ? [guide.comparison.title, ...guide.comparison.columns, ...guide.comparison.rows.flat(), guide.comparison.takeaway] : [])] : [])].join('\n\n')
}

export function renderLessonComparison(comparison: LessonComparison): string {
  return `<div class="table-scroll lesson-comparison" tabindex="0" role="region" aria-label="${escapeHtml(comparison.title)}"><table><caption>${escapeHtml(comparison.title)}</caption><thead><tr>${comparison.columns.map(column => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${comparison.rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="lesson-table-takeaway">${escapeHtml(comparison.takeaway)}</p>`
}

export function lessonTokens(book: Book, topic: NumberedTopic) {
  const { entry, section } = resolveTopic(book, topic)
  if (!section) return entry.tokens
  const start = entry.tokens.findIndex(token => token.type === 'heading' && plainText(token.tokens ?? []) === topic.heading)
  const heading = entry.tokens[start]
  const next = entry.tokens.findIndex((token, index) => index > start && token.type === 'heading' && heading.type === 'heading' && token.depth <= heading.depth)
  return entry.tokens.slice(start + 1, next < 0 ? undefined : next)
}

export function conciseLessonHtml(book: Book, topic: NumberedTopic): { html: string; words: number; diagrams: number } {
  const lesson = topicLesson(topic)
  const guide = topicGuide(topic)
  const reading = resolveTopic(book, topic)
  const tokens = lessonTokens(book, topic)
  const diagrams = topic.section === 'other-topics' && !topic.heading ? [] : tokens.filter(token => token.type === 'code' && token.lang === 'mermaid')
  const blocks = [['Concept', lesson.idea], ['Real-life example', lesson.example], ['How it works', lesson.mechanism], ['Watch out', lesson.caveat]]
  const number = escapeHtml(topic.number)
  const html = `<section class="concise-lesson" data-topic-heading="${number} ${escapeHtml(topic.title)}"><h3 class="concise-topic-title" id="${escapeHtml(reading.section ?? `lesson-${slug(topic.key)}`)}"><span class="heading-number">${number}</span> ${escapeHtml(topic.title)}</h3><div class="lesson-essentials">${blocks.map(([label, text], index) => `<section><h4 id="lesson-${slug(topic.key)}-${index + 1}"><span class="heading-number">${number}.${index + 1}</span> ${label}</h4><p>${escapeHtml(text)}</p>${guide ? index === 0 ? `<p>${escapeHtml(guide.explanation)}</p><ul class="lesson-key-points">${guide.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : index === 1 ? `<p>${escapeHtml(guide.example)}</p>` : index === 2 ? `<ol class="lesson-steps">${guide.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>${guide.reasoning ? `<p class="lesson-reasoning">${escapeHtml(guide.reasoning)}</p>` : ''}${guide.comparison ? renderLessonComparison(guide.comparison) : ''}` : `<p>${escapeHtml(guide.decision)}</p>` : ''}</section>`).join('')}</div>${guide ? `<p class="lesson-remember"><strong>Remember:</strong> ${escapeHtml(guide.remember)}</p>` : ''}<details class="lesson-check"><summary>Check your understanding</summary><p>${escapeHtml(lesson.check)}</p></details>${diagrams.length ? markdown.parser(diagrams) : ''}</section>`
  return { html, words: lessonText(topic).split(/\s+/).length, diagrams: diagrams.length }
}

export function referenceHeadings(book: Book, entry: Entry) {
  const prefix = learningTopics.find(topic => topic.section === 'other-topics' && topic.chapter === entry.number)?.number ?? displayChapterNumber(book, entry)
  const counters = [0, 0, 0, 0]
  return entry.headings.map(heading => {
    const depth = Math.max(0, Math.min(3, heading.depth - 3))
    counters[depth] += 1
    counters.fill(0, depth + 1)
    const number = [...(prefix === null ? [] : [prefix]), ...counters.slice(0, depth + 1)].join('.')
    return { ...heading, number }
  })
}