/* src/data/categoryMap.js */
/* WO-268 — Category Map                                              */
/* WO-294 — Keys aligned to real krylo-feed.html lens IDs            */
/* Lens IDs: PAPER_TRAIL | CONFIDENCE_GAP | SIGNAL_BREAK |           */
/*           WHO_BENEFITS | EVERYONE_KNOWS | SILENCE (fallback)      */

export const CATEGORY_MAP = {

  PAPER_TRAIL: {
    id:       'PAPER_TRAIL',
    keywords: ['filing', 'record', 'document', 'audit', 'evidence', 'report',
               'receipt', 'signed', 'stamped', 'legal', 'verified', 'logged'],
    bias:     'evidentiary',
    meaning:  'Signals grounded in hard artifacts — filed records, timestamped documents, verified trails that cannot be retroactively erased.',
    etymology: 'From the literal residue of bureaucracy: the paper left behind by every transaction, decision, and promise made in ink.',
  },

  CONFIDENCE_GAP: {
    id:       'CONFIDENCE_GAP',
    keywords: ['confidence', 'narrative', 'perception', 'trust', 'credibility',
               'stated', 'claimed', 'public', 'official', 'spin', 'gap', 'dissonance'],
    bias:     'perceptual',
    meaning:  'Signals that measure the distance between what is said publicly and what is known privately — where narrative and reality have separated.',
    etymology: 'From the forensic interval between the projected image and the underlying reality; the gap that widens as pressure increases.',
  },

  SIGNAL_BREAK: {
    id:       'SIGNAL_BREAK',
    keywords: ['shift', 'change', 'break', 'deviate', 'pivot', 'inflection',
               'reversal', 'trigger', 'anomaly', 'departure', 'sudden', 'unexpected'],
    bias:     'temporal',
    meaning:  'The moment a signal deviated from its baseline. Something changed — this category captures the when, not just the what.',
    etymology: 'From signal analysis: a break in an otherwise predictable waveform, indicating that the system\'s state has fundamentally shifted.',
  },

  WHO_BENEFITS: {
    id:       'WHO_BENEFITS',
    keywords: ['money', 'profit', 'gain', 'benefit', 'interest', 'financial',
               'capital', 'fund', 'investor', 'equity', 'motive', 'follow'],
    bias:     'incentive',
    meaning:  'Signals that follow resource flow and expose asymmetric incentives — who gains from this remaining unspoken or unresolved.',
    etymology: 'From the forensic principle "cui bono" — to whose benefit? The oldest analytical frame for uncovering hidden actors in any system.',
  },

  EVERYONE_KNOWS: {
    id:       'EVERYONE_KNOWS',
    keywords: ['culture', 'known', 'obvious', 'unspoken', 'silent', 'collective',
               'common', 'awareness', 'whisper', 'open secret', 'suppressed', 'room'],
    bias:     'collective',
    meaning:  'The signal that exists in collective awareness but has never been said aloud. Consensus without acknowledgment.',
    etymology: 'From the sociology of public secrets: the information that circulates through a system privately while being systematically denied publicly.',
  },

  SILENCE: {
    id:       'SILENCE',
    keywords: ['absence', 'gap', 'omission', 'redaction', 'void', 'unknown',
               'suppressed', 'missing', 'unaddressed', 'ignored'],
    bias:     'null',
    meaning:  'The signal carried by what is not said. In intelligence, the loudest transmission.',
    etymology: 'From Latin "silentium" — stillness; the diagnostic category for signals that exist only in the negative space of what was withheld.',
  },

};
