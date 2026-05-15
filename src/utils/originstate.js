// Shared origin-state resolution — primary key for all signal geography

export const US_STATE_NAMES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

export const CITY_TO_STATE = {
  'Chicago':       'Illinois',
  'Los Angeles':   'California',
  'Houston':       'Texas',
  'Phoenix':       'Arizona',
  'Philadelphia':  'Pennsylvania',
  'San Antonio':   'Texas',
  'Dallas':        'Texas',
  'San Francisco': 'California',
  'Miami':         'Florida',
  'Atlanta':       'Georgia',
  'Seattle':       'Washington',
  'Denver':        'Colorado',
  'Boston':        'Massachusetts',
  'Detroit':       'Michigan',
  'Nashville':     'Tennessee',
  'Austin':        'Texas',
  'Jacksonville':  'Florida',
  'Columbus':      'Ohio',
  'Indianapolis':  'Indiana',
  'Charlotte':     'North Carolina',
  'Minneapolis':   'Minnesota',
  'Portland':      'Oregon',
  'Las Vegas':     'Nevada',
  'Louisville':    'Kentucky',
  'Pittsburgh':    'Pennsylvania',
  'Tampa':         'Florida',
}

// Approximate geographic centroid (lat, lon) per state
export const STATE_CENTROIDS = {
  'Alabama':        [32.7, -86.7],
  'Alaska':         [64.2, -153.4],
  'Arizona':        [34.3, -111.1],
  'Arkansas':       [34.8, -92.2],
  'California':     [36.8, -119.4],
  'Colorado':       [38.9, -105.5],
  'Connecticut':    [41.6, -72.7],
  'Delaware':       [39.0, -75.5],
  'Florida':        [27.8, -81.5],
  'Georgia':        [32.7, -83.4],
  'Hawaii':         [20.3, -156.4],
  'Idaho':          [44.1, -114.5],
  'Illinois':       [40.0, -89.2],
  'Indiana':        [39.8, -86.2],
  'Iowa':           [42.0, -93.4],
  'Kansas':         [38.5, -98.4],
  'Kentucky':       [37.6, -84.7],
  'Louisiana':      [31.2, -91.8],
  'Maine':          [45.2, -69.0],
  'Maryland':       [39.1, -76.8],
  'Massachusetts':  [42.2, -71.5],
  'Michigan':       [43.3, -84.5],
  'Minnesota':      [46.3, -94.3],
  'Mississippi':    [32.7, -89.7],
  'Missouri':       [38.4, -92.5],
  'Montana':        [46.9, -110.5],
  'Nebraska':       [41.5, -99.9],
  'Nevada':         [39.3, -116.6],
  'New Hampshire':  [43.7, -71.6],
  'New Jersey':     [40.0, -74.5],
  'New Mexico':     [34.3, -106.0],
  'New York':       [42.9, -75.5],
  'North Carolina': [35.6, -79.4],
  'North Dakota':   [47.5, -100.5],
  'Ohio':           [40.4, -82.8],
  'Oklahoma':       [35.6, -96.9],
  'Oregon':         [44.0, -120.5],
  'Pennsylvania':   [40.6, -77.2],
  'Rhode Island':   [41.7, -71.5],
  'South Carolina': [33.8, -80.9],
  'South Dakota':   [44.4, -100.2],
  'Tennessee':      [35.8, -86.4],
  'Texas':          [31.0, -99.3],
  'Utah':           [39.3, -111.1],
  'Vermont':        [44.0, -72.7],
  'Virginia':       [37.8, -78.2],
  'Washington':     [47.4, -120.4],
  'West Virginia':  [38.9, -80.5],
  'Wisconsin':      [44.5, -89.8],
  'Wyoming':        [43.0, -107.5],
}

export function extractOriginState(text) {
  if (!text) return null
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (text.includes(city)) return state
  }
  for (const state of US_STATE_NAMES) {
    if (text.includes(state)) return state
  }
  return null
}
