// sentenceend.js -- a name that already ends in a full stop ("Broadcom Inc.") must not get a second one when it closes a sentence.
export const endSentence = (label) => { const s = String(label ?? ''); return /\.$/.test(s) ? s : s + '.'; };
