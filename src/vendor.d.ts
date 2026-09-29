import type { KatexOptions } from 'katex'
import type { MarkedExtension } from 'marked'
export default function markedKatex(options?: KatexOptions & { nonStandard?: boolean }): MarkedExtension