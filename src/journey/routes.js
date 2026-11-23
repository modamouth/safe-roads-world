// ---------------------------------------------------------------------------
// The journeys on the Mission Map. Each has its legs, Passport stamps, tips and
// its own saved progress (see progress.js); the hub and drive scenes take a route id.
// ---------------------------------------------------------------------------
import { LEGS, STAMPS, CHECKS, TIPS } from './route.js';
import { COAST_LEGS, COAST_STAMPS, COAST_TIPS } from './coast.js';

export const ROUTES = {
  b1: {
    id: 'b1', zone: 'b1', title: 'The Journey Home', key: 'srw.journey.v1',
    legs: LEGS, stamps: STAMPS, checks: CHECKS, tips: TIPS, end: 'home', endTag: ' (home)',
    intro: 'Drive home for the holidays: Windhoek to Tsumeb on the B1. Four legs, one goal: arrive safely.',
    done: best => 'You made it home. Best journey score: ' + best + '/100.', again: 'Drive home again'
  },
  b2: {
    id: 'b2', zone: 'b2', title: 'Journey to the Ocean', key: 'srw.journey.b2.v1',
    legs: COAST_LEGS, stamps: COAST_STAMPS, checks: CHECKS, tips: COAST_TIPS, end: 'the sea', endTag: ' (coast)',
    intro: 'Head for the sea: Windhoek to Swakopmund on the B2. Desert dust, crosswinds and coastal fog on the way.',
    done: best => 'You reached the ocean. Best journey score: ' + best + '/100.', again: 'Drive to the sea again'
  }
};

export const routeById = id => ROUTES[id] || ROUTES.b1;
