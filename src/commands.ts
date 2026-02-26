import { Command, Editor, EditorChange, Notice, MarkdownView } from 'obsidian'
import { MyPluginInterface } from "./types.d"
import { getHeadings, getHeadingLine, getBranchIndex, getParentIndex, getPreviousBranchIndex, getBranchEndIndex } from "./util"
import { Heading } from 'mdast' 

const HeadingRegex = /^#(#{0,5})?\s+/
const TableRowRegex = /^\s*\|(\s+.*\s+\|)+\s*$/

export const addHeading = (plugin: MyPluginInterface): Command => ({
    id: 'add-heading',
    name: 'Add heading',
    // hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
    editorCallback: (editor: Editor) => {
        const cursor = editor.getCursor()
        const headings = getHeadings(editor.getValue())
        const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
        if (currentBranchStartIndex < 0)
            return
        headings[currentBranchStartIndex].depth
        const currentBranchDepth = headings[currentBranchStartIndex].depth
        if (cursor.line === headings[currentBranchStartIndex].position!.start.line - 1 && cursor.ch <= currentBranchDepth + 1) {
            editor.replaceRange(("#".repeat(currentBranchDepth) + " \n"),
                    { line: cursor.line, ch: 0 })
                    editor.setCursor(cursor.line, currentBranchDepth + 1)
        } else {
            const currentBranchEndIndex = getBranchEndIndex(headings, currentBranchStartIndex)
            let currentBranchEndLine: number
            if (currentBranchEndIndex >= 0) {
                currentBranchEndLine = getHeadingLine(headings[currentBranchEndIndex])
                editor.replaceRange(("#".repeat(currentBranchDepth) + " \n"),
                        { line: currentBranchEndLine, ch: 0 })
            } else {
                currentBranchEndLine = editor.lineCount()
                editor.replaceRange(("\n" + "#".repeat(currentBranchDepth) + " "),
                        { line: currentBranchEndLine, ch: 0 })
            }
            editor.setCursor(currentBranchEndLine)
            }
    }
})

export const gotoPreviousBranch = (plugin: MyPluginInterface): Command => ({
    id: 'goto-previous-branch',
    name: 'Goto previous branch',
    // hotkeys: [{ modifiers: ["Alt"], key: "ArrowUp" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                let index = getBranchIndex(headings, cursor.line)
                if (index < 0)
                    return
                let line = getHeadingLine(headings[index])
                let ch = cursor.ch
                if (line === cursor.line) {
                    ch -= headings[index].depth + 1
                    index = getPreviousBranchIndex(headings, index)
                    if (index < 0)
                        return
                }
                line = getHeadingLine(headings[index])
                editor.setCursor(line, Math.min(Math.max(0, ch + headings[index].depth + 1), editor.getLine(line).length))
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-row-before')
        //     }
        }
        return false
    }
})

export const gotoNextBranch = (plugin: MyPluginInterface): Command => ({
    id: 'goto-next-branch',
    name: 'Goto next branch',
    // hotkeys: [{ modifiers: ["Alt"], key: "ArrowDown" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                let index = getBranchIndex(headings, cursor.line)
                let line: number
                let ch = cursor.ch
                if (headings.length === 0)
                    return
                if (index < 0)
                    index = 0
                else {
                    line = getHeadingLine(headings[index])
                    if (line !== cursor.line) {
                        index ++
                        if (index === headings.length)
                            return
                    } else {
                        ch -= headings[index].depth + 1
                        index = getBranchEndIndex(headings, index)
                        if (index < 0)
                            return
                    }
                }
                line = getHeadingLine(headings[index])
                editor.setCursor(line, Math.min(Math.max(0, ch + headings[index].depth + 1), editor.getLine(line).length))
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-row-after')
        //     }
        }
        return false
    }
})

export const gotoParentHeading = (plugin: MyPluginInterface): Command => ({
    id: 'goto-parent-heading',
    name: 'Goto parent heading',
    // hotkeys: [{ modifiers: ["Alt"], key: "Home" }],
    editorCallback: (editor: Editor) => {
        const cursor = editor.getCursor()
        const headings = getHeadings(editor.getValue())
        let index = getBranchIndex(headings, cursor.line)
        if (index < 0)
            return
        let ch = cursor.ch
        let line = getHeadingLine(headings[index])
        if (line === cursor.line) {
            ch -= headings[index].depth + 1
            index = getParentIndex(headings, index)
            if (index < 0)
                return
            line = getHeadingLine(headings[index])
        }
        editor.setCursor(line, Math.min(Math.max(0, ch + headings[index].depth + 1), editor.getLine(line).length))
    }
})

const depthOfHeading = (match: RegExpExecArray) => (match[1]?.length ?? 0) + 1

export const demoteHeadingCommand = (plugin: MyPluginInterface): Command => ({
    id: 'demote-heading',
    name: 'Demote heading',
    // hotkeys: [{ modifiers: ["Alt"], key: "ArrowRight" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                if (depthOfHeading(match) >= 6) {
                    new Notice("Demoting heading would exceed maximum depth of 6!")
                    return false
                }
                editor.replaceRange("#", { line: cursor.line, ch: 0 })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-col-after')
        //     }
        }
        return false
    }
})

export const promoteHeadingCommand = (plugin: MyPluginInterface): Command => ({
    id: 'promote-heading',
    name: 'Promote heading',
    // hotkeys: [{ modifiers: ["Alt"], key: "ArrowLeft" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match && match[1]) {
            if (!checking) {
                editor.replaceRange("", { line: cursor.line, ch: 0 }, { line: cursor.line, ch: 1 })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-col-before')
        //     }
        }
        return false
    }
})

export const demoteBranchCommand = (plugin: MyPluginInterface): Command => ({
    id: 'demote-branch',
    name: 'Demote branch',
    // hotkeys: [{ modifiers: ["Alt", "Shift"], key: "ArrowRight" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const branchStartIndex = getBranchIndex(headings, cursor.line)
                const branchEndIndex = getBranchEndIndex(headings, branchStartIndex)
                const branchHeadings = headings.slice(branchStartIndex, branchEndIndex >= 0 ? branchEndIndex : undefined)
                if (Math.max(...branchHeadings.map(h => h.depth)) >= 6) {
                    new Notice("Demoting branch would exceed maximum depth of 6!")
                    return false // demoting level 6 headings would break them
                }
                let changes: EditorChange[] = []
                branchHeadings.forEach((heading: Heading) => {
                    changes.push({from: {line: getHeadingLine(heading), ch: 0}, text: "#"})
                })
                editor.transaction({
                    changes: changes
                })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-col-right')
        //     }
        }
        return false
    }
})

export const promoteBranchCommand = (plugin: MyPluginInterface): Command => ({
    id: 'promote-branch',
    name: 'Promote branch',
    // hotkeys: [{ modifiers: ["Alt", "Shift"], key: "ArrowLeft" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const branchStartIndex = getBranchIndex(headings, cursor.line)
                if (headings[branchStartIndex].depth < 2) {
                    new Notice("Cannot promote branch of depth 1!")
                    return false
                }
                const branchEndIndex = getBranchEndIndex(headings, branchStartIndex)
                const branchHeadings = headings.slice(branchStartIndex, branchEndIndex >= 0 ? branchEndIndex : undefined)
                let changes: EditorChange[] = []
                branchHeadings.forEach((heading: Heading) => {
                    changes.push({from: {line: getHeadingLine(heading), ch: 0},
                                  to: {line: getHeadingLine(heading), ch: 1},
                                  text: "", })
                })
                editor.transaction({
                    changes: changes
                })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-col-left')
        //     }
        }
        return false
    }
})

export const moveBranchUpCommand = (plugin: MyPluginInterface): Command => ({
    id: 'move-branch-up',
    name: 'Move branch up',
    // hotkeys: [{ modifiers: ["Alt", "Shift"], key: "ArrowUp" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
                const previousBranchStartIndex = getPreviousBranchIndex(headings, currentBranchStartIndex)
                if (previousBranchStartIndex <0 ||
                        headings[previousBranchStartIndex].depth !== headings[currentBranchStartIndex].depth) {
                    new Notice("Branch has no previous sibling!")
                    return false
                }
                const currentBranchEndIndex = getBranchEndIndex(headings, currentBranchStartIndex)
                const currentBranchStartLine = getHeadingLine(headings[currentBranchStartIndex])
                const currentBranchEndLine = currentBranchEndIndex >= 0 ? getHeadingLine(headings[currentBranchEndIndex]) : editor.lineCount()
                const previousBranchStartLine = getHeadingLine(headings[previousBranchStartIndex])
                let branchText = editor.getRange({line: currentBranchStartLine, ch: 0}, {line: currentBranchEndLine, ch: 0})
                if (!branchText.endsWith("\n"))
                    branchText = branchText.concat("\n")
                let changes: EditorChange[] = [
                    {from: {line: currentBranchStartLine, ch: 0}, to: {line: currentBranchEndLine, ch: 0}, text: ""},
                    {from: {line: previousBranchStartLine, ch: 0}, text: branchText},
                ]
                editor.transaction({
                    changes: changes,
                    selection: {from: {line: previousBranchStartLine, ch: cursor.ch}}
                })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-row-up')
        //     } else {
        //         return (plugin.app as any).commands.executeCommandById('editor:swap-line-up')
        //     }
        }
        return false
    }
})

export const moveBranchDownCommand = (plugin: MyPluginInterface): Command => ({
    id: 'move-branch-down',
    name: 'Move branch down',
    // hotkeys: [{ modifiers: ["Alt", "Shift"], key: "ArrowDown" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
                const nextBranchStartIndex = getBranchEndIndex(headings, currentBranchStartIndex)
                if (nextBranchStartIndex < 0 || headings[nextBranchStartIndex].depth !== headings[currentBranchStartIndex].depth) {
                    new Notice("Branch has no next sibling!")
                    return false
                }
                const nextBranchEndIndex = getBranchEndIndex(headings, nextBranchStartIndex)
                const currentBranchStartLine = getHeadingLine(headings[currentBranchStartIndex])
                const nextBranchStartLine = getHeadingLine(headings[nextBranchStartIndex])
                let nextBranchEndLine = nextBranchEndIndex >= 0 ? getHeadingLine(headings[nextBranchEndIndex]) : editor.lineCount()
                let branchText = editor.getRange({line: nextBranchStartLine, ch: 0}, {line: nextBranchEndLine, ch: 0})
                let newCursorLine = currentBranchStartLine - nextBranchStartLine + nextBranchEndLine
                if (!branchText.endsWith("\n")) {
                    branchText = branchText.concat("\n")
                    newCursorLine++
                }
                let changes: EditorChange[] = [
                    {from: {line: nextBranchStartLine, ch: 0}, to: {line: nextBranchEndLine, ch: 0}, text: ""},
                    {from: {line: currentBranchStartLine, ch: 0}, text: branchText},
                ]
                editor.transaction({
                    changes: changes,
                    // selection: {from: {line: newCursorLine, ch: cursor.ch}}
                })
            }
            return true
        // } else {
        //     if (lineText.match(TableRowRegex)) {
        //         return (plugin.app as any).commands.executeCommandById('editor:table-row-down')
        //     } else {
        //         return (plugin.app as any).commands.executeCommandById('editor:swap-line-down')
        //     }
        }
        return false
    }
})

export const copyBranchCommand = (plugin: MyPluginInterface): Command => ({
    id: 'copy-branch',
    name: 'Copy branch',
    // hotkeys: [{ modifiers: ["Alt"], key: "C" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
                const currentBranchEndIndex = getBranchEndIndex(headings, currentBranchStartIndex)
                const currentBranchStartLine = getHeadingLine(headings[currentBranchStartIndex])
                const currentBranchEndLine = currentBranchEndIndex >= 0 ? getHeadingLine(headings[currentBranchEndIndex]) : editor.lineCount()
                let branchText = editor.getRange({line: currentBranchStartLine, ch: 0}, {line: currentBranchEndLine, ch: 0})
                if (!branchText.endsWith("\n")) {
                    branchText = branchText.concat("\n")
                }
                navigator.clipboard.writeText(branchText)
                new Notice("Copied branch to clipboard.")
            }
            return true
        }
        return false
    }
})

export const cutBranchCommand = (plugin: MyPluginInterface): Command => ({
    id: 'cut-branch',
    name: 'Cut branch',
    // hotkeys: [{ modifiers: ["Alt"], key: "X" }],
    editorCheckCallback: (checking: boolean, editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        if (match) {
            if (!checking) {
                const headings = getHeadings(editor.getValue())
                const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
                const currentBranchEndIndex = getBranchEndIndex(headings, currentBranchStartIndex)
                const currentBranchStartLine = getHeadingLine(headings[currentBranchStartIndex])
                const currentBranchEndLine = currentBranchEndIndex >= 0 ? getHeadingLine(headings[currentBranchEndIndex]) : editor.lineCount()
                let branchText = editor.getRange({line: currentBranchStartLine, ch: 0}, {line: currentBranchEndLine, ch: 0})
                if (!branchText.endsWith("\n")) {
                    branchText = branchText.concat("\n")
                }
                navigator.clipboard.writeText(branchText)
                editor.replaceRange("", {line: currentBranchStartLine, ch: 0}, {line: currentBranchEndLine, ch: 0})
            }
            return true
        }
        return false
    }
})

export const pasteBranchCommand = (plugin: MyPluginInterface): Command => ({
    id: 'paste-branch',
    name: 'Paste branch',
    // hotkeys: [{ modifiers: ["Alt"], key: "V" }],
    editorCallback: (editor: Editor) => {
        const cursor = editor.getCursor()
        const lineText = editor.getLine(cursor.line)
        const match = HeadingRegex.exec(lineText)
        const headings = getHeadings(editor.getValue())
        const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
        const depth = currentBranchStartIndex >= 0 ? headings[currentBranchStartIndex].depth : 1
        navigator.clipboard.readText().then((clipboardText: string) => {
            let branchText = clipboardText
            const match = HeadingRegex.exec(branchText)
            if (!match) {
                new Notice("No branch on clipboard!")
                return
            }
            const headings = getHeadings(branchText)
            const depthOffset = depth - headings[0].depth
            if (Math.max(...headings.map((h: Heading) => h.depth)) + depthOffset > 6) {
                new Notice("Pasting here would exceed maximum heading depth of 6!")
                return
            }
            editor.setCursor({line: cursor.line, ch: Math.max(1, cursor.ch)})
            editor.transaction({
                changes: [{from: {line: cursor.line, ch: 0}, text: branchText}],
            })
            let changes: EditorChange[] = []
            if (depthOffset > 0) {
                let insert = "#".repeat(depthOffset)
                headings.forEach((heading: Heading) => {
                    changes.push({from: {line: cursor.line + getHeadingLine(heading), ch: 0}, text: insert})
                })
            } else if (depthOffset < 0) {
                headings.slice().reverse().forEach((heading: Heading) => {
                    let l = cursor.line + getHeadingLine(heading)
                    changes.push({from: {line: l, ch: 0}, to: {line: l, ch: -depthOffset}, text: ""})
                })
            }
            editor.transaction({
                changes: changes,
            })
            editor.setCursor({line: editor.getCursor().line, ch: cursor.ch})
        })
    }
})

export const toggleFolding = (plugin: MyPluginInterface): Command => ({
    id: 'toggle-folding',
    name: 'Toggle folding',
    // hotkeys: [{ modifiers: ["Alt", "Shift"], key: "Key226" }],
    editorCallback: (editor: Editor, view: MarkdownView) => {
        const cursor = editor.getCursor()
        const headings = getHeadings(editor.getValue())
        const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
        if (currentBranchStartIndex < 0)
            return
        const heading = headings[currentBranchStartIndex]
        const line = getHeadingLine(heading)
        editor.setCursor(line, heading.depth + 1)
        const existingFolds = view.currentMode.getFoldInfo()?.folds ?? []
        if (existingFolds.some((fold) => fold.from === line)) {
            // Unfold
            view.currentMode.applyFoldInfo({
                folds: existingFolds.filter((fold) => fold.from !== line),
                lines: view.editor.lineCount(),
            })
        } else {
            // Fold
            const foldPositions = [
                ...existingFolds,
                ...headings.filter((h: Heading)=> getHeadingLine(h) === line)
                        .map((h: Heading) => ({
                            from: getHeadingLine(h),
                            to: getHeadingLine(h) + 1,
                        })),
            ];
            view.currentMode.applyFoldInfo({
                folds: foldPositions,
                lines: view.editor.lineCount(),
            })
        }
    }
})

export const focusFolding = (plugin: MyPluginInterface): Command => ({
    id: 'focus-folding',
    name: 'Focus folding',
    // hotkeys: [{ modifiers: ["Alt"], key: "Key226" }],
    editorCallback: (editor: Editor, view: MarkdownView) => {
        const cursor = editor.getCursor()
        const headings = getHeadings(editor.getValue())
        const currentBranchStartIndex = getBranchIndex(headings, cursor.line)
        if (currentBranchStartIndex < 0)
            return
        const heading = headings[currentBranchStartIndex]
        // editor.setCursor(getHeadingLine(heading), heading.depth + 1)
        const existingFolds = view.currentMode.getFoldInfo()?.folds ?? []
        let focusHeadings: Heading[] = []
        if (currentBranchStartIndex >= 0) {
            focusHeadings.push(headings[currentBranchStartIndex])
            let depth = focusHeadings[0].depth
            for (let index = currentBranchStartIndex - 1; index >= 0; index--) {
                const heading = headings[index]
                if (heading.depth < depth) {
                    focusHeadings.push(heading)
                    depth = heading.depth
                }
            }
        }
        const focusHeadingMdastLines = new Set(focusHeadings.map((h: Heading) => getHeadingLine(h)))
        const foldPositions = [
            ...headings.filter((h: Heading) =>!focusHeadingMdastLines.has(getHeadingLine(h)))
                    .map((h: Heading) => ({from: getHeadingLine(h), to: getHeadingLine(h) + 1})),
        ];
        view.currentMode.applyFoldInfo({
            folds: foldPositions,
            lines: view.editor.lineCount(),
        })
        editor.scrollIntoView(
            {
                from: editor.getCursor('from'),
                to: editor.getCursor('to')
            },
            true
        );
    }
})
