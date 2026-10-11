// eventdomains.js -- the locked map from an 8-K event class to the domain(s) it speaks to. Moved out of the 8-K connector (edgar8ksignal.js, which
// re-exports it unchanged) so that pure engine code (admittedformation.js) can read it without importing a connector.
// Each event class maps to 1-2 domains. Multi-domain events emit one signal per domain.
export const EVENT_DOMAIN_MAP = {
  EXECUTIVE_CHANGE:      ['capital', 'labor'],
  BANKRUPTCY:            ['capital', 'ownership'],
  BANKRUPTCY_TRIGGER:    ['capital', 'ownership'],
  ACQUISITION:           ['capital', 'ownership'],
  DEBT_ISSUANCE:         ['capital'],
  EQUITY_OFFERING:       ['capital', 'ownership'],
  EARNINGS_ANNOUNCEMENT: ['capital'],
  DELISTING_NOTICE:      ['capital', 'ownership'],
  AUDITOR_CHANGE:        ['capital'],
  FINANCIAL_RESTATEMENT: ['capital'],
  MATERIAL_CONTRACT:     ['capital'],
  CHANGE_IN_CONTROL:     ['ownership', 'capital'],
  OPERATIONAL_SHUTDOWN:  ['labor', 'capital'],
  REGULATORY_ACTION:     ['technology', 'capital'],
  CONTRACT_TERMINATION:  ['capital'],
  CHARTER_AMENDMENT:     ['ownership'],
  SHAREHOLDER_VOTE:      ['ownership'],
  ASSET_IMPAIRMENT:      ['capital'],
  SECURITY_MODIFICATION: ['capital', 'ownership'],
  ABS_UPDATE:            ['capital'],
  MINE_SAFETY:           ['labor'],
  UNKNOWN_MATERIAL_EVENT:['capital'],
};
