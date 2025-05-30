

import { v4 as uuidv4 } from 'uuid';
import {
  Horse, Jockey, Race, RaceParticipant, Bet, Player,
  HorseGender, HorseBreed, FormRating, TrackCondition, RaceDistance, BetType, PastRaceResult, RaceFinishOrderEntry,
  RaceSnapshot, LiveParticipantSimState, MonteCarloSummary, OddsAdjustmentReason, CalculatedOddsInfo, HorseGrade, DNFReason
} from '../types';
import {
  HORSE_NAMES_PREFIX, HORSE_NAMES_SUFFIX, JOCKEY_FIRST_NAMES, JOCKEY_LAST_NAMES, HORSE_COLORS,
  HORSE_BREEDS_AVAILABLE, HORSE_GENDERS_AVAILABLE, FORM_RATINGS_ORDER,
  TRACK_NAMES, TRACK_CONDITIONS_AVAILABLE, RACE_DISTANCES_AVAILABLE,
  DEFAULT_NUM_HORSES_IN_GAME, DEFAULT_NUM_JOCKEYS_IN_GAME, MIN_HORSES_PER_RACE, MAX_HORSES_PER_RACE, MAX_HORSE_AGE,
  ODDS_MIN_PAYOUT, ODDS_MAX_PAYOUT, ODDS_OVERROUND_FACTOR,
  MONTE_CARLO_ITERATIONS, MIN_RAW_MC_PROBABILITY_FLOOR, 
  LEGENDARY_THRESHOLD_MIN_RACES_FOR_LEGENDARY, LEGENDARY_THRESHOLD_WINS, LEGENDARY_THRESHOLD_WIN_PLACE_PERCENT,
  HIGH_SKILL_JOCKEY_THRESHOLD, AVERAGE_HORSE_STAT_MIN, AVERAGE_HORSE_STAT_MAX, 
  MIN_ODDS_MULTIPLIER_EFFECT, MAX_ODDS_MULTIPLIER_EFFECT,
  INITIAL_HORSE_GRADE, GRADES_ORDER, WINS_FOR_GUARANTEED_PROMOTION_CHANCE, RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION,
  RACES_FOR_DEMOTION_REVIEW, DEMOTION_PERFORMANCE_THRESHOLD_POSITION, MIN_HORSES_FOR_GRADE_SPECIFIC_RACE,
  DNF_DISTANCE_BEHIND_WINNER_THRESHOLD_PERCENT, 
  INITIAL_GAME_YEAR, MIN_SPEED_FOR_ACTIVE_RACING, SPEED_BANDS, JOCKEY_MANAGE_FATIGUE_START_THRESHOLD, MAX_SPEED_MPS
} from '../constants';

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

export const generateHorseName = (): string => `${getRandomElement(HORSE_NAMES_PREFIX)} ${getRandomElement(HORSE_NAMES_SUFFIX)}`;
export const generateJockeyName = (): string => `${getRandomElement(JOCKEY_FIRST_NAMES)} ${getRandomElement(JOCKEY_LAST_NAMES)}`;

// Odds Formatting Utility
export const formatOddsForDisplay = (odds: number | undefined | null): string => {
  if (odds === null || odds === undefined || isNaN(Number(odds))) return '-';

  const num = Number(odds);

  if (num < 10) { // e.g., 3.91 -> "3.9", 1.15 -> "1.2"
    return (Math.round(num * 10) / 10).toFixed(1);
  } else if (num < 100) { // e.g., 16.4 -> "16", 99.9 -> "100"
    return Math.round(num).toString();
  } else if (num < 1000) { // e.g., 247 -> "250", 105.6 -> "110"
    return (Math.round(num / 10) * 10).toString();
  } else { // e.g., 2310 -> "2300"
    return (Math.round(num / 100) * 100).toString();
  }
};


const generatePastRaceResult = (horseAge: number, raceIndex: number, numTotalPastRaces: number): PastRaceResult => {
  const position = getRandomInt(1, getRandomInt(MIN_HORSES_PER_RACE, MAX_HORSES_PER_RACE));
  const isDnf = Math.random() < 0.03;
  let earnings = 0;
  if (!isDnf) {
    if (position === 1) earnings = getRandomInt(1000, 20000);
    else if (position === 2) earnings = getRandomInt(500, 10000);
    else if (position === 3) earnings = getRandomInt(250, 5000);
  }

  const yearsEligibleToRace = horseAge - 2; 
  let yearOfRace;
  if (yearsEligibleToRace <= 0) { 
      yearOfRace = INITIAL_GAME_YEAR - 1;
  } else {
      const yearOffset = Math.min(yearsEligibleToRace, Math.floor( (numTotalPastRaces - 1 - raceIndex) / getRandomInt(4,10) ) + 1); // Increased upper bound for races per year
      yearOfRace = INITIAL_GAME_YEAR - yearOffset;
  }
  
  const raceDate = new Date(
    yearOfRace,
    getRandomInt(0, 11), 
    getRandomInt(1, 28)  
  );

  return {
    raceId: uuidv4(),
    raceName: `${getRandomElement(TRACK_NAMES)} Past Event`,
    trackName: getRandomElement(TRACK_NAMES),
    distance: getRandomElement(RACE_DISTANCES_AVAILABLE),
    condition: getRandomElement(TRACK_CONDITIONS_AVAILABLE),
    jockeyName: generateJockeyName(),
    position: isDnf ? 0 : position,
    status: isDnf ? (Math.random() < 0.5 ? undefined : 'DNF_TOO_FAR') : undefined, // Removed DNF_FATIGUE from past generation
    earnings,
    date: raceDate,
    raceGrade: getRandomElement(GRADES_ORDER.slice(0, GRADES_ORDER.length - 2)), 
    best400mTimeInRace: null, 
    last400mTimeInRace: null,
    // horseSpecificSummarySentence is intentionally omitted here; it's added later in App.tsx if generated
  };
};


const generateHorseWithCareer = (baseHorse: Horse): Horse => {
  const horse = { ...baseHorse }; 
  horse.careerStats = { races: 0, wins: 0, places: 0, shows: 0, earnings: 0 };
  horse.raceHistory = [];
  horse.best400mTimeSecs = null; 
  horse.bestLast400mTimeSecs = null;

  let numPastRaces = 0;
  if (horse.age > 2) { 
    let maxPossibleRacesForAge = 0;
    if (horse.age === 3) { 
      maxPossibleRacesForAge = getRandomInt(2, 8); 
    } else if (horse.age >= 4) { 
      maxPossibleRacesForAge = (horse.age - 2) * getRandomInt(4, 10); 
    }
    numPastRaces = getRandomInt(Math.min(1, maxPossibleRacesForAge), maxPossibleRacesForAge); 
  }
  
  if (numPastRaces === 0 && horse.age > 2) { 
      numPastRaces = getRandomInt(1, (horse.age - 2) * 3 + 1); 
  }


  if (numPastRaces === 0) { 
    horse.grade = INITIAL_HORSE_GRADE;
    horse.form = FormRating.Average;
    return horse;
  }

  for (let i = 0; i < numPastRaces; i++) {
    const pastResult = generatePastRaceResult(horse.age, i, numPastRaces);
    horse.raceHistory.push(pastResult);
    horse.careerStats.races++;
    horse.careerStats.earnings += pastResult.earnings;
    if (!pastResult.status) {
      if (pastResult.position === 1) horse.careerStats.wins++;
      else if (pastResult.position === 2) horse.careerStats.places++;
      else if (pastResult.position === 3) horse.careerStats.shows++;
    }
  }
  horse.raceHistory.sort((a, b) => b.date.getTime() - a.date.getTime());


  // Simplified Grade Assignment based on career
  if (horse.careerStats.wins === 0 && horse.careerStats.races > 0) {
    horse.grade = HorseGrade.Maiden;
  } else if (horse.careerStats.wins > 0 && horse.careerStats.wins <= WINS_FOR_GUARANTEED_PROMOTION_CHANCE +1) { 
    horse.grade = HorseGrade.Novice;
  } else if (horse.careerStats.wins > WINS_FOR_GUARANTEED_PROMOTION_CHANCE +1 && horse.careerStats.races > RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION) {
    let potentialGradeIndex = GRADES_ORDER.indexOf(HorseGrade.Novice);
    if (horse.careerStats.wins > 2 && horse.careerStats.earnings > 15000) potentialGradeIndex = Math.max(potentialGradeIndex, GRADES_ORDER.indexOf(HorseGrade.ClassD));
    if (horse.careerStats.wins > 4 && horse.careerStats.earnings > 40000) potentialGradeIndex = Math.max(potentialGradeIndex, GRADES_ORDER.indexOf(HorseGrade.ClassC));
    if (horse.careerStats.wins > 6 && horse.careerStats.earnings > 100000) potentialGradeIndex = Math.max(potentialGradeIndex, GRADES_ORDER.indexOf(HorseGrade.ClassB));
    if (horse.careerStats.wins > 9 && horse.careerStats.earnings > 250000) potentialGradeIndex = Math.max(potentialGradeIndex, GRADES_ORDER.indexOf(HorseGrade.ClassA));
    if (horse.careerStats.wins > 12 && horse.careerStats.earnings > 450000) potentialGradeIndex = Math.max(potentialGradeIndex, GRADES_ORDER.indexOf(HorseGrade.Elite));
    horse.grade = GRADES_ORDER[Math.min(potentialGradeIndex, GRADES_ORDER.length - 1)];
  } else {
    horse.grade = INITIAL_HORSE_GRADE; 
  }
  
  if (horse.raceHistory.length > 0) {
    const lastRace = horse.raceHistory[0]; 
    if (lastRace.status) {
        horse.form = FormRating.Terrible;
    } else if (lastRace.position === 1) {
        horse.form = getRandomElement([FormRating.Excellent, FormRating.Good]);
    } else if (lastRace.position <= 3) {
        horse.form = getRandomElement([FormRating.Good, FormRating.Average]);
    } else if (lastRace.position > MAX_HORSES_PER_RACE * 0.7) {
        horse.form = getRandomElement([FormRating.Poor, FormRating.Terrible]);
    } else {
        horse.form = FormRating.Average;
    }
  } else {
    horse.form = FormRating.Average;
  }

  // Assign a plausible best 400m time for horses with some career and decent form/speed
  if (horse.careerStats.races > 2 && 
      horse.form !== FormRating.Terrible && 
      horse.form !== FormRating.Poor &&
      horse.speed >= 55) {
      
      const speedInMps = (horse.speed / 100) * MAX_SPEED_MPS;
      if (speedInMps > 0) {
         let estimatedTime = 400 / speedInMps; // Base time
         estimatedTime += getRandomFloat(-2.0, 2.0); // Add realistic variation
         // Clamp to a reasonable range, e.g., 20s (world-class) to 45s (slow)
         horse.best400mTimeSecs = parseFloat(Math.max(20, Math.min(45, estimatedTime)).toFixed(2));
         // For now, bestLast400mTimeSecs will be populated from actual races
      }
  }


  const { races, wins, places } = horse.careerStats;
  const nonDnfRaces = horse.raceHistory.filter(r => !r.status).length;
  const winPlaceCount = wins + places;
  if (nonDnfRaces >= LEGENDARY_THRESHOLD_MIN_RACES_FOR_LEGENDARY) {
    if (wins >= LEGENDARY_THRESHOLD_WINS || (nonDnfRaces > 0 && (winPlaceCount / nonDnfRaces) >= LEGENDARY_THRESHOLD_WIN_PLACE_PERCENT)) {
      horse.isLegendary = true;
    }
  }

  return horse;
};

export const generateHorse = (generateHistory: boolean = true): Horse => {
  let age: number;
  
  if (!generateHistory) {
      age = getRandomInt(2, 3);
  } else {
      const rand = Math.random();
      if (rand < 0.20) { // 20% for 2-3 yo
        age = getRandomInt(2, 3);
      } else if (rand < 0.60) { // 40% for 4-6 yo (peak development/early peak)
        age = getRandomInt(4, 6);
      } else if (rand < 0.85) { // 25% for 7-9 yo (late peak/early decline)
        age = getRandomInt(7, 9);
      } else { // 15% for 10-12 yo (older, experienced)
        age = getRandomInt(10, MAX_HORSE_AGE);
      }
  }


  const baseHorse: Horse = {
    id: uuidv4(),
    name: generateHorseName(),
    age,
    breed: getRandomElement(HORSE_BREEDS_AVAILABLE),
    gender: getRandomElement(HORSE_GENDERS_AVAILABLE),
    color: getRandomElement(HORSE_COLORS),
    grade: INITIAL_HORSE_GRADE,
    speed: getRandomInt(50, 90), 
    stamina: getRandomInt(50, 90),
    acceleration: getRandomInt(50, 90),
    consistency: getRandomInt(40, 95),
    finishingKick: getRandomInt(40, 95),
    preferredTrackCondition: getRandomElement(TRACK_CONDITIONS_AVAILABLE),
    form: FormRating.Average, // Default form
    careerStats: { races: 0, wins: 0, places: 0, shows: 0, earnings: 0 },
    raceHistory: [],
    isLegendary: false,
    best400mTimeSecs: null, 
    bestLast400mTimeSecs: null,
  };
  
  if (!generateHistory) {
      // Already set to 2-3yo, Maiden, Average form, no history/stats
      return baseHorse;
  }

  // Logic for generating history if generateHistory is true
  let shouldHaveCareer = false;
  if (age === 2) {
    shouldHaveCareer = false; 
  } else if (age === 3) {
    shouldHaveCareer = Math.random() < 0.4; 
  } else if (age >= 4 && age <= 6) {
    shouldHaveCareer = Math.random() < 0.75; 
  } else { 
    shouldHaveCareer = Math.random() < 0.95; 
  }

  if (shouldHaveCareer) {
    return generateHorseWithCareer(baseHorse);
  }
  
  // For younger horses or those not getting a full career gen, ensure form is set.
  // If generateHorseWithCareer wasn't called, form might still be default.
  // If it was, form would have been set there. This is a fallback.
  if (baseHorse.raceHistory.length === 0) {
     baseHorse.form = FormRating.Average; 
     baseHorse.grade = INITIAL_HORSE_GRADE; // Ensure grade is maiden if no history.
  }

  return baseHorse;
};


export const generateJockey = (): Jockey => ({
  id: uuidv4(),
  name: generateJockeyName(),
  age: getRandomInt(18, 45),
  skill: getRandomInt(50, 95), // Internal skill, not directly shown
  specialty: getRandomElement(['Pace Setter', 'Closer', 'All-Rounder']),
  weight: getRandomInt(50, 60), 
  careerStats: { races: 0, wins: 0, winPercentage: 0, top3Finishes: 0 },
});

export const createInitialHorses = (count: number = DEFAULT_NUM_HORSES_IN_GAME, generateHistory: boolean = true): Horse[] => {
  return Array.from({ length: count }, () => generateHorse(generateHistory));
};

export const createInitialJockeys = (count: number = DEFAULT_NUM_JOCKEYS_IN_GAME): Jockey[] => {
  return Array.from({ length: count }, generateJockey);
};

export const selectRaceParticipants = (
  allHorses: Horse[],
  allJockeys: Jockey[],
  numParticipants?: number
): { selectedHorses: Horse[], assignedJockeys: Jockey[], targetRaceGrade: HorseGrade, targetSpeedBandName?: string } => {
  
  let eligibleHorsesOverall = allHorses.filter(h => 
    h.age <= MAX_HORSE_AGE && 
    h.careerStats.races < 150 &&
    h.speed >= MIN_SPEED_FOR_ACTIVE_RACING
  );

  if (eligibleHorsesOverall.length < MIN_HORSES_PER_RACE) {
      console.warn("Not enough eligible horses overall to form a race.");
      return { selectedHorses: [], assignedJockeys: [], targetRaceGrade: INITIAL_HORSE_GRADE, targetSpeedBandName: undefined };
  }


  let selectedSpeedBand: {min: number, max: number, name: string} | null = null;
  const availableSpeedBands = SPEED_BANDS.filter(band => 
    eligibleHorsesOverall.filter(h => h.speed >= band.min && h.speed < band.max).length >= MIN_HORSES_PER_RACE
  );

  if (availableSpeedBands.length > 0) {
    selectedSpeedBand = getRandomElement(availableSpeedBands);
  } else {
    
    if (eligibleHorsesOverall.length >= MIN_HORSES_PER_RACE) {
        
        let mostPopulousBand: {min: number, max: number, name: string} | undefined = undefined;
        let maxCount = 0;
        for (const band of SPEED_BANDS) {
            const count = eligibleHorsesOverall.filter(h => h.speed >= band.min && h.speed < band.max).length;
            if (count > maxCount) {
                maxCount = count;
                mostPopulousBand = band;
            }
        }
        if (mostPopulousBand && maxCount >= MIN_HORSES_PER_RACE / 2) { 
            selectedSpeedBand = mostPopulousBand;
        }
    }
    if (!selectedSpeedBand && eligibleHorsesOverall.length > 0) { 
        // Fallback: if no ideal band, pick one that has at least *some* horses, even if less than MIN_HORSES_PER_RACE
        // This is a safety for very small horse pools, prefering *any* band over no band.
        const bandsWithAnyHorses = SPEED_BANDS.filter(band => 
            eligibleHorsesOverall.filter(h => h.speed >= band.min && h.speed < band.max).length > 0
        );
        if (bandsWithAnyHorses.length > 0) {
             selectedSpeedBand = getRandomElement(bandsWithAnyHorses);
        } else {
            // Absolute fallback: if NO horses fit ANY speed band (e.g., all horses have speed < MIN_SPEED_FOR_ACTIVE_RACING, though filtered above)
            // Or if SPEED_BANDS is empty. This case should be rare.
             console.warn("No horses fit any speed band, or SPEED_BANDS is empty. Cannot select speed band.");
        }
    }
  }

  if (!selectedSpeedBand) { 
    // Fallback: if no speed band could be selected, try to form a race based on most common grade
    let targetGradeForFallback = INITIAL_HORSE_GRADE;
    const gradeCountsFallback: { [grade: string]: number } = {};
    eligibleHorsesOverall.forEach(h => {
        gradeCountsFallback[h.grade] = (gradeCountsFallback[h.grade] || 0) + 1;
    });
    let mostCommonGradeInPool = INITIAL_HORSE_GRADE;
    let maxCountInPool = 0;
    for (const grade in gradeCountsFallback) {
        if (gradeCountsFallback[grade] > maxCountInPool) {
            maxCountInPool = gradeCountsFallback[grade];
            mostCommonGradeInPool = grade as HorseGrade;
        }
    }
    if (maxCountInPool >= MIN_HORSES_PER_RACE) {
        targetGradeForFallback = mostCommonGradeInPool;
        const horsesForFallbackRace = eligibleHorsesOverall.filter(h => h.grade === targetGradeForFallback)
                                        .sort(() => 0.5 - Math.random())
                                        .slice(0, numParticipants || getRandomInt(MIN_HORSES_PER_RACE, MAX_HORSES_PER_RACE));
        
        if (horsesForFallbackRace.length >= MIN_HORSES_PER_RACE) {
             const availableJockeysFallback = [...allJockeys].sort(() => 0.5 - Math.random());
             if (horsesForFallbackRace.length > availableJockeysFallback.length) {
                 const limitedHorses = horsesForFallbackRace.slice(0, availableJockeysFallback.length);
                 return { selectedHorses: limitedHorses, assignedJockeys: availableJockeysFallback.slice(0, limitedHorses.length), targetRaceGrade: targetGradeForFallback, targetSpeedBandName: undefined };
             }
             return { selectedHorses: horsesForFallbackRace, assignedJockeys: availableJockeysFallback.slice(0, horsesForFallbackRace.length), targetRaceGrade: targetGradeForFallback, targetSpeedBandName: undefined };
        }
    }
    // If still no suitable race
    return { selectedHorses: [], assignedJockeys: [], targetRaceGrade: INITIAL_HORSE_GRADE, targetSpeedBandName: undefined };
  }


  let horsesForRace = eligibleHorsesOverall.filter(h => h.speed >= selectedSpeedBand!.min && h.speed < selectedSpeedBand!.max);
  
  let targetRaceGrade: HorseGrade = INITIAL_HORSE_GRADE;
  if (horsesForRace.length > 0) {
    const gradeCounts: { [grade: string]: number } = {};
    horsesForRace.forEach(h => {
      gradeCounts[h.grade] = (gradeCounts[h.grade] || 0) + 1;
    });
    let mostCommonGrade = INITIAL_HORSE_GRADE;
    let maxCount = 0;
    for (const grade in gradeCounts) {
      if (gradeCounts[grade] > maxCount) {
        maxCount = gradeCounts[grade];
        mostCommonGrade = grade as HorseGrade;
      }
    }
    targetRaceGrade = mostCommonGrade;
  }
  
  const desiredCount = numParticipants || getRandomInt(MIN_HORSES_PER_RACE, MAX_HORSES_PER_RACE);
  
  horsesForRace.sort(() => 0.5 - Math.random()); // Shuffle
  const finalSelectedHorses = horsesForRace.slice(0, desiredCount);

  if (finalSelectedHorses.length < MIN_HORSES_PER_RACE) {
     // This can happen if, after filtering by speed band, not enough horses remain.
     // We could try another band or a grade-based race as a fallback here too.
     // For now, just returning empty, handleNewRace in App.tsx might retry.
     return { selectedHorses: [], assignedJockeys: [], targetRaceGrade, targetSpeedBandName: selectedSpeedBand.name };
  }

  const availableJockeys = [...allJockeys].sort(() => 0.5 - Math.random());

  if (finalSelectedHorses.length > availableJockeys.length) {
    const limitedHorses = finalSelectedHorses.slice(0, availableJockeys.length);
    return {
        selectedHorses: limitedHorses,
        assignedJockeys: availableJockeys.slice(0, limitedHorses.length),
        targetRaceGrade: targetRaceGrade,
        targetSpeedBandName: selectedSpeedBand.name
    };
  }

  return {
    selectedHorses: finalSelectedHorses,
    assignedJockeys: availableJockeys.slice(0, finalSelectedHorses.length),
    targetRaceGrade: targetRaceGrade,
    targetSpeedBandName: selectedSpeedBand.name
  };
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));


const calculateOddsWithAdjustments = (
  participantsSetup: Omit<RaceParticipant, 'odds' | 'finishTime' | 'originalOddsBeforeHobbyAdjustment' | 'adjustmentReason' | 'adjustmentArrowDirection' | 'status'>[],
  monteCarloProbabilities: { [horseId: string]: number }, 
  fullHorseList: Horse[],
  isDebugMode: boolean = false
): CalculatedOddsInfo[] => {
  
  const originalOddsCalculated: { [horseId: string]: number } = {};
  participantsSetup.forEach(p => {
    const mcProb = monteCarloProbabilities[p.horse.id] || 0.000001; // Reduced fallback, MC should provide better floor
    let originalOdd = (1 / mcProb) / ODDS_OVERROUND_FACTOR;
    if (!isDebugMode) { // In debug mode, show potentially very high/low odds
        originalOdd = Math.max(ODDS_MIN_PAYOUT, Math.min(ODDS_MAX_PAYOUT, originalOdd));
    }
    originalOddsCalculated[p.horse.id] = parseFloat(originalOdd.toFixed(2)); // Store with 2 decimal places for comparison
  });
  
  const adjustedMcProbabilities: { [horseId: string]: number } = {};
  const participantReasons: { [horseId: string]: OddsAdjustmentReason } = {};

  participantsSetup.forEach(p => {
    const horseId = p.horse.id;
    const fullHorseData = fullHorseList.find(fh => fh.id === horseId);
    const baseMcProb = monteCarloProbabilities[horseId] || 0.000001; // Reduced fallback

    if (!fullHorseData) {
      adjustedMcProbabilities[horseId] = baseMcProb;
      participantReasons[horseId] = 'none';
      return;
    }

    let bestProbMultiplier = 1.0;
    let currentReason: OddsAdjustmentReason = 'none';

    const avgHorseStat = (fullHorseData.speed + fullHorseData.stamina + fullHorseData.acceleration) / 3;

    
    if (p.jockey.skill > HIGH_SKILL_JOCKEY_THRESHOLD) {
      
      const jockeyOddsMultiplier = 0.60 + ((100 - p.jockey.skill) / (100 - HIGH_SKILL_JOCKEY_THRESHOLD)) * 0.25; 
      const jockeyProbMultiplier = 1 / Math.max(0.1, jockeyOddsMultiplier); 
      if (jockeyProbMultiplier > bestProbMultiplier) {
        bestProbMultiplier = jockeyProbMultiplier;
        currentReason = 'jockey';
      }
    }

    
    if (p.jockey.skill > HIGH_SKILL_JOCKEY_THRESHOLD && 
        avgHorseStat >= AVERAGE_HORSE_STAT_MIN && 
        avgHorseStat <= AVERAGE_HORSE_STAT_MAX) {
      const randomOddsMultiplier = getRandomFloat(MIN_ODDS_MULTIPLIER_EFFECT, MAX_ODDS_MULTIPLIER_EFFECT); 
      const specificHorseProbMultiplier = 1 / randomOddsMultiplier; 
      if (specificHorseProbMultiplier > bestProbMultiplier) {
        bestProbMultiplier = specificHorseProbMultiplier;
        currentReason = 'jockey_on_potential';
      }
    }
    
    
    if (fullHorseData.raceHistory.length > 0 && fullHorseData.raceHistory[0].position === 1 && !fullHorseData.raceHistory[0].status) {
      const randomFormOddsMultiplier = getRandomFloat(MIN_ODDS_MULTIPLIER_EFFECT, MAX_ODDS_MULTIPLIER_EFFECT);
      const formProbMultiplier = 1 / randomFormOddsMultiplier; 
      if (formProbMultiplier > bestProbMultiplier) {
        bestProbMultiplier = formProbMultiplier;
        currentReason = 'form_win';
      }
    }
    
    adjustedMcProbabilities[horseId] = baseMcProb * bestProbMultiplier;
    participantReasons[horseId] = currentReason;
  });

  const totalAdjustedProbability = Object.values(adjustedMcProbabilities).reduce((sum, prob) => sum + prob, 0);
  
  const finalNormalizedProbabilities: { [horseId: string]: number } = {};
  if (totalAdjustedProbability === 0 || !isFinite(totalAdjustedProbability)) { 
      participantsSetup.forEach(p => finalNormalizedProbabilities[p.horse.id] = 1 / participantsSetup.length);
  } else {
    for (const horseId in adjustedMcProbabilities) {
      finalNormalizedProbabilities[horseId] = adjustedMcProbabilities[horseId] / totalAdjustedProbability;
    }
  }

  const results: CalculatedOddsInfo[] = [];
  participantsSetup.forEach(p => {
    const horseId = p.horse.id;
    const finalProb = finalNormalizedProbabilities[horseId] || 0.000001; // Reduced fallback
    let finalOdds = (1 / finalProb) / ODDS_OVERROUND_FACTOR;

    // Store the raw calculated final odds before capping for debug/comparison
    const rawFinalOdds = parseFloat(finalOdds.toFixed(4)); // Higher precision for intermediate storage

    if (!isDebugMode) { // Cap odds if not in debug mode
        finalOdds = Math.max(ODDS_MIN_PAYOUT, Math.min(ODDS_MAX_PAYOUT, finalOdds));
    }
    // Final odds for display logic (will be formatted later in UI) but store as number for logic
    finalOdds = parseFloat(finalOdds.toFixed(2));


    const originalOddsVal = originalOddsCalculated[horseId]; // This is already capped/processed
    let arrowDirection: 'up' | 'down' | 'none' = 'none';

    // Compare based on the potentially capped original and potentially capped final for arrow
    if (finalOdds < originalOddsVal) arrowDirection = 'down';
    else if (finalOdds > originalOddsVal) arrowDirection = 'up';
    
    results.push({
      horseId,
      finalOdds: finalOdds, // This is the one that might be capped (if not debug)
      originalOdds: originalOddsVal, // This is also capped (if not debug)
      reason: participantReasons[horseId] || 'none',
      arrowDirection
    });
  });
  
  return results;
};


const runMonteCarloSimulation = async (
  raceConfig: Omit<Race, 'participants' | 'id' | 'name' | 'scheduledTime' | 'purse' | 'targetRaceGrade' | 'targetSpeedBandName'> & { participantsSetup: Omit<RaceParticipant, 'odds' | 'finishTime' | 'originalOddsBeforeHobbyAdjustment' | 'adjustmentReason' | 'adjustmentArrowDirection' | 'status'>[] },
  iterations: number
): Promise<MonteCarloSummary> => {
  const winCounts: { [horseId: string]: number } = {};
  raceConfig.participantsSetup.forEach(p => {
    winCounts[p.horse.id] = 0;
  });

  for (let i = 0; i < iterations; i++) {
    const iterationRace: Race = {
      id: uuidv4(), 
      name: "Monte Carlo Sim Race",
      trackName: raceConfig.trackName,
      distance: raceConfig.distance,
      trackCondition: raceConfig.trackCondition,
      purse: 0, 
      scheduledTime: new Date(), 
      targetRaceGrade: GRADES_ORDER[0], 
      participants: raceConfig.participantsSetup.map(pSetup => ({
        horse: deepClone(pSetup.horse), 
        jockey: deepClone(pSetup.jockey), 
        gate: pSetup.gate,
        odds: 0, 
        distanceCovered: 0,
        currentSpeed: 0,
        fatigue: 0,
        finishTime: null,
      })),
    };

    const { finalResults } = simulateRace(iterationRace); 

    if (finalResults.length > 0 && finalResults[0].finishPosition === 1 && !finalResults[0].participant.status) { 
      const winnerHorseId = finalResults[0].participant.horse.id;
      if (winCounts[winnerHorseId] !== undefined) {
        winCounts[winnerHorseId]++;
      }
    }
    if (i % 100 === 0) { 
        await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Calculate raw probabilities
  const rawProbabilities: { [horseId: string]: number } = {};
  raceConfig.participantsSetup.forEach(p => {
      rawProbabilities[p.horse.id] = iterations > 0 ? (winCounts[p.horse.id] || 0) / iterations : (1 / raceConfig.participantsSetup.length);
  });

  // Apply probability floor
  const flooredProbabilities: { [horseId: string]: number } = {};
  let totalFlooredProbability = 0;
  for (const horseId in rawProbabilities) {
      flooredProbabilities[horseId] = Math.max(rawProbabilities[horseId], MIN_RAW_MC_PROBABILITY_FLOOR);
      totalFlooredProbability += flooredProbabilities[horseId];
  }

  // Renormalize probabilities so they sum to 1
  const finalMcProbabilities: { [horseId: string]: number } = {};
  if (totalFlooredProbability > 0) {
      for (const horseId in flooredProbabilities) {
          finalMcProbabilities[horseId] = flooredProbabilities[horseId] / totalFlooredProbability;
      }
  } else if (raceConfig.participantsSetup.length > 0) { 
      // This case should ideally not be hit if MIN_RAW_MC_PROBABILITY_FLOOR > 0
      const numParticipants = raceConfig.participantsSetup.length;
      raceConfig.participantsSetup.forEach(p => {
          finalMcProbabilities[p.horse.id] = 1 / numParticipants;
      });
  }
  
  return { winCounts, totalSimulations: iterations, probabilities: finalMcProbabilities };
};

const getRaceNameSuffix = (grade: HorseGrade, speedBandName?: string): string => {
    if (speedBandName) {
        let mappedClass = "";
        if (speedBandName === "Spd 60-70") mappedClass = "Class D";
        else if (speedBandName === "Spd 70-80") mappedClass = "Class C";
        else if (speedBandName === "Spd 80-90") mappedClass = "Class B";
        else if (speedBandName === "Spd 90+") mappedClass = "Class A";
        
        if (mappedClass) {
            // Determine suffix based on the original target grade of the participants,
            // even if the class (D, C, B, A) is from the speed band.
            if (grade === HorseGrade.Elite) return `${mappedClass} Championship`;
            if (grade === HorseGrade.Maiden || grade === HorseGrade.Novice) return `${mappedClass} Stakes`;
            // For other grades or if a more specific suffix is desired for Class D, C, B, A.
            if (mappedClass === "Class A" || mappedClass === "Class B") return `${mappedClass} Cup`;
            return `${mappedClass} Handicap`; // Default for Class D, C, or others.
        }
    }
    // Fallback to original logic if no speedBandName or no mapping found
    if (grade === HorseGrade.Maiden) return "Maiden Stakes";
    if (grade === HorseGrade.Novice) return "Novice Hurdle";
    if (grade === HorseGrade.Elite) return "Championship Cup";
    return `Grade ${grade} Handicap`;
};

export const generateRaceWithMonteCarlo = async (
  allHorses: Horse[], 
  allJockeys: Jockey[],
  scheduledRaceDate: Date,
  isDebugMode: boolean = false, 
  iterations: number = MONTE_CARLO_ITERATIONS
): Promise<{ raceData: Race; monteCarloSummary: MonteCarloSummary }> => {
  const { selectedHorses, assignedJockeys, targetRaceGrade, targetSpeedBandName } = selectRaceParticipants(allHorses, allJockeys);
  
  if (selectedHorses.length < MIN_HORSES_PER_RACE) { 
     const emptyRace: Race = {
        id: uuidv4(), name: "No Suitable Race", trackName: getRandomElement(TRACK_NAMES),
        distance: getRandomElement(RACE_DISTANCES_AVAILABLE), trackCondition: getRandomElement(TRACK_CONDITIONS_AVAILABLE),
        participants: [], purse: 0, scheduledTime: scheduledRaceDate, targetRaceGrade, targetSpeedBandName
    };
    return { raceData: emptyRace, monteCarloSummary: { winCounts: {}, totalSimulations: 0, probabilities: {} } };
  }

  const participantsSetup: Omit<RaceParticipant, 'odds'|'finishTime'|'originalOddsBeforeHobbyAdjustment'|'adjustmentReason'|'adjustmentArrowDirection' | 'status'>[] = selectedHorses.map((horse, index) => ({
    horse, 
    jockey: assignedJockeys[index],
    gate: index + 1,
  }));

  const monteCarloRaceConfig = {
    trackName: getRandomElement(TRACK_NAMES), 
    distance: getRandomElement(RACE_DISTANCES_AVAILABLE),
    trackCondition: getRandomElement(TRACK_CONDITIONS_AVAILABLE), 
    participantsSetup,
  };

  const monteCarloResults = await runMonteCarloSimulation(monteCarloRaceConfig, iterations);
  
  const oddsCalculationInfos = calculateOddsWithAdjustments(
    participantsSetup, 
    monteCarloResults.probabilities || {}, 
    allHorses,
    isDebugMode
  );
  
  const finalParticipants: RaceParticipant[] = participantsSetup.map((p) => {
    const oddsInfo = oddsCalculationInfos.find(info => info.horseId === p.horse.id);
    return {
      ...p,
      odds: oddsInfo ? oddsInfo.finalOdds : (isDebugMode ? 9999 : ODDS_MAX_PAYOUT), 
      originalOddsBeforeHobbyAdjustment: oddsInfo ? oddsInfo.originalOdds : (isDebugMode ? 9999 : ODDS_MAX_PAYOUT),
      adjustmentReason: oddsInfo ? oddsInfo.reason : 'none',
      adjustmentArrowDirection: oddsInfo ? oddsInfo.arrowDirection : 'none',
      distanceCovered: 0,
      fatigue: 0,
      currentSpeed: 0,
      finishTime: null,
    };
  });

  const raceData: Race = {
    id: uuidv4(),
    name: `${getRandomElement(TRACK_NAMES)} ${getRaceNameSuffix(targetRaceGrade, targetSpeedBandName)}`,
    trackName: monteCarloRaceConfig.trackName, 
    distance: monteCarloRaceConfig.distance,   
    trackCondition: monteCarloRaceConfig.trackCondition, 
    participants: finalParticipants,
    purse: getRandomInt(5000, 50000) * (GRADES_ORDER.indexOf(targetRaceGrade) + 1), 
    scheduledTime: scheduledRaceDate, 
    targetRaceGrade: targetRaceGrade,
    targetSpeedBandName: targetSpeedBandName,
  };

  return { raceData, monteCarloSummary: monteCarloResults };
};


// const MAX_SPEED_MPS = 18; // Moved to constants.ts
const TIME_STEP_SECONDS = 0.1; 
const MAX_SIMULATION_ITERATIONS = 35000; 


export const calculateBest400mTime = (distanceTimePoints: { distance: number, time: number }[]): number | null => {
  if (distanceTimePoints.length < 2) return null;

  let bestTime: number | null = null;
  let k = 1; 

  for (let i = 0; i < distanceTimePoints.length; i++) {
    const p1 = distanceTimePoints[i];

    
    if (k <= i) {
      k = i + 1;
    }

    
    while (k < distanceTimePoints.length && distanceTimePoints[k].distance < p1.distance + 400) {
      k++;
    }

    if (k < distanceTimePoints.length) { 
      const p2 = distanceTimePoints[k];
      const p_prev = distanceTimePoints[k-1]; 
      
      const d_target = p1.distance + 400;
      
      let interpolatedTimeAtTarget: number;
      
      if (p2.distance === p_prev.distance) { 
        if (p2.distance >= d_target) interpolatedTimeAtTarget = p_prev.time; 
        else continue; 
      } else if (p_prev.distance >= d_target) { 
                                               
                                               
         interpolatedTimeAtTarget = p_prev.time; 
      } else { 
        interpolatedTimeAtTarget = p_prev.time + 
          (p2.time - p_prev.time) * 
          (d_target - p_prev.distance) / (p2.distance - p_prev.distance);
      }
      
      const segmentTime = interpolatedTimeAtTarget - p1.time;

      if (segmentTime > 0 && (bestTime === null || segmentTime < bestTime)) {
        bestTime = segmentTime;
      }
    } else {
      
      break; 
    }
  }
  return bestTime !== null ? parseFloat(bestTime.toFixed(2)) : null;
};

export const calculateLast400mTime = (
    distanceTimePoints: { distance: number, time: number }[], 
    raceDistanceMeters: number,
    finishTime: number | null
): number | null => {
    if (finishTime === null || raceDistanceMeters < 400 || distanceTimePoints.length < 2) {
        return null;
    }

    const targetStartDistance = raceDistanceMeters - 400;

    // Find the point just before or at targetStartDistance
    let p_before_idx = -1;
    for (let i = distanceTimePoints.length - 1; i >= 0; i--) {
        if (distanceTimePoints[i].distance <= targetStartDistance) {
            p_before_idx = i;
            break;
        }
    }
    
    if (p_before_idx === -1) { // Horse might have started after targetStartDistance or not reached it far enough
         // Check if the first point is already past the target start, means it never covered the segment properly.
        if(distanceTimePoints.length > 0 && distanceTimePoints[0].distance > targetStartDistance) return null;
         // Or if the last point is before the target start distance
        if(distanceTimePoints.length > 0 && distanceTimePoints[distanceTimePoints.length -1].distance < targetStartDistance) return null;
        return null; 
    }


    const p_before = distanceTimePoints[p_before_idx];
    let timeAtTargetStart: number;

    if (p_before.distance === targetStartDistance) {
        timeAtTargetStart = p_before.time;
    } else {
        // Find point just after targetStartDistance for interpolation
        let p_after_idx = -1;
        for (let i = p_before_idx + 1; i < distanceTimePoints.length; i++) {
            if (distanceTimePoints[i].distance >= targetStartDistance) {
                p_after_idx = i;
                break;
            }
        }
        if (p_after_idx === -1) return null; // Did not find a point after, cannot interpolate

        const p_after = distanceTimePoints[p_after_idx];
        if (p_after.distance === p_before.distance) return null; // No distance change, cannot interpolate time

        timeAtTargetStart = p_before.time + 
            (p_after.time - p_before.time) * 
            (targetStartDistance - p_before.distance) / (p_after.distance - p_before.distance);
    }

    if (isNaN(timeAtTargetStart) || !isFinite(timeAtTargetStart)) return null;

    const last400mSegmentTime = finishTime - timeAtTargetStart;

    if (last400mSegmentTime <= 0 || isNaN(last400mSegmentTime) || !isFinite(last400mSegmentTime) ) return null;

    return parseFloat(last400mSegmentTime.toFixed(2));
};


export const simulateRace = (race: Race): { snapshots: RaceSnapshot[], finalResults: RaceFinishOrderEntry[] } => {
  const snapshots: RaceSnapshot[] = [];
  const raceDistanceMeters = parseInt(race.distance.replace('m', ''));
  let currentSimulatedTime = 0;
  let simulationIterations = 0;

  let liveParticipants: LiveParticipantSimState[] = race.participants.map(p => ({
    ...deepClone(p), 
    internalDistanceCovered: 0,
    internalFatigue: 0, 
    internalCurrentSpeed: 0,
    internalFinishTime: null,
    finishedRace: false,
    raceDayFactor: 1 + (Math.random() - 0.5) * 0.45, 
    status: undefined, 
    distanceTimePoints: [], 
    best400mTimeForThisRace: null, 
    last400mTimeForThisRace: null,
  }));

  
   liveParticipants.forEach(lp => lp.distanceTimePoints.push({ distance: 0, time: 0 }));
   snapshots.push({
    segment: 1, 
    simulatedTimeElapsed: 0,
    participantStates: liveParticipants.map(lp => ({
      horseId: lp.horse.id,
      distanceCovered: 0,
      currentSpeed: 0,
      fatigue: 0, 
      status: lp.status, 
    })),
  });


  while (liveParticipants.some(lp => !lp.finishedRace) && simulationIterations < MAX_SIMULATION_ITERATIONS) {
    liveParticipants.forEach(lp => {
      if (lp.finishedRace) return;

      // Jockey fatigue management
      if (lp.internalFatigue > JOCKEY_MANAGE_FATIGUE_START_THRESHOLD) {
          const skillBasedReductionFactorBase = 0.90 - (lp.jockey.skill / 500); // Max skill (100) -> 0.70, Min skill (50) -> 0.80
          let skillBasedReductionFactor = Math.max(0.5, skillBasedReductionFactorBase - Math.random() * 0.15); // Add randomness

          // Less skilled jockeys might panic or misjudge more significantly
          if (lp.jockey.skill < 70) {
            skillBasedReductionFactor *= (1 - (Math.random() * 0.20)); // Further random reduction for low skill
          }
          
          // Reduce current speed based on this factor, but ensure it's a reduction
          const targetSpeedWithManagement = lp.internalCurrentSpeed * skillBasedReductionFactor;
          if (targetSpeedWithManagement < lp.internalCurrentSpeed) {
             lp.internalCurrentSpeed = Math.max(MAX_SPEED_MPS * 0.1, targetSpeedWithManagement); 
          }
          // This speed reduction will naturally reduce further fatigue gain in the next step
      }


      let currentTickSpeed = (lp.horse.speed / 100) * MAX_SPEED_MPS;
      currentTickSpeed *= lp.raceDayFactor;

      const accelerationPhaseLimit = raceDistanceMeters * 0.3;
      const accelerationProgress = Math.min(1, lp.internalDistanceCovered / accelerationPhaseLimit);
      const horseAccelerationFactor = (lp.horse.acceleration / 100) * 0.5 + 0.5; 
      const currentAccelerationEffect = 0.7 + (horseAccelerationFactor * 0.3 * accelerationProgress); 
      currentTickSpeed *= Math.min(1.15, currentAccelerationEffect + (1-accelerationProgress)*0.3); 

      const fatigueImpact = (lp.internalFatigue / 100) ** 1.8; 
      const staminaResistance = (lp.horse.stamina / 100);
      currentTickSpeed *= Math.max(0.25, 1 - (fatigueImpact * (1 - staminaResistance * 0.7))); 

      const jockeyPerformanceFactorThisTick = 1 + (Math.random() - 0.5) * 0.45; 
      let jockeySkillEffect = (1 + (lp.jockey.skill - 75) / 250); 
      jockeySkillEffect *= jockeyPerformanceFactorThisTick; 
      currentTickSpeed *= jockeySkillEffect;


      if (lp.jockey.specialty === 'Pace Setter') {
        currentTickSpeed *= (lp.internalDistanceCovered < raceDistanceMeters * 0.65 ? 1.035 : 0.96);
      } else if (lp.jockey.specialty === 'Closer') {
        currentTickSpeed *= (lp.internalDistanceCovered < raceDistanceMeters * 0.45 ? 0.965 : 1.04);
        if (lp.internalDistanceCovered > raceDistanceMeters * 0.75) { 
            currentTickSpeed *= (1 + (lp.horse.finishingKick / 250)); 
        }
      }
      
      if (lp.horse.preferredTrackCondition === race.trackCondition) currentTickSpeed *= 1.04;
      else if (
        (lp.horse.preferredTrackCondition === TrackCondition.Fast && (race.trackCondition === TrackCondition.Soft || race.trackCondition === TrackCondition.Heavy)) ||
        (lp.horse.preferredTrackCondition === TrackCondition.Heavy && (race.trackCondition === TrackCondition.Fast || race.trackCondition === TrackCondition.Good))
      ) currentTickSpeed *= 0.96;

      
      currentTickSpeed *= (1 + (FORM_RATINGS_ORDER.indexOf(lp.horse.form) - 2) * 0.06); 

      const consistencyFactor = (lp.horse.consistency / 100); 
      const randomVariance = (Math.random() - 0.5) * 0.7 * (1.1 - consistencyFactor); 
      currentTickSpeed *= (1 + randomVariance);

      const momentumRoll = Math.random();
      if (momentumRoll < 0.015) currentTickSpeed *= 1.25; 
      else if (momentumRoll < 0.030) currentTickSpeed *= 0.75; 
      
      let tripFactor = 1.0;
      const tripRoll = Math.random();
      if (tripRoll < 0.01) tripFactor = getRandomFloat(1.02, 1.05); 
      else if (tripRoll < 0.02) tripFactor = getRandomFloat(0.95, 0.98); 
      currentTickSpeed *= tripFactor;

      lp.internalCurrentSpeed = Math.max(MAX_SPEED_MPS * 0.15, currentTickSpeed); 
      const distanceMovedThisTick = lp.internalCurrentSpeed * TIME_STEP_SECONDS;
      lp.internalDistanceCovered += distanceMovedThisTick;

      if (lp.internalDistanceCovered >= raceDistanceMeters && !lp.finishedRace) {
        lp.finishedRace = true;
        const distanceOver = lp.internalDistanceCovered - raceDistanceMeters;
        const timeToCoverOver = lp.internalCurrentSpeed > 0 ? distanceOver / lp.internalCurrentSpeed : 0; 
        lp.internalFinishTime = currentSimulatedTime + TIME_STEP_SECONDS - timeToCoverOver;
        lp.internalDistanceCovered = raceDistanceMeters; 
      }

      const basePotentialSpeed = (lp.horse.speed / 100) * MAX_SPEED_MPS;
      const effortFactor = basePotentialSpeed > 0 ? (lp.internalCurrentSpeed / basePotentialSpeed) ** 1.5 : 1;
      const fatigueGainThisTick = (effortFactor * (TIME_STEP_SECONDS / 1.5)) * (1.6 - lp.horse.stamina / 100);
      lp.internalFatigue = Math.min(100, lp.internalFatigue + Math.max(0, fatigueGainThisTick));
    });

    currentSimulatedTime += TIME_STEP_SECONDS;
    simulationIterations++;

    liveParticipants.forEach(lp => {
      if (!lp.finishedRace) { 
         lp.distanceTimePoints.push({ distance: lp.internalDistanceCovered, time: currentSimulatedTime });
      } else if (lp.distanceTimePoints[lp.distanceTimePoints.length-1].distance < raceDistanceMeters) {
          
          lp.distanceTimePoints.push({ distance: raceDistanceMeters, time: lp.internalFinishTime! });
      }
    });

    let leaderDistance = 0;
    if (liveParticipants.length > 0) {
        leaderDistance = Math.max(...liveParticipants.filter(lp => !lp.status).map(lp => lp.internalDistanceCovered)); 
    }
    const currentSegmentForDisplay = Math.floor(leaderDistance / 50) + 1;

    snapshots.push({
      segment: currentSegmentForDisplay, 
      simulatedTimeElapsed: parseFloat(currentSimulatedTime.toFixed(2)),
      participantStates: liveParticipants.map(lp => ({
        horseId: lp.horse.id,
        distanceCovered: parseFloat(lp.internalDistanceCovered.toFixed(2)),
        currentSpeed: parseFloat(lp.internalCurrentSpeed.toFixed(2)),
        fatigue: parseFloat(lp.internalFatigue.toFixed(2)),
        status: lp.status, 
      })),
    });
  }

  const winner = liveParticipants.filter(lp => lp.internalFinishTime !== null && lp.internalFinishTime !== Infinity && !lp.status)
                               .sort((a,b) => a.internalFinishTime! - b.internalFinishTime!)[0];

  liveParticipants.forEach(lp => {
    if (!lp.finishedRace) { 
        lp.internalFinishTime = Infinity; 
        lp.finishedRace = true;
        
        if (lp.distanceTimePoints[lp.distanceTimePoints.length-1].time < currentSimulatedTime) {
             lp.distanceTimePoints.push({ distance: lp.internalDistanceCovered, time: currentSimulatedTime });
        }
    }
    if (lp.internalFinishTime === Infinity && !lp.status) { 
        if (winner && lp.internalDistanceCovered < raceDistanceMeters * DNF_DISTANCE_BEHIND_WINNER_THRESHOLD_PERCENT) {
            lp.status = 'DNF_TOO_FAR';
        } else if (!winner && lp.internalDistanceCovered < raceDistanceMeters * 0.5) { 
             lp.status = 'DNF_TOO_FAR';
        }
    }
    if (lp.internalFinishTime === null) lp.internalFinishTime = Infinity;

    
    lp.best400mTimeForThisRace = calculateBest400mTime(lp.distanceTimePoints);
    lp.last400mTimeForThisRace = calculateLast400mTime(lp.distanceTimePoints, raceDistanceMeters, lp.internalFinishTime !== Infinity ? lp.internalFinishTime : null);
  });

  liveParticipants.sort((a, b) => (a.internalFinishTime ?? Infinity) - (b.internalFinishTime ?? Infinity));

  const finalResults: RaceFinishOrderEntry[] = liveParticipants.map((lp, index) => {
    const originalParticipantDef = race.participants.find(p => p.horse.id === lp.horse.id);
    return {
      participant: { 
        horse: lp.horse, jockey: lp.jockey, gate: lp.gate,
        odds: originalParticipantDef ? originalParticipantDef.odds : lp.odds, 
        originalOddsBeforeHobbyAdjustment: originalParticipantDef?.originalOddsBeforeHobbyAdjustment,
        adjustmentReason: originalParticipantDef?.adjustmentReason,
        adjustmentArrowDirection: originalParticipantDef?.adjustmentArrowDirection,
        finishTime: lp.internalFinishTime !== Infinity ? parseFloat(lp.internalFinishTime!.toFixed(2)) : null,
        distanceCovered: parseFloat(lp.internalDistanceCovered.toFixed(2)),
        fatigue: parseFloat(lp.internalFatigue.toFixed(2)),
        currentSpeed: parseFloat(lp.internalCurrentSpeed.toFixed(2)),
        status: lp.status, 
      },
      finishPosition: lp.status ? 0 : index + 1, 
      best400mTimeForThisRace: lp.best400mTimeForThisRace,
      last400mTimeForThisRace: lp.last400mTimeForThisRace,
    };
  });
  return { snapshots, finalResults };
};


export const processBetResults = (
  playerCurrency: number, 
  bet: Bet, 
  raceResults: RaceFinishOrderEntry[], 
  race: Race 
): { newCurrency: number; winnings: number; message: string } => {
  const betOnParticipantEntry = raceResults.find(r => r.participant.horse.id === bet.horseId);

  if (!betOnParticipantEntry) {
    return { newCurrency: playerCurrency, winnings: 0, message: "Error processing bet: Horse not found in results." };
  }
  const betOnHorseName = betOnParticipantEntry.participant.horse.name;
  const betOnHorsePosition = betOnParticipantEntry.finishPosition;
  const betOnHorseStatus = betOnParticipantEntry.participant.status;


  let winnings = 0;
  let message = `Bet $${bet.stake} on ${betOnHorseName} to ${bet.type}. `;

  if (betOnHorseStatus) {
    winnings = -bet.stake;
    message += `It was DNF (${betOnHorseStatus.replace('_', ' ')}). You lost your stake.`;
  } else {
    switch (bet.type) {
      case BetType.Win:
        if (betOnHorsePosition === 1) {
          winnings = bet.stake * bet.oddsAtBetTime;
          message += `It WON! Collected $${winnings.toLocaleString()}!`;
        } else {
          winnings = -bet.stake;
          message += `It finished ${betOnHorsePosition}. Lost stake.`;
        }
        break;
      case BetType.Place:
        const placeOddsFactor = Math.max(1.1, bet.oddsAtBetTime / 4 + 0.5); 
        if (betOnHorsePosition <= 2 && betOnHorsePosition > 0) { 
          winnings = bet.stake * placeOddsFactor;
          message += `It PLACED (Finished ${betOnHorsePosition})! Collected $${winnings.toLocaleString()}!`;
        } else {
          winnings = -bet.stake;
          message += `It finished ${betOnHorsePosition}. Lost stake.`;
        }
        break;
      case BetType.Show:
        const showOddsFactor = Math.max(1.05, bet.oddsAtBetTime / 5 + 0.2); 
        if (betOnHorsePosition <= 3 && betOnHorsePosition > 0) { 
          winnings = bet.stake * showOddsFactor;
          message += `It SHOWED (Finished ${betOnHorsePosition})! Collected $${winnings.toLocaleString()}!`;
        } else {
          winnings = -bet.stake;
          message += `It finished ${betOnHorsePosition}. Lost stake.`;
        }
        break;
    }
  }
  winnings = parseFloat(winnings.toFixed(2));
  const netChange = winnings > 0 ? winnings - bet.stake : winnings; 
  const newCurrency = parseFloat((playerCurrency + netChange).toFixed(2));
  return { newCurrency, winnings: winnings > 0 ? winnings : 0, message };
};

export const updateHorseAfterRace = (horse: Horse, position: number, earnings: number, raceResult: PastRaceResult, numRunnersInRace: number): Horse => {
  const newCareerStats = { ...horse.careerStats };
  newCareerStats.races += 1;
  newCareerStats.earnings += earnings;

  if (!raceResult.status) { 
    if (position === 1) newCareerStats.wins += 1;
    else if (position === 2) newCareerStats.places += 1;
    else if (position === 3) newCareerStats.shows += 1;
  }

  let formIndex = FORM_RATINGS_ORDER.indexOf(horse.form);
  if (raceResult.status) { 
    formIndex = Math.max(0, formIndex - getRandomInt(1,3)); 
  } else if (position === 1) {
    formIndex = Math.min(FORM_RATINGS_ORDER.length - 1, formIndex + getRandomInt(1,2));
  } else if (position > Math.floor(MAX_HORSES_PER_RACE * 0.75)) {
     formIndex = Math.max(0, formIndex - getRandomInt(1,2)); 
  } else if (position > 3) {
    formIndex = Math.max(0, Math.min(FORM_RATINGS_ORDER.length - 1, formIndex + getRandomInt(-1,1) ));
  }
  const newForm = FORM_RATINGS_ORDER[formIndex];

  let newGrade = horse.grade;
  const currentGradeIndex = GRADES_ORDER.indexOf(horse.grade);

  if (!raceResult.status && position === 1) { 
    if (horse.grade === HorseGrade.Maiden) {
        newGrade = HorseGrade.Novice;
    } 
    else if (GRADES_ORDER.indexOf(raceResult.raceGrade) >= currentGradeIndex) {
        const racesInCurrentGradeBeforeThis = horse.raceHistory.filter(r => r.raceGrade === horse.grade && r.raceId !== raceResult.raceId).length;
        const winsInCurrentGradeBeforeThis = horse.raceHistory.filter(r => r.raceGrade === horse.grade && r.position === 1 && !r.status && r.raceId !== raceResult.raceId).length;
        
        const totalRacesInCurrentGrade = racesInCurrentGradeBeforeThis + 1; 
        const totalWinsInCurrentGrade = winsInCurrentGradeBeforeThis + 1; 

        if (currentGradeIndex < GRADES_ORDER.length - 1 && 
            (totalWinsInCurrentGrade >= WINS_FOR_GUARANTEED_PROMOTION_CHANCE && totalRacesInCurrentGrade >= RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION)) {
             if (Math.random() < 0.6) { 
                newGrade = GRADES_ORDER[currentGradeIndex + 1];
             }
        } else if (currentGradeIndex < GRADES_ORDER.length - 1 && Math.random() < 0.25) { 
             newGrade = GRADES_ORDER[currentGradeIndex + 1];
        }
    }
  } else { 
    if (currentGradeIndex > 0) { 
        const isPoorPerformance = raceResult.status || position >= Math.ceil(numRunnersInRace * DEMOTION_PERFORMANCE_THRESHOLD_POSITION);
        
        const poorPerformancesBeforeThis = horse.raceHistory.filter(r => {
            const participantCount = MAX_HORSES_PER_RACE; 
            return r.raceGrade === horse.grade && 
                   (r.status || r.position >= Math.ceil(participantCount * DEMOTION_PERFORMANCE_THRESHOLD_POSITION)) &&
                   r.raceId !== raceResult.raceId;
        }).length;
        
        const totalPoorPerformances = poorPerformancesBeforeThis + (isPoorPerformance ? 1 : 0);

        if (totalPoorPerformances >= RACES_FOR_DEMOTION_REVIEW && Math.random() < 0.3) { 
            newGrade = GRADES_ORDER[currentGradeIndex - 1];
        }
    }
  }


  let isLegendary = horse.isLegendary || false;
  if (!isLegendary) {
    const { races, wins, places } = newCareerStats; 
    const nonDnfRaces = horse.raceHistory.filter(r => !r.status).length + (!raceResult.status ? 1: 0); 
    const winPlaceCount = wins + (places || 0); 
    if (nonDnfRaces >= LEGENDARY_THRESHOLD_MIN_RACES_FOR_LEGENDARY) {
        if (wins >= LEGENDARY_THRESHOLD_WINS || 
            (nonDnfRaces > 0 && (winPlaceCount / nonDnfRaces) >= LEGENDARY_THRESHOLD_WIN_PLACE_PERCENT)) {
            isLegendary = true;
        }
    }
  }
  
  let best400mTime = horse.best400mTimeSecs;
  if (raceResult.best400mTimeInRace !== null && raceResult.best400mTimeInRace !== undefined) {
      if (best400mTime === null || raceResult.best400mTimeInRace < best400mTime) {
          best400mTime = raceResult.best400mTimeInRace;
      }
  }

  let bestLast400mTime = horse.bestLast400mTimeSecs;
  if (raceResult.last400mTimeInRace !== null && raceResult.last400mTimeInRace !== undefined) {
    if (bestLast400mTime === null || raceResult.last400mTimeInRace < bestLast400mTime) {
        bestLast400mTime = raceResult.last400mTimeInRace;
    }
  }

  const updatedRaceHistory = [raceResult, ...horse.raceHistory].slice(0, 20);

  return {
    ...horse,
    form: newForm,
    careerStats: newCareerStats,
    raceHistory: updatedRaceHistory, 
    isLegendary,
    grade: newGrade,
    best400mTimeSecs: best400mTime,
    bestLast400mTimeSecs: bestLast400mTime,
  };
};

export const updateJockeyAfterRace = (jockey: Jockey, position: number, isDnf: boolean): Jockey => {
    const newCareerStats = { ...jockey.careerStats };
    newCareerStats.races +=1;
    if (position === 1 && !isDnf) newCareerStats.wins +=1;
    if (position >= 1 && position <=3 && !isDnf) newCareerStats.top3Finishes +=1;
    newCareerStats.winPercentage = newCareerStats.races > 0 ? parseFloat(((newCareerStats.wins / newCareerStats.races) * 100).toFixed(2)) : 0;

    // Skill is now primarily from generation, not heavily influenced by individual races
    // let newSkill = jockey.skill;
    // if(position === 1 && !isDnf && Math.random() < 0.08) newSkill = Math.min(100, newSkill + 1); 
    // else if ((isDnf || position > MAX_HORSES_PER_RACE - 2) && Math.random() < 0.05) newSkill = Math.max(40, newSkill - 1); 

    return { ...jockey, careerStats: newCareerStats }; // Removed skill update from here
};

export const getPrizeDistribution = (purse: number, position: number, numRunners: number, isDnf: boolean): number => {
  if (isDnf || position === 0) return 0;
  
  let rawPrize = 0;
  if (position === 1) rawPrize = purse * 0.6;
  else if (position === 2 && numRunners >= 4) rawPrize = purse * 0.2;
  else if (position === 3 && numRunners >= 6) rawPrize = purse * 0.1;
  else if (position === 4 && numRunners >= 8) rawPrize = purse * 0.05;
  
  if (rawPrize === 0) return 0;

  return Math.round(rawPrize / 50) * 50;
};
