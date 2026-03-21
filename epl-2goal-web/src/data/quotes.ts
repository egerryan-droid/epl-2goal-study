export interface Quote {
  text: string;
  author: string;
  role: string;
  context?: string;
  section?: string; // which section this quote fits best
}

export const QUOTES: Quote[] = [
  // Complacency
  {
    text: "We shouldn't be in that position. The game should be done at 2-0.",
    author: "Liam Rosenior",
    role: "Manager",
    context: "On throwing away a 2-goal lead",
    section: "collapse-intro",
  },
  {
    text: "We took a bit of the gas off and that was our problem.",
    author: "Erik ten Hag",
    role: "Manchester United Manager",
    context: "On complacency after leading",
    section: "big-picture",
  },
  {
    text: "We lost our concentration for five minutes and paid the price.",
    author: "Ruben Amorim",
    role: "Manchester United Manager",
    context: "On losing focus",
    section: "when-it-matters",
  },
  // Defensive failures
  {
    text: "After 60 minutes, we started to become sloppy and it's not the first time. We have to address that.",
    author: "Virgil van Dijk",
    role: "Liverpool Captain",
    context: "On second-half collapses",
    section: "lock-point",
  },
  {
    text: "The goals we conceded were too easy and we could have avoided them.",
    author: "Erik ten Hag",
    role: "Manchester United Manager",
    context: "On defensive mistakes",
    section: "team-performance",
  },
  // Mental toughness
  {
    text: "There shouldn't be panic, but improvement is needed.",
    author: "Virgil van Dijk",
    role: "Liverpool Captain",
    context: "On mental resilience",
    section: "verdict",
  },
  {
    text: "This is not good enough. We have to accept this and get better.",
    author: "Erik ten Hag",
    role: "Manchester United Manager",
    context: "On showing resilience",
    section: "key-findings",
  },
  // Player reactions
  {
    text: "2-0 up and we had silly mistakes... To win like that, there is nothing better.",
    author: "Cole Palmer",
    role: "Chelsea Forward",
    context: "After winning from 2-0 down",
    section: "collapse-intro",
  },
  {
    text: "At 2-0, you think the game is over. But in the Premier League, it never is.",
    author: "Gary Neville",
    role: "Sky Sports Pundit",
    context: "On the danger of two-goal leads",
    section: "collapse-timeline",
  },
  {
    text: "Mistakes are part of football but as a team you have to deal with it and bounce back.",
    author: "Bruno Fernandes",
    role: "Manchester United Captain",
    context: "On dealing with mistakes",
    section: "season-trends",
  },
];
