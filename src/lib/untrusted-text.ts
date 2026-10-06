/**
 * Text typed by someone else, made safe to show.
 *
 * A transfer memo, a display name, an on-chain label: whoever wrote it chose
 * every character, including the invisible ones. Bidirectional overrides and
 * isolates reorder what is drawn without changing what is stored, the "Trojan
 * Source" trick: a file name ending in `gnp.exe` behind a right-to-left
 * override displays as `exe.png`, and a name can be made to read as a
 * different name. Zero-width characters hide text, or make two strings that
 * look identical compare unequal. Control characters break layouts and logs.
 *
 * None of it carries meaning a reader needs, so it is removed rather than
 * escaped: C0 and C1 controls and DEL; the bidi embeddings and overrides
 * (U+202A to U+202E), isolates (U+2066 to U+2069) and marks (U+200E, U+200F,
 * U+061C); zero-width space, non-joiner and joiner (U+200B to U+200D), word
 * joiner (U+2060) and the byte-order mark (U+FEFF). Tabs and line breaks
 * become spaces and runs of spaces collapse, so a one-line field stays one
 * line.
 *
 * Display only. The stored value is what it is; this decides what is drawn.
 * The patterns are written as escapes on purpose: a source file that holds
 * the characters it strips is itself the attack it describes.
 */

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const LINE = /[\t\n\r]/g
const INVISIBLE = /[\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g

export function cleanUntrustedText(value: string): string {
  return value
    .replace(LINE, ' ')
    .replace(CONTROL, '')
    .replace(INVISIBLE, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}
