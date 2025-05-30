import { v4 as uuidv4 } from 'uuid';
import { Jockey } from '../types';
import {
  JOCKEY_FIRST_NAMES,
  JOCKEY_LAST_NAMES,
  DEFAULT_NUM_JOCKEYS_IN_GAME
} from '../constants';
import { getRandomElement, getRandomInt } from '../utils/helpers';

export const generateJockeyName = (): string =>
  `${getRandomElement(JOCKEY_FIRST_NAMES)} ${getRandomElement(JOCKEY_LAST_NAMES)}`;

export const generateJockey = (): Jockey => ({
  id: uuidv4(),
  name: generateJockeyName(),
  age: getRandomInt(18, 45),
  skill: getRandomInt(50, 95),
  specialty: getRandomElement(['Pace Setter', 'Closer', 'All-Rounder']),
  weight: getRandomInt(50, 60),
  careerStats: { races: 0, wins: 0, winPercentage: 0, top3Finishes: 0 },
});

export const createInitialJockeys = (count: number = DEFAULT_NUM_JOCKEYS_IN_GAME): Jockey[] =>
  Array.from({ length: count }, generateJockey);