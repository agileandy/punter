

export enum HorseGender {
  Male = 'Male',
  Female = 'Female',
}

export enum HorseBreed {
  Thoroughbred = 'Thoroughbred',
  Arabian = 'Arabian',
  QuarterHorse = 'Quarter Horse',
}

export enum FormRating {
  Excellent = 'Excellent',
  Good = 'Good',
  Average = 'Average',
  Poor = 'Poor',
  Terrible = 'Terrible',
}

export enum HorseGrade {
  Maiden = 'Maiden', // Lowest, for horses that haven't won yet
  Novice = 'Novice', // For horses with 1-2 wins
  ClassD = 'D',
  ClassC = 'C',
  ClassB = 'B',
  ClassA = 'A',
  Elite = 'Elite', // Highest grade
}

export interface Horse {
  id: string;
  name: string;
  age: number;
  breed: HorseBreed;
  gender: HorseGender;
  color: string; // e.g. "Bay", "Chestnut"
  grade: HorseGrade; // New: Horse's current racing grade
  // Attributes (scale 1-100, can be hidden or partially visible)
  speed: number; // Base speed potential
  stamina: number; // Affects performance over distance and fatigue resistance
  acceleration: number; // How quickly it reaches top speed
  consistency: number; // How reliably it performs to its potential
  finishingKick: number; // Burst of speed at the end
  preferredTrackCondition: TrackCondition; // e.g. Firm, Soft
  // Visible Stats
  form: FormRating;
  careerStats: {
    races: number;
    wins: number;
    places: number; // 2nd
    shows: number; // 3rd
    earnings: number;
  };
  raceHistory: PastRaceResult[];
  isLegendary?: boolean;
  best400mTimeSecs: number | null; 
  bestLast400mTimeSecs: number | null; // New: Best last 400m segment time ever recorded
}

export interface Jockey {
  id: string;
  name: string;
  age: number;
  skill: number; // Overall skill (1-100), now hidden from UI but used in sim
  specialty: 'Pace Setter' | 'Closer' | 'All-Rounder';
  weight: number; // In kg, affects horse
  careerStats: {
    races: number;
    wins: number;
    winPercentage: number;
    top3Finishes: number; // New: Total 1st, 2nd, or 3rd place finishes
  };
}

export enum TrackCondition {
  Fast = 'Fast',
  Good = 'Good',
  Soft = 'Soft',
  Heavy = 'Heavy',
}

export enum RaceDistance {
  Sprint = '1000m', // ~5 furlongs
  Middle = '1600m', // ~1 mile
  Long = '2400m', // ~1.5 miles
}

export type OddsAdjustmentReason = 'jockey' | 'form_win' | 'jockey_on_potential' | 'none';
export type DNFReason = 'DNF_FATIGUE' | 'DNF_TOO_FAR';

export interface RaceParticipant {
  horse: Horse;
  jockey: Jockey;
  gate: number;
  odds: number; // Calculated before race
  // For live simulation tracking and results
  currentPosition?: number; 
  distanceCovered?: number; // For simulation display, in meters
  currentSpeed?: number; // m/s, for display during simulation
  fatigue?: number; // 0-100, for display during simulation
  finishTime?: number | null; // Actual finish time in seconds for sorting
  status?: DNFReason; // For DNF horses
  originalOddsBeforeHobbyAdjustment?: number; // For debug UI
  adjustmentReason?: OddsAdjustmentReason; // For debug UI
  adjustmentArrowDirection?: 'up' | 'down' | 'none'; // For debug UI
}

export interface Race {
  id: string;
  name: string;
  trackName: string;
  distance: RaceDistance;
  trackCondition: TrackCondition;
  participants: RaceParticipant[];
  purse: number; // Total prize money
  scheduledTime: Date;
  targetRaceGrade: HorseGrade; 
  targetSpeedBandName?: string; // New: Name of the speed band for this race
}

export interface PastRaceResult {
  raceId: string;
  raceName: string;
  trackName: string;
  distance: RaceDistance;
  condition: TrackCondition;
  jockeyName: string;
  position: number;
  finishTime?: number; // Optional
  status?: DNFReason; // For DNF horses
  earnings: number;
  date: Date;
  raceGrade: HorseGrade; // Grade of the race this result is from
  best400mTimeInRace?: number | null; 
  last400mTimeInRace?: number | null; // New: Last 400m segment time in this specific race
  horseSpecificSummarySentence?: string; // New: AI generated sentence for this horse in this race
}

export enum BetType {
  Win = 'Win', // Bet on the horse to finish 1st
  Place = 'Place', // Bet on the horse to finish 1st or 2nd (sometimes 3rd in larger fields)
  Show = 'Show', // Bet on the horse to finish 1st, 2nd, or 3rd
}

export interface Bet {
  raceId: string;
  horseId: string;
  jockeyId: string;
  type: BetType;
  stake: number;
  oddsAtBetTime: number;
  playerId: string; // Added to associate bet with a player
}

export interface Player {
  id: string; // Added for multiplayer
  name: string; // Added for multiplayer
  currency: number;
  ownedHorses: Horse[]; // If implementing ownership
  // bets: Bet[]; // Bets will be managed in App state via activeBetsThisRace for current race
}

export interface RaceFinishOrderEntry {
  participant: RaceParticipant; // Contains all original participant data + final finishTime & status
  finishPosition: number;
  best400mTimeForThisRace: number | null; 
  last400mTimeForThisRace: number | null; // New: Last 400m segment time during this race for this participant
}

// Snapshot of all horses' progress at a point in the race
export interface ParticipantSnapshotState {
  horseId: string;
  distanceCovered: number; // total distance from start in meters
  currentSpeed: number; // m/s in this segment
  fatigue: number; // 0-100
  status?: DNFReason; // New: To show DNF status in live animation if applicable at this snapshot
}
export interface RaceSnapshot {
  segment: number; // e.g., 1 for 0-100m, 2 for 100-200m, etc.
  simulatedTimeElapsed: number; // virtual total time in seconds from start of race for this snapshot
  participantStates: ParticipantSnapshotState[];
}

// For internal simulation state in gameLogic
export interface LiveParticipantSimState extends RaceParticipant {
  internalDistanceCovered: number;
  internalFatigue: number;
  internalCurrentSpeed: number; 
  internalFinishTime: number | null;
  finishedRace: boolean;
  raceDayFactor: number; // New: Per-race random performance modifier
  distanceTimePoints: { distance: number, time: number }[]; // New: For calculating best 400m time
  best400mTimeForThisRace: number | null; 
  last400mTimeForThisRace: number | null; // New: Calculated best last 400m for this specific race
}

// For Monte Carlo debug view
export interface MonteCarloDebugDataItem {
    horseId: string;
    horseName: string;
    wins: number;
    probability: number;
}

export interface MonteCarloSummary {
    winCounts: { [horseId: string]: number };
    totalSimulations: number;
    probabilities?: { [horseId: string]: number }; // Raw MC probabilities before adjustments
}

// For the new odds calculation function result
export interface CalculatedOddsInfo {
    horseId: string;
    finalOdds: number;
    originalOdds: number; // Odds based on MC + overround, before hobbyist adjustments
    reason: OddsAdjustmentReason;
    arrowDirection: 'up' | 'down' | 'none';
}

// Used for race summary generation
export interface RaceParticipantFullData extends RaceParticipant {
  snapshots: ParticipantSnapshotState[]; // All snapshots for this participant during the race
  finishPosition: number; // Final position from RaceFinishOrderEntry
}
export interface GeminiRaceSummary {
  mainSummary: string;
  horseSentences: { [horseId: string]: string };
}
