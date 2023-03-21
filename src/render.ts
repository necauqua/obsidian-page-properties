import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { Range, Extension } from '@codemirror/state'
import PagePropsPlugin from './main'


const fieldName = /([\p{L}\p{Extended_Pictographic}][0-9\p{L}\p{Extended_Pictographic}\s_/-]*)/u

function decoratedRegex(dec: string): RegExp {
    return new RegExp(`(^\\s*)${dec}${fieldName.source}${dec}(::\\s*)(.*)$`, 'u')
}

const regex = decoratedRegex('')
const specialRegex1 = decoratedRegex('\\*\\*')
const specialRegex2 = decoratedRegex('\\*')
const specialRegex3 = decoratedRegex('`')
const specialRegex4 = decoratedRegex('_')

interface ParsedField {
    prespace: string,
    field: string,
    fieldLen: number,
    separator: string,
    content: string,
}

export function parseField(line: string): ParsedField | null {
    let res = regex.exec(line)

    // wtf is this lol
    let extraLen = 0
    if (!res) {
        extraLen = 4;
        res = specialRegex1.exec(line)
        if (!res) {
            extraLen = 2;
            res = specialRegex2.exec(line)
            if (!res) {
                res = specialRegex3.exec(line)
                if (!res) {
                    res = specialRegex4.exec(line)
                    if (!res) {
                        return null
                    }
                }
            }
        }
    }
    const [, prespace, field, separator, content] = res
    return {
        prespace,
        field,
        fieldLen: field.length + extraLen,
        separator,
        content,
     }
}

function render(plugin: PagePropsPlugin, field: string, separator: string, content: Node[], fieldNode?: Node): HTMLElement {
    const span = createSpan()

    const text = fieldNode ? undefined : field
    const fieldEl = plugin.settings.fieldsAreInnerLinks ?
        createEl('a', {
            cls: `internal-link page-prop page-prop--${field} page-prop-field`,
            text,
            href: field,
            attr: { 'data-href': field, spellcheck: 'false', target: '_blank', rel: 'noopener' },
            parent: span,
        }) :
        createSpan({
            cls: `page-prop page-prop--${field} page-prop-field`,
            text,
            attr: { spellcheck: 'false' },
            parent: span,
        })

    if (fieldNode) {
        fieldEl.appendChild(fieldNode)
    }

    createSpan({
        cls: `page-prop page-prop--${field} page-prop-separator`,
        text: separator,
        attr: { spellcheck: 'false' },
        parent: span,
    })
    if (content.length == 1 && content[0].nodeType == Node.TEXT_NODE) {
        const pattern = plugin.autolinkPatterns[field]
        if (pattern) {
            const text = content[0].textContent || ''
            createEl('a', {
                cls: `external-link page-prop page-prop--${field} page-prop-content`,
                text,
                href: pattern.format(encodeURI(text)),
                attr: { spellcheck: 'false' },
                parent: span,
            })
            return span
        }
    }
    const holder = createSpan({
        cls: `page-prop page-prop--${field} page-prop-content`,
        attr: { spellcheck: 'false' },
        parent: span,
    })
    for (const node of content) {
        holder.appendChild(node)
    }
    return span
}

export function createMarkdownPostProcessor(plugin: PagePropsPlugin): (el: HTMLElement) => void {
    return el => {
        if (el.childElementCount != 1) {
            return
        }
        const p = el.firstChild
        if (!p || p.nodeName != 'P') {
            return
        }
        const nodes = p.childNodes

        const lines: Node[][] = []
        let currentLine: Node[] = []

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            if (node.nodeName == 'BR') {
                lines.push(currentLine)
                currentLine = []
            } else if (node.nodeType != Node.TEXT_NODE || node.textContent != '\n') {
                currentLine.push(node)
            }
        }
        lines.push(currentLine)

        for (const lineNodes of lines) {
            if (lineNodes.length == 0) {
                continue
            }
            const [first] = lineNodes

            // the common case
            if (first.nodeType == Node.TEXT_NODE) {
                const res = parseField(first.textContent || '')
                if (!res) {
                    continue
                }
                const { prespace, field, separator, content: contentTextPart } = res
                if (contentTextPart.length == 0 && lineNodes.length == 1) {
                    continue
                }

                if (prespace.length != 0) {
                    p.insertBefore(document.createTextNode(prespace), first)
                }
                if (!plugin.settings.hideInReaderMode.contains(field)) {
                    const contentNodes = [document.createTextNode(contentTextPart), ...lineNodes.slice(1)]
                    p.insertBefore(render(plugin, field, separator, contentNodes), first)
                }

                p.removeChild(first)
                continue
            }

            // less common case, we allow the key to be (fully) bold, italic or monospace:
            if (lineNodes.length == 1) {
                continue
            }
            // next node must be at least "::"
            const [, second] = lineNodes
            if (second.nodeType != Node.TEXT_NODE) {
                continue
            }

            let preContent = second.textContent || ''
            if (!preContent.startsWith('::')) {
                continue
            }
            preContent = preContent.substring(2)

            // meh, extract the field I guess
            const res = parseField((first.textContent || '') + '::')
            if (!res) {
                continue
            }
            const { prespace, field, separator } = res
            if (preContent.trim().length == 0 && lineNodes.length == 2) {
                continue
            }

            if (prespace.length != 0) {
                p.insertBefore(document.createTextNode(prespace), first)
            }
            if (!plugin.settings.hideInReaderMode.contains(field)) {
                const contentNodes = preContent.length != 0 ?
                    [document.createTextNode(preContent), ...lineNodes.slice(2)] :
                    lineNodes.slice(2)
                const rendered = render(plugin, field, separator, contentNodes, first)
                p.insertBefore(rendered, second)
            }
            p.removeChild(second)
        }
    }
}

function decorate(plugin: PagePropsPlugin, view: EditorView): DecorationSet {
    const { doc } = view.state

    const widgets: Range<Decoration>[] = []

    for (const { from, to } of view.visibleRanges) {
        for (let i = doc.lineAt(from).number; i <= doc.lineAt(to).number; i++) {
            const line = doc.line(i)

            if (line.text.trim().length == 0) {
                continue
            }

            const res = parseField(line.text)
            if (!res) {
                continue
            }
            const { prespace, field, fieldLen, separator, content } = res

            if (content.length == 0) {
                continue
            }

            const nameStart = line.from + prespace.length
            const nameEnd = nameStart + fieldLen
            const contentStart = nameEnd + separator.length
            const contentEnd = line.to

            let extraClass = ''
            if (plugin.settings.hideInReaderMode.contains(field)) {
                extraClass = ' page-prop-hidden'
            }

            if (plugin.settings.fieldsAreInnerLinks) {
                widgets.push(Decoration.mark({
                    tagName: 'a',
                    class: `internal-link page-prop${extraClass} page-prop--${field} page-prop-field`,
                    attributes: {
                        href: field,
                        spellcheck: 'false',
                        draggable: 'true'
                    },
                }).range(nameStart, nameEnd))
            } else {
                widgets.push(Decoration.mark({
                    class: `page-prop${extraClass} page-prop--${field} page-prop-field`,
                    attributes: { spellcheck: 'false' },
                }).range(nameStart, nameEnd))
            }

            widgets.push(Decoration.mark({
                class: `page-prop${extraClass} page-prop--${field} page-prop-separator`,
                attributes: { spellcheck: 'false' },
            }).range(nameEnd, contentStart))

            const cls = `page-prop${extraClass} page-prop--${field} page-prop-content`

            const pattern = plugin.autolinkPatterns[field]
            if (pattern) {
                const href = pattern.format(encodeURI(content))
                widgets.push(Decoration.mark({
                    tagName: 'a',
                    class: `external-link page-prop page-prop--${field} page-prop-content`,
                    attributes: { href, spellcheck: 'false' },
                }).range(contentStart, contentEnd))
            } else {
                widgets.push(Decoration.mark({
                    class: cls,
                    attributes: { spellcheck: 'false' },
                }).range(contentStart, contentEnd))
            }
        }
    }
    return Decoration.set(widgets)
}

export function createViewPlugin(plugin: PagePropsPlugin): Extension {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet

        constructor(view: EditorView) {
            this.decorations = decorate(plugin, view)
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = decorate(plugin, update.view)
            }
        }
    }, { decorations: v => v.decorations })
}
