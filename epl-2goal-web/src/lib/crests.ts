/**
 * EPL team crest URLs from the free Football-Data.org API (public, no auth needed).
 * Maps team_key (from our data) to crest image URL.
 * These are SVG/PNG crests hosted by football-data.org's CDN.
 */

const CREST_BASE = 'https://crests.football-data.org';

export const TEAM_CRESTS: Record<string, string> = {
  'Arsenal': `${CREST_BASE}/57.png`,
  'Aston Villa': `${CREST_BASE}/58.png`,
  'AFC Bournemouth': `${CREST_BASE}/1044.png`,
  'Brentford': `${CREST_BASE}/402.png`,
  'Brighton': `${CREST_BASE}/397.png`,
  'Burnley': `${CREST_BASE}/328.png`,
  'Chelsea': `${CREST_BASE}/61.png`,
  'Crystal Palace': `${CREST_BASE}/354.png`,
  'Everton': `${CREST_BASE}/62.png`,
  'Fulham': `${CREST_BASE}/63.png`,
  'Hull City': `${CREST_BASE}/322.png`,
  'Huddersfield': `${CREST_BASE}/394.png`,
  'Leeds United': `${CREST_BASE}/341.png`,
  'Leicester City': `${CREST_BASE}/338.png`,
  'Liverpool': `${CREST_BASE}/64.png`,
  'Luton Town': `${CREST_BASE}/389.png`,
  'Manchester City': `${CREST_BASE}/65.png`,
  'Manchester United': `${CREST_BASE}/66.png`,
  'Middlesbrough': `${CREST_BASE}/343.png`,
  'Newcastle United': `${CREST_BASE}/67.png`,
  'Norwich City': `${CREST_BASE}/68.png`,
  'Nottingham Forest': `${CREST_BASE}/351.png`,
  'Queens Park Rangers': `${CREST_BASE}/69.png`,
  'Sheffield United': `${CREST_BASE}/356.png`,
  'Southampton': `${CREST_BASE}/340.png`,
  'Stoke City': `${CREST_BASE}/70.png`,
  'Sunderland': `${CREST_BASE}/71.png`,
  'Swansea': `${CREST_BASE}/72.png`,
  'Tottenham': `${CREST_BASE}/73.png`,
  'Watford': `${CREST_BASE}/346.png`,
  'West Bromwich Albion': `${CREST_BASE}/74.png`,
  'West Ham United': `${CREST_BASE}/563.png`,
  'Wolverhampton Wanderers': `${CREST_BASE}/76.png`,
  'Derby County': `${CREST_BASE}/342.png`,
  'Blackburn Rovers': `${CREST_BASE}/59.png`,
};

/**
 * Get crest URL for a team. Falls back to empty string if not found.
 */
export function getCrestUrl(teamKey: string): string {
  return TEAM_CRESTS[teamKey] ?? '';
}
