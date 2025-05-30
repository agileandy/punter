# Punter Game Refactoring Plan

This document outlines a comprehensive plan to refactor the Punter game codebase into smaller, more maintainable modules with a maximum of 400-500 lines per file.

## Current State

The codebase currently has two major files that exceed the target line count:
- `components/App.tsx` (1593 lines)
- `services/gameLogic.ts` (1257 lines)

## Refactoring Goals

1. Break down large files into smaller, focused modules
2. Improve code organization and maintainability
3. Ensure proper separation of concerns
4. Keep each file under 400-500 lines
5. Maintain functionality while improving structure

## Directory Structure After Refactoring

```
punter/
├── components/
│   ├── App.tsx                    # Main app component (reduced)
│   ├── Header.tsx                 # Existing header component
│   ├── HorseCard.tsx              # Existing horse card component
│   ├── LoadingSpinner.tsx         # Existing loading spinner component
│   ├── Modal.tsx                  # Existing modal component
│   ├── betting/
│   │   ├── BettingInterface.tsx   # Betting UI and logic
│   │   └── BetForm.tsx            # Bet placement form
│   ├── horses/
│   │   ├── HorseList.tsx          # Horse listing and filtering
│   │   └── HorseDetails.tsx       # Detailed horse information
│   ├── players/
│   │   ├── PlayerDashboard.tsx    # Player stats and controls
│   │   └── PlayerSetup.tsx        # Player creation interface
│   ├── race/
│   │   ├── RaceManager.tsx        # Race creation and management
│   │   ├── RaceVisualization.tsx  # Race animation and display
│   │   └── RaceResults.tsx        # Race results display
│   └── setup/
│       └── GameSetup.tsx          # Game initialization interface
├── constants/
│   ├── index.ts                   # Re-exports all constants
│   ├── gameSettings.ts            # Game configuration constants
│   ├── horseSettings.ts           # Horse-related constants
│   ├── jockeySettings.ts          # Jockey-related constants
│   └── raceSettings.ts            # Race-related constants
├── services/
│   ├── gameLogic/
│   │   ├── index.ts               # Main exports and integration
│   │   ├── horseGeneration.ts     # Horse creation and management
│   │   ├── jockeyGeneration.ts    # Jockey creation and management
│   │   ├── raceSimulation.ts      # Race physics and simulation
│   │   ├── oddsCalculation.ts     # Betting odds calculation
│   │   ├── participantSelection.ts # Race participant selection
│   │   ├── gameProgression.ts     # Game state advancement
│   │   └── utils.ts               # Utility functions
│   └── generation/
│       └── jockeyGenerator.ts     # Existing jockey generator
├── types/
│   ├── index.ts                   # Re-exports all types
│   ├── horse.ts                   # Horse-related types
│   ├── jockey.ts                  # Jockey-related types
│   ├── race.ts                    # Race-related types
│   ├── player.ts                  # Player-related types
│   ├── bet.ts                     # Betting-related types
│   └── simulation.ts              # Simulation-related types
└── utils/
    └── helpers.ts                 # Existing helpers
```

## Detailed Refactoring Plan

### 1. Types Refactoring

Split `types.ts` (230 lines) into smaller, domain-specific files:

#### `/types/index.ts`
```typescript
// Re-export all types
export * from './horse';
export * from './jockey';
export * from './race';
export * from './player';
export * from './bet';
export * from './simulation';
```

#### `/types/horse.ts`
```typescript
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
  Maiden = 'Maiden',
  Novice = 'Novice',
  ClassD = 'D',
  ClassC = 'C',
  ClassB = 'B',
  ClassA = 'A',
  Elite = 'Elite',
}

export interface Horse {
  id: string;
  name: string;
  age: number;
  breed: HorseBreed;
  gender: HorseGender;
  color: string;
  grade: HorseGrade;
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
  finishingKick: number;
  preferredTrackCondition: TrackCondition;
  form: FormRating;
  careerStats: {
    races: number;
    wins: number;
    places: number;
    shows: number;
    earnings: number;
  };
  raceHistory: PastRaceResult[];
  isLegendary?: boolean;
  best400mTimeSecs: number | null;
  bestLast400mTimeSecs: number | null;
}

// Import from race.ts
import { TrackCondition, PastRaceResult } from './race';
```

Similar structure for other type files (`jockey.ts`, `race.ts`, `player.ts`, `bet.ts`, `simulation.ts`).

### 2. Constants Refactoring

Split `constants.ts` (163 lines) into domain-specific files:

#### `/constants/index.ts`
```typescript
// Re-export all constants
export * from './gameSettings';
export * from './horseSettings';
export * from './jockeySettings';
export * from './raceSettings';
```

With similar structure for other constant files.

### 3. gameLogic.ts Refactoring (1257 lines)

Break down into specialized modules:

#### `/services/gameLogic/index.ts` (~100 lines)
- Main exports and integration of all game logic modules
- Core game state management functions

#### `/services/gameLogic/horseGeneration.ts` (~250 lines)
```typescript
import { v4 as uuidv4 } from 'uuid';
import { Horse, HorseGrade, FormRating } from '../../types';
import { 
  HORSE_NAMES_PREFIX, HORSE_NAMES_SUFFIX, HORSE_COLORS,
  HORSE_BREEDS_AVAILABLE, HORSE_GENDERS_AVAILABLE,
  DEFAULT_NUM_HORSES_IN_GAME, MAX_HORSE_AGE,
  INITIAL_HORSE_GRADE
} from '../../constants';
import { getRandomElement, getRandomInt } from './utils';
import { generatePastRaceResult } from './raceSimulation';

export const generateHorseName = (): string => 
  `${getRandomElement(HORSE_NAMES_PREFIX)} ${getRandomElement(HORSE_NAMES_SUFFIX)}`;

export const generateHorse = (generateHistory: boolean = true): Horse => {
  // Horse generation logic
};

export const generateHorseWithCareer = (baseHorse: Horse): Horse => {
  // Career generation logic
};

export const createInitialHorses = (
  count: number = DEFAULT_NUM_HORSES_IN_GAME, 
  generateHistory: boolean = true
): Horse[] => {
  return Array.from({ length: count }, () => generateHorse(generateHistory));
};
```

#### `/services/gameLogic/raceSimulation.ts` (~300 lines)
- Race physics and simulation logic
- Snapshot generation
- Finish time calculation

#### `/services/gameLogic/oddsCalculation.ts` (~200 lines)
- Monte Carlo simulation
- Odds adjustment
- Probability calculation

#### `/services/gameLogic/participantSelection.ts` (~200 lines)
- Horse selection for races
- Jockey assignment
- Gate assignment

#### `/services/gameLogic/gameProgression.ts` (~150 lines)
- Game date advancement
- Horse aging
- Career progression

#### `/services/gameLogic/utils.ts` (~100 lines)
```typescript
// Random number generation
export const getRandomElement = <T,>(arr: T[]): T => 
  arr[Math.floor(Math.random() * arr.length)];

export const getRandomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const getRandomFloat = (min: number, max: number): number => 
  Math.random() * (max - min) + min;

// Odds formatting
export const formatOddsForDisplay = (odds: number | undefined | null): string => {
  // Formatting logic
};

// Other utility functions
```

### 4. App.tsx Refactoring (1593 lines)

Break down into smaller, focused components:

#### `/components/App.tsx` (reduced to ~300 lines)
```typescript
import React, { useState, useEffect } from 'react';
import Header from './Header';
import GameSetup from './setup/GameSetup';
import RaceManager from './race/RaceManager';
import BettingInterface from './betting/BettingInterface';
import RaceVisualization from './race/RaceVisualization';
import RaceResults from './race/RaceResults';
import PlayerDashboard from './players/PlayerDashboard';
import { GameStage, Player, Horse, Jockey, Race } from '../types';
import * as gameLogic from '../services/gameLogic';

// Define types moved from App.tsx
type GameStage = 'setup' | 'betting' | 'raceInProgress' | 'raceResults';

const App: React.FC = () => {
  // Core state
  const [gameStage, setGameStage] = useState<GameStage>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [allHorses, setAllHorses] = useState<Horse[]>([]);
  const [allJockeys, setAllJockeys] = useState<Jockey[]>([]);
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameMessages, setGameMessages] = useState<string[]>([]);

  // Core handlers
  const handleSetupComplete = (setupData) => {
    // Setup completion logic
  };

  const handleNewRace = () => {
    // New race creation logic
  };

  const handleBettingComplete = () => {
    // Betting completion logic
  };

  // Main render
  return (
    <div className="app-container">
      <Header />
      {gameStage === 'setup' && (
        <GameSetup 
          onSetupComplete={handleSetupComplete} 
        />
      )}
      {gameStage === 'betting' && (
        <BettingInterface 
          players={players}
          currentPlayerId={currentPlayerId}
          currentRace={currentRace}
          onBettingComplete={handleBettingComplete} 
        />
      )}
      {gameStage === 'raceInProgress' && (
        <RaceVisualization 
          currentRace={currentRace}
          onRaceComplete={handleRaceComplete} 
        />
      )}
      {gameStage === 'raceResults' && (
        <RaceResults 
          raceResults={raceResults}
          activeBets={activeBetsThisRace}
          onNewRace={handleNewRace} 
        />
      )}
      <PlayerDashboard 
        players={players}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
};

export default App;
```

#### `/components/setup/GameSetup.tsx` (~250 lines)
- Player setup
- Horse/jockey count configuration
- Game initialization logic

#### `/components/race/RaceManager.tsx` (~300 lines)
- Race creation and scheduling
- Race participant selection
- Race simulation control

#### `/components/betting/BettingInterface.tsx` (~250 lines)
- Bet placement UI
- Odds display
- Bet type selection

#### `/components/race/RaceVisualization.tsx` (~300 lines)
- Race animation and visualization
- Race progress display
- Live race state rendering

#### `/components/race/RaceResults.tsx` (~200 lines)
- Results display
- Winnings calculation
- Race summary

#### `/components/horses/HorseList.tsx` (~200 lines)
- Horse listing and filtering
- Horse sorting
- Horse detail display

#### `/components/players/PlayerDashboard.tsx` (~150 lines)
- Player stats
- Currency display
- Player turn management

## Implementation Strategy

1. **Create the directory structure** first
2. **Start with the types and constants** refactoring to establish the foundation
3. **Refactor gameLogic.ts** next as it's the core engine
4. **Refactor App.tsx** components last, as they depend on the game logic

## Import Considerations

When refactoring, ensure:

1. **Proper imports** between modules
2. **Circular dependency prevention** by careful module organization
3. **Consistent naming conventions** across all files
4. **Export all necessary functions** from each module
5. **Update all import paths** in existing files

## Testing Strategy

After each major refactoring step:
1. Ensure the application builds without errors
2. Verify that game functionality remains intact
3. Test all major game flows:
   - Game setup
   - Race creation
   - Betting
   - Race simulation
   - Results calculation

## Benefits of Refactoring

1. **Improved maintainability**: Smaller files are easier to understand and modify
2. **Better organization**: Clear separation of concerns
3. **Enhanced collaboration**: Multiple developers can work on different modules
4. **Easier testing**: Focused modules are easier to test in isolation
5. **Improved performance**: Potential for better code splitting and lazy loading
6. **Reduced cognitive load**: Developers can focus on one aspect at a time

## Conclusion

This refactoring plan provides a clear path to transform the Punter game codebase into a more maintainable and organized structure while preserving all functionality. By breaking down large files into smaller, focused modules, the codebase will be easier to understand, maintain, and extend in the future.