
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import HorseCard from './HorseCard';
import Modal from './Modal';
import {
  Horse, Jockey, Race, Bet, Player, BetType, RaceFinishOrderEntry, PastRaceResult, 
  RaceSnapshot, MonteCarloSummary, HorseGrade, DNFReason, ParticipantSnapshotState, RaceParticipantFullData,
  GeminiRaceSummary
} from '../types';
import * as gameLogic from '../services/gameLogic'; 
import { GoogleGenAI } from "@google/genai";
import { 
    INITIAL_PLAYER_CURRENCY, MIN_BET_AMOUNT, MONTE_CARLO_ITERATIONS, 
    MIN_HORSES_PER_RACE, INITIAL_GAME_YEAR, MIN_DAYS_BETWEEN_RACES, MAX_DAYS_BETWEEN_RACES,
    MAX_HORSE_AGE, AGE_DEVELOPMENT_PEAK, GRADES_ORDER, FORM_RATINGS_ORDER, MAX_PLAYERS,
    AUTOPILOT_BASE_POST_RACE_DELAY_MS, AUTOPILOT_BET_TURN_DELAY_MS, 
    BASE_SIMULATION_STEP_INTERVAL_MS, MANUAL_SIMULATION_SPEED_MULTIPLIER, 
    DEFAULT_NUM_HORSES_IN_GAME, MIN_HORSES_SETUP, MAX_HORSES_SETUP,
    DEFAULT_NUM_JOCKEYS_IN_GAME, MIN_JOCKEYS_SETUP, MAX_JOCKEYS_SETUP,
    WINS_FOR_GUARANTEED_PROMOTION_CHANCE, RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION, RACES_FOR_DEMOTION_REVIEW, DEMOTION_PERFORMANCE_THRESHOLD_POSITION,
    MAX_SPEED_MPS
} from '../constants';
import { ArrowPathIcon, InformationCircleIcon, ListBulletIcon, PlayIcon, BanknotesIcon, TrophyIcon, ClockIcon, Cog6ToothIcon, EyeIcon, CalendarDaysIcon, ShieldCheckIcon, QuestionMarkCircleIcon, AdjustmentsHorizontalIcon, ArrowUpIcon, ArrowDownIcon, UserPlusIcon, CheckCircleIcon, ForwardIcon as SkipTurnIcon, BoltIcon, ForwardIcon, UsersIcon, HashtagIcon, ChatBubbleLeftRightIcon, ChatBubbleOvalLeftEllipsisIcon, KeyIcon } from '@heroicons/react/24/outline';
import { StarIcon, UserCircleIcon } from '@heroicons/react/24/solid';

const horseSpriteColors = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
  'bg-lime-500', 'bg-emerald-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'
];

const gradeExplanations = [
  { title: HorseGrade.Maiden, description: "For horses that have not yet won a race. This is the starting point for all new horses." },
  { title: HorseGrade.Novice, description: "For horses with 1-2 wins. They've shown some promise but are still learning." },
  { title: HorseGrade.ClassD, description: "Stepping up in competition. Horses here are generally consistent performers." },
  { title: HorseGrade.ClassC, description: "A tougher class, requiring solid ability and consistency to compete well." },
  { title: HorseGrade.ClassB, description: "High-level competition. Horses in this grade are very talented." },
  { title: HorseGrade.ClassA, description: "Among the best racehorses. Races are highly competitive and feature top-tier talent." },
  { title: HorseGrade.Elite, description: "The pinnacle of horse racing. Reserved for champions and legendary horses." },
  { title: "Promotion Criteria", description: `Horses can be promoted by winning races, especially if the race grade is at or above their current grade. Winning ${WINS_FOR_GUARANTEED_PROMOTION_CHANCE} race(s) in their current grade (after at least ${RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION} starts in that grade) significantly increases promotion chances. Sometimes, exceptional performance might lead to a quicker promotion.` },
  { title: "Demotion Review", description: `Horses may be demoted if they consistently underperform. This is typically reviewed after about ${RACES_FOR_DEMOTION_REVIEW} races in their current grade where they finish in the bottom portion (e.g., outside the top ${100 - (DEMOTION_PERFORMANCE_THRESHOLD_POSITION * 100)}%) of finishers, or frequently DNF. Demotion helps ensure races remain competitive for all participants.` },
];

type HorseSortKey = 'name' | 'age' | 'grade' | 'earnings' | 'wins' | 'top3' | 'races' | 'form' | 'best400m' | 'bestLast400m'; // Removed speed, stamina, acceleration
type SortDirection = 'asc' | 'desc';
interface HorseSortConfig {
  key: HorseSortKey;
  direction: SortDirection;
}
type GameStage = 'setup' | 'betting' | 'raceInProgress' | 'raceResults';

let ai: GoogleGenAI | null = null;
try {
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
    }
} catch (error) {
    console.error("Error initializing GoogleGenAI:", error);
}


const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  
  // Setup State
  const [numberOfPlayersForSetup, setNumberOfPlayersForSetup] = useState<number>(1);
  const [playerNamesForSetup, setPlayerNamesForSetup] = useState<string[]>(Array(MAX_PLAYERS).fill('').map((_, i) => `Player ${i + 1}`));
  const [numberOfHorsesForSetup, setNumberOfHorsesForSetup] = useState<number>(MIN_HORSES_SETUP);
  const [generateHistoryForSetup, setGenerateHistoryForSetup] = useState<boolean>(true);
  const [numberOfJockeysForSetup, setNumberOfJockeysForSetup] = useState<number>(MIN_JOCKEYS_SETUP);

  const [gameStage, setGameStage] = useState<GameStage>('setup');
  
  const [allHorses, setAllHorses] = useState<Horse[]>([]);
  const [allJockeys, setAllJockeys] = useState<Jockey[]>([]);
  
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [activeBetsThisRace, setActiveBetsThisRace] = useState<{ [playerId: string]: Bet[] }>({});
  
  const [raceResults, setRaceResults] = useState<RaceFinishOrderEntry[] | null>(null); 
  const [simulationSnapshots, setSimulationSnapshots] = useState<RaceSnapshot[]>([]);
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState<number>(0);
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(false);
  const [finalSimResultsForProcessing, setFinalSimResultsForProcessing] = useState<RaceFinishOrderEntry[] | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isMonteCarloRunning, setIsMonteCarloRunning] = useState<boolean>(false);
  const [monteCarloDebugData, setMonteCarloDebugData] = useState<MonteCarloSummary | null>(null);
  const [showMonteCarloDebugModal, setShowMonteCarloDebugModal] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(true); 

  const [gameMessages, setGameMessages] = useState<string[]>([]);
  
  const [selectedHorseForBet, setSelectedHorseForBet] = useState<Horse | null>(null);
  const [betStake, setBetStake] = useState<string>(MIN_BET_AMOUNT.toString());
  const [betType, setBetType] = useState<BetType>(BetType.Win);
  
  const [showHorseListModal, setShowHorseListModal] = useState<boolean>(false);
  const [selectedHorseForDetails, setSelectedHorseForDetails] = useState<Horse | null>(null);
  const [showGradeHelpModal, setShowGradeHelpModal] = useState<boolean>(false);

  const [gameDate, setGameDate] = useState<Date>(new Date(INITIAL_GAME_YEAR, 0, 1)); 

  const [isAutopilotMode, setIsAutopilotMode] = useState<boolean>(false);
  const [autopilotSpeedMultiplier, setAutopilotSpeedMultiplier] = useState<number>(10);
  
  const [horseListSortConfig, setHorseListSortConfig] = useState<HorseSortConfig>({ key: 'grade', direction: 'desc' });

  const [raceSummaryData, setRaceSummaryData] = useState<GeminiRaceSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [isFastForwardingRaceEnd, setIsFastForwardingRaceEnd] = useState<boolean>(false);


  const addGameMessage = useCallback((message: string) => {
    setGameMessages(prev => [message, ...prev.slice(0, 4)]); // Keep last 5 messages
  }, []);

  const startRaceSimulation = useCallback((raceToSimulate: Race) => {
    if (!raceToSimulate) {
      addGameMessage("Error: Cannot start simulation, no race data provided.");
      setGameStage(isAutopilotMode ? 'raceResults' : 'betting'); // Go to results if autopilot, else back to betting
      setIsSimulatingLive(false);
      setIsLoading(false);
      if(isAutopilotMode && players.length > 0) setTimeout(() => handleNewRace(players, players[0]?.id), AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
      return;
    }
    
    if (!raceToSimulate.participants || raceToSimulate.participants.length === 0) {
        addGameMessage("Error: Cannot start simulation, provided race has no participants.");
        setGameStage(isAutopilotMode ? 'raceResults' : 'betting');
        setIsSimulatingLive(false);
        setIsLoading(false);
        setCurrentRace(null); 
        if(isAutopilotMode && players.length > 0) setTimeout(() => handleNewRace(players, players[0]?.id), AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
        return;
    }

    setIsLoading(true); 
    setIsSimulatingLive(true);
    setCurrentSnapshotIndex(0);
    setGameStage('raceInProgress');
    setSimulationSnapshots([]); 
    setRaceSummaryData(null); // Clear previous summary
    setIsFastForwardingRaceEnd(false); // Reset for new race

    try {
      const { snapshots, finalResults } = gameLogic.simulateRace(raceToSimulate);
      
      if (!snapshots || !Array.isArray(snapshots) || snapshots.length === 0) {
        console.error("Race simulation returned invalid or empty snapshots.", snapshots);
        addGameMessage("Error: Simulation generated no data. Race cannot be displayed.");
        setGameStage('raceResults'); 
        setIsSimulatingLive(false);
        setRaceResults([]); 
        setFinalSimResultsForProcessing(null); 
      } else {
        setSimulationSnapshots(snapshots);
        setFinalSimResultsForProcessing(finalResults); 
      }
    } catch (error: any) {
      console.error("Critical error during race simulation:", error);
      addGameMessage(`Error during race simulation: ${error.message || 'Unknown error'}. Race aborted.`);
      setGameStage('raceResults'); 
      setIsSimulatingLive(false);
      setRaceResults([]); 
      setFinalSimResultsForProcessing(null);
    } finally {
      setIsLoading(false); 
    }
  }, [addGameMessage, isAutopilotMode, players, autopilotSpeedMultiplier]); 

  const resetGameState = useCallback((isFullReset: boolean = true) => {
    console.log(`DEBUG: resetGameState called. isFullReset: ${isFullReset}`);
    if (isFullReset) {
      setPlayers([]); 
      setCurrentPlayerId(null);
      setGameStage('setup'); 
      setNumberOfPlayersForSetup(1);
      setPlayerNamesForSetup(Array(MAX_PLAYERS).fill('').map((_, i) => `Player ${i + 1}`));
      setNumberOfHorsesForSetup(MIN_HORSES_SETUP);
      setGenerateHistoryForSetup(true);
      setNumberOfJockeysForSetup(MIN_JOCKEYS_SETUP);
      
      // Use MIN_..._SETUP for initial horse/jockey pool on full reset, consistent with setup defaults
      setAllHorses(gameLogic.createInitialHorses(MIN_HORSES_SETUP, true));
      setAllJockeys(gameLogic.createInitialJockeys(MIN_JOCKEYS_SETUP));
    }
    setCurrentRace(null);
    setRaceResults(null);
    setActiveBetsThisRace({});
    setSimulationSnapshots([]);
    setCurrentSnapshotIndex(0);
    setIsSimulatingLive(false);
    setFinalSimResultsForProcessing(null);
    setIsMonteCarloRunning(false);
    setMonteCarloDebugData(null);
    setSelectedHorseForBet(null);
    setBetStake(MIN_BET_AMOUNT.toString());
    setBetType(BetType.Win);
    setRaceSummaryData(null);
    setIsFastForwardingRaceEnd(false);
    
    if (isFullReset) {
        setGameDate(new Date(INITIAL_GAME_YEAR, 0, 1));
        setGameMessages(["Game reset. Set up new game."]);
    }
    setIsLoading(false);
    console.log(`DEBUG: resetGameState finished. New gameStage: ${isFullReset ? 'setup' : gameStage}`);
  }, [gameStage]); // Removed setup state vars from deps as they are reset within
  
  useEffect(() => {
    // Initialize with minimums, consistent with new setup defaults
    const initialHorses = gameLogic.createInitialHorses(MIN_HORSES_SETUP, generateHistoryForSetup);
    const initialJockeys = gameLogic.createInitialJockeys(MIN_JOCKEYS_SETUP);
    setAllHorses(initialHorses);
    setAllJockeys(initialJockeys);
    setIsLoading(false); 
  }, [generateHistoryForSetup]); // Corrected dependency from empty array


  const handleDoneBettingOrPass = useCallback(() => {
    if (!currentPlayerId || !players.length || isAutopilotMode) return; 

    const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
    const player = players[currentPlayerIndex];
    
    addGameMessage(`${player.name} finished betting.`);

    setSelectedHorseForBet(null);
    setBetStake(MIN_BET_AMOUNT.toString());
    setBetType(BetType.Win);

    if (currentPlayerIndex < players.length - 1) {
      const nextPlayerId = players[currentPlayerIndex + 1].id;
      setCurrentPlayerId(nextPlayerId);
      addGameMessage(`${players[currentPlayerIndex + 1].name}'s turn to bet.`);
    } else {
      addGameMessage("All players have finished betting. Starting race...");
      setGameStage('raceInProgress');
      if (currentRace) {
        startRaceSimulation(currentRace);
      } else {
        addGameMessage("Error: Race data not available to start simulation. Please generate a new race.");
        setGameStage('betting'); 
      }
    }
  }, [currentPlayerId, players, addGameMessage, isAutopilotMode, currentRace, startRaceSimulation]);

  const handleNewRace = useCallback(async (
    initialPlayersListParam: Player[],
    initialPlayerIdForThisRaceContext?: string,
    initialHorsesForThisRaceContext?: Horse[] 
    ) => {
    console.log(`DEBUG: handleNewRace called. Autopilot: ${isAutopilotMode}`);
    const currentPlayersList = initialPlayersListParam;

    if (!currentPlayersList || currentPlayersList.length === 0) {
      addGameMessage("Cannot start a new race: No players defined. Please complete setup.");
      setIsLoading(false); 
      if (players.length === 0) setGameStage('setup'); 
      return;
    }
    
    let currentAllHorses = initialHorsesForThisRaceContext || allHorses;
    let currentAllJockeys = allJockeys;

    // Ensure horse/jockey pools are populated if they somehow became empty, using setup defaults
    if (currentAllHorses.length === 0 && !initialHorsesForThisRaceContext) {
      const newHorses = gameLogic.createInitialHorses(numberOfHorsesForSetup, generateHistoryForSetup);
      setAllHorses(newHorses); currentAllHorses = newHorses; 
      addGameMessage(`DEBUG: Horses repopulated in handleNewRace (was ${currentAllHorses.length}, now ${newHorses.length}) using setup values.`);
    }
    if (currentAllJockeys.length === 0) {
      const newJockeys = gameLogic.createInitialJockeys(numberOfJockeysForSetup);
      setAllJockeys(newJockeys); currentAllJockeys = newJockeys;
      addGameMessage(`DEBUG: Jockeys repopulated in handleNewRace (was ${currentAllJockeys.length}, now ${newJockeys.length}) using setup values.`);
    }
    
    const targetBettingPlayerId = initialPlayerIdForThisRaceContext || currentPlayersList[0]?.id;

    setIsLoading(true);
    setIsMonteCarloRunning(true);
    setRaceResults(null);
    setSelectedHorseForBet(null);
    setBetStake(MIN_BET_AMOUNT.toString());
    setBetType(BetType.Win);
    setSimulationSnapshots([]);
    setCurrentSnapshotIndex(0);
    setIsSimulatingLive(false);
    setFinalSimResultsForProcessing(null);
    setMonteCarloDebugData(null);
    setCurrentRace(null); 
    setRaceSummaryData(null);
    setIsFastForwardingRaceEnd(false);
    
    setCurrentPlayerId(targetBettingPlayerId);
    if (!isAutopilotMode) {
      setGameStage('betting'); 
    }
    
    let horsesForAgingCalc = [...currentAllHorses]; 
    const daysForward = gameLogic.getRandomInt(MIN_DAYS_BETWEEN_RACES, MAX_DAYS_BETWEEN_RACES);
    const nextRaceDate = new Date(gameDate); 
    const prevGameDateForAgingCheck = new Date(gameDate); 
    nextRaceDate.setDate(prevGameDateForAgingCheck.getDate() + daysForward);
    let agingMessages = "";
    const isNotInitialSetupRace = gameDate.getFullYear() !== INITIAL_GAME_YEAR || gameDate.getMonth() !== 0 || gameDate.getDate() !== 1;
    
    if (isNotInitialSetupRace && nextRaceDate.getFullYear() > prevGameDateForAgingCheck.getFullYear()) { 
        const yearsPassed = nextRaceDate.getFullYear() - prevGameDateForAgingCheck.getFullYear();
        agingMessages += ` ${yearsPassed} year(s) passed! Horses aged.`;
        horsesForAgingCalc = horsesForAgingCalc.map(h => {
            let newAge = h.age;
            let newSpeed = h.speed;
            let newStamina = h.stamina;
            let newAcceleration = h.acceleration;
            for (let y = 0; y < yearsPassed; y++) {
                const ageAfterThisYearPass = newAge + 1; 
                if (ageAfterThisYearPass <= AGE_DEVELOPMENT_PEAK -1) {
                    newSpeed = Math.min(100, newSpeed + gameLogic.getRandomInt(1, 3));
                    newStamina = Math.min(100, newStamina + gameLogic.getRandomInt(1, 3));
                    newAcceleration = Math.min(100, newAcceleration + gameLogic.getRandomInt(0, 2));
                } else if (ageAfterThisYearPass <= AGE_DEVELOPMENT_PEAK + 1) {
                    newSpeed += gameLogic.getRandomInt(-1, 1);
                    newStamina += gameLogic.getRandomInt(-1, 1);
                    newAcceleration += gameLogic.getRandomInt(-1, 1);
                } else if (ageAfterThisYearPass <= MAX_HORSE_AGE - 2) {
                    newSpeed = newSpeed - gameLogic.getRandomInt(0, 2);
                    newStamina = newStamina - gameLogic.getRandomInt(0, 2);
                    newAcceleration = newAcceleration - gameLogic.getRandomInt(0, 1);
                } else if (ageAfterThisYearPass <= MAX_HORSE_AGE) {
                    newSpeed = newSpeed - gameLogic.getRandomInt(1, 3);
                    newStamina = newStamina - gameLogic.getRandomInt(1, 3);
                    newAcceleration = newAcceleration - gameLogic.getRandomInt(1, 2);
                }
                newSpeed = Math.max(20, Math.min(100, newSpeed));
                newStamina = Math.max(20, Math.min(100, newStamina));
                newAcceleration = Math.max(20, Math.min(100, newAcceleration));
                newAge = ageAfterThisYearPass;
            }
            return {...h, age: newAge, speed: newSpeed, stamina: newStamina, acceleration: newAcceleration};
        }).filter(h => h.age <= MAX_HORSE_AGE); 
        
        const numToReplace = numberOfHorsesForSetup - horsesForAgingCalc.length; 
        if (numToReplace > 0) {
            const newYoungHorses = gameLogic.createInitialHorses(numToReplace, generateHistoryForSetup).map(h => ({...h, age: gameLogic.getRandomInt(2,3)}));
            horsesForAgingCalc.push(...newYoungHorses);
            agingMessages += ` ${numToReplace} new young horses entered the league.`;
        }
        setAllHorses(horsesForAgingCalc); 
    }
    if (isNotInitialSetupRace || currentPlayersList.length > 0) { 
      setGameDate(nextRaceDate);
    }

    try {
        const { raceData, monteCarloSummary } = await gameLogic.generateRaceWithMonteCarlo(horsesForAgingCalc, currentAllJockeys, nextRaceDate, isDebugMode, MONTE_CARLO_ITERATIONS);
        
        if(raceData.participants.length < MIN_HORSES_PER_RACE){
            addGameMessage(`Not enough suitable horses for a ${raceData.targetSpeedBandName || raceData.targetRaceGrade} race. Trying again...${agingMessages}`);
            if (isAutopilotMode) {
                const firstPlayerOfCurrentGame = currentPlayersList[0]?.id;
                setTimeout(() => handleNewRace(currentPlayersList, firstPlayerOfCurrentGame), AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
            } else {
                 setIsLoading(false); 
                 setIsMonteCarloRunning(false);
            }
        } else {
            setCurrentRace(raceData);
            setMonteCarloDebugData(monteCarloSummary);
            setActiveBetsThisRace({}); 

            if (isAutopilotMode) {
                addGameMessage(`Autopilot: Starting new race - ${raceData.name}. ${agingMessages}`);
                setGameStage('raceInProgress');
                startRaceSimulation(raceData);
            } else {
                const firstPlayerNameForMessage = (currentPlayersList.find(p=>p.id === targetBettingPlayerId)?.name) || "First player";
                addGameMessage(`Next race: ${raceData.name}. ${firstPlayerNameForMessage}'s turn to bet.${agingMessages}`);
            }
        }
    } catch (error) {
        console.error("Error generating race:", error);
        addGameMessage(`Error generating race. Please try again.${agingMessages}`);
    } finally {
        setIsLoading(false);
        setIsMonteCarloRunning(false);
    }
  }, [allHorses, allJockeys, gameDate, isAutopilotMode, autopilotSpeedMultiplier, addGameMessage, isDebugMode, players, startRaceSimulation, numberOfHorsesForSetup, generateHistoryForSetup, numberOfJockeysForSetup]);


  const handleStartMultiplayerGame = () => {
    const numPlayers = Math.max(1, Math.min(numberOfPlayersForSetup, MAX_PLAYERS));
    const newPlayers = Array.from({ length: numPlayers }, (_, i) => ({
      id: uuidv4(),
      name: playerNamesForSetup[i].trim() || `Player ${i + 1}`,
      currency: INITIAL_PLAYER_CURRENCY,
      ownedHorses: [],
    }));
    setPlayers(newPlayers);

    const horsesToCreate = gameLogic.createInitialHorses(numberOfHorsesForSetup, generateHistoryForSetup);
    const jockeysToCreate = gameLogic.createInitialJockeys(numberOfJockeysForSetup);
    setAllHorses(horsesToCreate);
    setAllJockeys(jockeysToCreate);
    
    if (isAutopilotMode) {
        addGameMessage(`${numPlayers} player game started with Autopilot ON. Universe has ${horsesToCreate.length} horses and ${jockeysToCreate.length} jockeys.`);
    } else {
        setCurrentPlayerId(newPlayers[0].id);
        setGameStage('betting'); 
        addGameMessage(`${numPlayers} player game started! ${newPlayers[0].name}'s turn to bet. Universe has ${horsesToCreate.length} horses and ${jockeysToCreate.length} jockeys.`);
    }
    handleNewRace(newPlayers, newPlayers[0].id, horsesToCreate); 
  };


  const handlePlaceBet = () => {
    if (isAutopilotMode) {
      addGameMessage("Autopilot is active. Bets are handled automatically (i.e., skipped).");
      return;
    }
    if (!currentRace || !selectedHorseForBet || !currentPlayerId) {
      addGameMessage("Error: No current race, selected horse, or current player to place bet.");
      return;
    }
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) {
        addGameMessage("Error: Current player not found.");
        return;
    }

    const stakeAmount = parseInt(betStake);
    const maxBetForPlayer = currentPlayer.currency * 0.5;

    if (isNaN(stakeAmount) || stakeAmount < MIN_BET_AMOUNT || stakeAmount > maxBetForPlayer) {
      addGameMessage(`${currentPlayer.name}, invalid bet amount. Must be between $${MIN_BET_AMOUNT} and $${gameLogic.formatOddsForDisplay(maxBetForPlayer)} (50% of your balance).`);
      return;
    }
    if (currentPlayer.currency < stakeAmount) {
      addGameMessage(`${currentPlayer.name}, not enough currency to place this bet.`);
      return;
    }

    const participant = currentRace.participants.find(p => p.horse.id === selectedHorseForBet.id);
    if (!participant) {
        addGameMessage("Selected horse not found in race participants.");
        return;
    }

    const newBet: Bet = {
      raceId: currentRace.id,
      horseId: selectedHorseForBet.id,
      jockeyId: participant.jockey.id,
      type: betType,
      stake: stakeAmount,
      oddsAtBetTime: participant.odds,
      playerId: currentPlayerId,
    };
    
    setActiveBetsThisRace(prev => ({
        ...prev,
        [currentPlayerId]: [...(prev[currentPlayerId] || []), newBet]
    }));

    setPlayers(prevPlayers => prevPlayers.map(p => 
        p.id === currentPlayerId ? { ...p, currency: p.currency - stakeAmount } : p
    ));
    addGameMessage(`${currentPlayer.name} bet $${stakeAmount} on ${selectedHorseForBet.name} to ${betType}. Odds: ${gameLogic.formatOddsForDisplay(participant.odds)}.`);
    setSelectedHorseForBet(null); 
    setBetStake(MIN_BET_AMOUNT.toString());
  };

  const getParticipantPositionAtDistance = (
    horseId: string,
    targetDistance: number,
    allSnapshots: RaceSnapshot[],
    raceDistanceMeters: number
  ): { position: number | null, speed: number | null } => {
      if (allSnapshots.length === 0) return { position: null, speed: null };
  
      let closestSnapshot: ParticipantSnapshotState | null = null;
      let bestSnapshotOverall: RaceSnapshot | null = null;
      let minDistanceDiff = Infinity;
  
      // Find the snapshot where the leader is closest to or just past the targetDistance
      for (const snap of allSnapshots) {
          const leaderDist = Math.max(...snap.participantStates.map(p => p.distanceCovered));
          const diff = Math.abs(leaderDist - targetDistance);
          if (diff < minDistanceDiff || (diff === minDistanceDiff && leaderDist >= targetDistance)) { // Prioritize snapshots at or after target
              minDistanceDiff = diff;
              bestSnapshotOverall = snap;
          }
          if (leaderDist >= raceDistanceMeters) break; // Stop if race is effectively over
      }
      
      if (!bestSnapshotOverall) return { position: null, speed: null };

      const participantsInSnapshot = [...bestSnapshotOverall.participantStates].sort((a, b) => b.distanceCovered - a.distanceCovered);
      const targetParticipantState = participantsInSnapshot.find(p => p.horseId === horseId);
  
      if (targetParticipantState) {
          const position = participantsInSnapshot.indexOf(targetParticipantState) + 1;
          return { position, speed: targetParticipantState.currentSpeed };
      }
      return { position: null, speed: null };
  };


  const generateRaceSummaryNarrative = async (
        race: Race, 
        results: RaceFinishOrderEntry[], 
        snapshots: RaceSnapshot[]
    ): Promise<GeminiRaceSummary | null> => {
        if (!ai) {
            console.warn("Gemini AI not initialized. Cannot generate race summary.");
            return { mainSummary: "Race summary generation is currently unavailable.", horseSentences: {} };
        }
        if (!race || results.length === 0 || snapshots.length === 0) return null;

        setIsGeneratingSummary(true);
        const raceDistanceMeters = parseInt(race.distance.replace('m', ''));

        const winnerEntry = results.find(r => r.finishPosition === 1 && !r.participant.status);
        
        const keyHorseDetailsForPrompt: string[] = [];
        const horseIdsForPrompt: string[] = [];

        if (winnerEntry) {
            keyHorseDetailsForPrompt.push(`- ${winnerEntry.participant.horse.name} (ID: ${winnerEntry.participant.horse.id}): Winner`);
            horseIdsForPrompt.push(winnerEntry.participant.horse.id);
        }

        // Early Leader (if not winner and notable)
        const quarterMarkSnapshotIndex = snapshots.findIndex(s => s.simulatedTimeElapsed > 0 && Math.max(...s.participantStates.map(p=>p.distanceCovered)) >= raceDistanceMeters * 0.25);
        if(quarterMarkSnapshotIndex !== -1){
            const earlySnaps = snapshots.slice(0, Math.min(snapshots.length, quarterMarkSnapshotIndex + Math.floor(snapshots.length * 0.2)));
            const leadCounts: {[horseId: string]: number} = {};
            for(const snap of earlySnaps) {
                if(snap.participantStates.length > 0){
                    const currentLeaderId = [...snap.participantStates].sort((a,b) => b.distanceCovered - a.distanceCovered)[0].horseId;
                    leadCounts[currentLeaderId] = (leadCounts[currentLeaderId] || 0) + 1;
                }
            }
            const sortedLeaders = Object.entries(leadCounts).sort((a,b) => b[1] - a[1]);
            if(sortedLeaders.length > 0){
                const earlyLeaderResult = results.find(r => r.participant.horse.id === sortedLeaders[0][0]);
                if(earlyLeaderResult && earlyLeaderResult.participant.horse.id !== winnerEntry?.participant.horse.id && earlyLeaderResult.finishPosition > 2 && !horseIdsForPrompt.includes(earlyLeaderResult.participant.horse.id)){
                     keyHorseDetailsForPrompt.push(`- ${earlyLeaderResult.participant.horse.name} (ID: ${earlyLeaderResult.participant.horse.id}): Early Leader who faded`);
                     horseIdsForPrompt.push(earlyLeaderResult.participant.horse.id);
                }
            }
        }
        
        // Strong Finisher (Top 3, not winner, and made up ground)
        const strongFinishers = results.filter(r => 
            !r.participant.status && 
            r.finishPosition > 1 && r.finishPosition <= 3 &&
            r.participant.horse.id !== winnerEntry?.participant.horse.id &&
            !horseIdsForPrompt.includes(r.participant.horse.id)
        );
        for (const finisherEntry of strongFinishers) {
            if (horseIdsForPrompt.length >= 3) break; // Limit to 3 key horses total for prompt brevity
            const finisher = finisherEntry.participant;
            const finisherPosAtHalf = getParticipantPositionAtDistance(finisher.horse.id, raceDistanceMeters * 0.5, snapshots, raceDistanceMeters);
            if (finisherPosAtHalf.position && finisherPosAtHalf.position > finisherEntry.finishPosition + 1 && finisherPosAtHalf.position > 3) {
                keyHorseDetailsForPrompt.push(`- ${finisher.horse.name} (ID: ${finisher.horse.id}): Strong Finisher`);
                horseIdsForPrompt.push(finisher.horse.id);
                break; 
            }
        }

        const prompt = `You are a concise horse racing commentator.
First, provide a general summary of the following race in 2-4 engaging sentences. Use phrases like 'started strong', 'led from the front', 'faded at X metres', and 'finished strongly' where appropriate.

Race Name: ${race.name}
Distance: ${race.distance}
Track Condition: ${race.trackCondition}
Number of Runners: ${race.participants.length}
Winner: ${winnerEntry ? winnerEntry.participant.horse.name : 'N/A'}

Second, for each of the following horses, provide a brief, one-sentence commentary on their specific performance in this race. Focus only on their individual story in THIS race.
${keyHorseDetailsForPrompt.length > 0 ? keyHorseDetailsForPrompt.join('\n') : "No specific key horses identified for individual commentary."}

Return your response as a JSON object with two keys:
1. "mainSummary": A string containing the general race summary.
2. "horseSentences": An object where each key is a horse ID (from the list above, if any) and the value is their one-sentence commentary string. If no specific horses were listed for individual commentary, this can be an empty object.

Example JSON format:
{
  "mainSummary": "The ${race.name} was a thrilling contest. ${winnerEntry ? winnerEntry.participant.horse.name : '[Winner]'} showed great determination to win.",
  "horseSentences": {
    ${horseIdsForPrompt.map(id => `"${id}": "Commentary for horse ${id}..."`).join(',\n    ')}
  }
}
Ensure the output is valid JSON. Do not include any markdown formatting like \`\`\`json around the JSON object.
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: prompt,
                config: { temperature: 0.6, topP: 0.9, responseMimeType: "application/json" }
            });
            
            let jsonStr = response.text.trim();
            // Remove potential markdown fences if Gemini adds them despite instruction
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
              jsonStr = match[2].trim();
            }
            
            const parsedData = JSON.parse(jsonStr) as GeminiRaceSummary;
            setIsGeneratingSummary(false);
            return parsedData;

        } catch (error: any) {
            console.error("Error generating race summary with Gemini:", error);
            setIsGeneratingSummary(false);
            return { mainSummary: `Error generating summary: ${error.message || "AI service unavailable."}`, horseSentences: {} };
        }
    };

  const processRaceEndLogic = useCallback(() => {
    if (finalSimResultsForProcessing && currentRace) {
        setRaceResults(finalSimResultsForProcessing);
        
        let allBetOutcomeMessages: string[] = [];
        let settledPlayersList: Player[] = players; // Capture current players state for autopilot context

        setPlayers(currentPlayersState => {
            let playersStateAfterBetsSettled = [...currentPlayersState];
            currentPlayersState.forEach(player => {
                const playerBetsForThisRace = activeBetsThisRace[player.id] || [];
                if (playerBetsForThisRace.length > 0 && player.id === currentPlayersState.find(p=>p.id === player.id)?.id) { // Ensure it's this player's turn context
                     allBetOutcomeMessages.push(`--- ${player.name}'s Bet Results ---`);
                }

                const originalPlayerBalanceWithStakesDeducted = playersStateAfterBetsSettled.find(p => p.id === player.id)!.currency;
                const totalStakesByPlayerThisRace = playerBetsForThisRace.reduce((sum, b) => sum + b.stake, 0);
                let runningBalanceForPlayerSettlement = originalPlayerBalanceWithStakesDeducted + totalStakesByPlayerThisRace;

                playerBetsForThisRace.forEach(bet => {
                    if (bet.raceId === currentRace!.id) {
                        const betProcessingResult = gameLogic.processBetResults(
                            runningBalanceForPlayerSettlement, bet, finalSimResultsForProcessing, currentRace!
                        );
                        runningBalanceForPlayerSettlement = betProcessingResult.newCurrency;
                        const outcomePrefix = betProcessingResult.winnings > 0 ? "WON" : "LOST";
                        allBetOutcomeMessages.push(`${player.name} ${outcomePrefix}: ${betProcessingResult.message}`);
                    }
                });
                playersStateAfterBetsSettled = playersStateAfterBetsSettled.map(p =>
                    p.id === player.id ? {...p, currency: parseFloat(runningBalanceForPlayerSettlement.toFixed(2))} : p
                );
            });
            settledPlayersList = playersStateAfterBetsSettled; // Update captured list
            return playersStateAfterBetsSettled;
        });
        
        if(allBetOutcomeMessages.length > 0) {
            setGameMessages(prev => [...allBetOutcomeMessages, ...prev.slice(0, Math.max(0, 5-allBetOutcomeMessages.length))]);
        } else if (!isAutopilotMode) { 
            addGameMessage("Race finished! No bets were placed for this race.");
        } else {
             addGameMessage("Autopilot race finished.");
        }

        let updatedHorsesListInterim = allHorses.map(horse => {
          const resultEntry = finalSimResultsForProcessing.find(r => r.participant.horse.id === horse.id);
          if (resultEntry && currentRace) { 
            const prize = gameLogic.getPrizeDistribution(currentRace.purse, resultEntry.finishPosition, currentRace.participants.length, !!resultEntry.participant.status);
            const pastRaceEntry: PastRaceResult = {
              raceId: currentRace.id, raceName: currentRace.name, trackName: currentRace.trackName,
              distance: currentRace.distance, condition: currentRace.trackCondition,
              jockeyName: resultEntry.participant.jockey.name, position: resultEntry.finishPosition,
              finishTime: resultEntry.participant.finishTime || undefined, status: resultEntry.participant.status,
              earnings: prize, date: new Date(gameDate), raceGrade: currentRace.targetRaceGrade,
              best400mTimeInRace: resultEntry.best400mTimeForThisRace,
              last400mTimeInRace: resultEntry.last400mTimeForThisRace,
            };
            return gameLogic.updateHorseAfterRace(horse, resultEntry.finishPosition, prize, pastRaceEntry, currentRace.participants.length);
          }
          return horse;
        });
        
        generateRaceSummaryNarrative(currentRace, finalSimResultsForProcessing, simulationSnapshots)
            .then(summaryData => {
                setRaceSummaryData(summaryData);
                if (summaryData && summaryData.horseSentences) {
                    updatedHorsesListInterim = updatedHorsesListInterim.map(horse => {
                        const raceResultForThisHorse = horse.raceHistory.find(hr => hr.raceId === currentRace?.id);
                        if (raceResultForThisHorse && summaryData.horseSentences[horse.id]) {
                            return {
                                ...horse,
                                raceHistory: horse.raceHistory.map(hr => 
                                    hr.raceId === currentRace?.id 
                                    ? { ...hr, horseSpecificSummarySentence: summaryData.horseSentences[horse.id] } 
                                    : hr
                                )
                            };
                        }
                        return horse;
                    });
                }
                setAllHorses(updatedHorsesListInterim);
            })
            .catch(err => {
                console.error("Failed to generate or process race summary:", err);
                setRaceSummaryData({ mainSummary: "Could not load race summary.", horseSentences: {} });
                setAllHorses(updatedHorsesListInterim); // Set horses even if summary fails
            })
            .finally(() => {
                if (isAutopilotMode) {
                    const autopilotDelay = Math.max(1, AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
                    setTimeout(() => handleNewRace(settledPlayersList, settledPlayersList[0]?.id), autopilotDelay);
                }
            });

        const updatedJockeysList = allJockeys.map(jockey => {
          const participatedEntry = finalSimResultsForProcessing.find(r => r.participant.jockey.id === jockey.id);
          if (participatedEntry) {
            return gameLogic.updateJockeyAfterRace(jockey, participatedEntry.finishPosition, !!participatedEntry.participant.status);
          }
          return jockey;
        });
        setAllJockeys(updatedJockeysList);
        
    } else {
        addGameMessage("Could not process race results: critical data missing for final processing stage.");
        if (isAutopilotMode && players.length > 0) {
             const autopilotDelay = Math.max(1, AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
             setTimeout(() => handleNewRace(players, players[0]?.id), autopilotDelay);
        }
    }
  }, [
    finalSimResultsForProcessing, currentRace, players, activeBetsThisRace, allHorses, allJockeys, gameDate,
    simulationSnapshots, addGameMessage, isAutopilotMode, autopilotSpeedMultiplier,
    generateRaceSummaryNarrative, handleNewRace // Removed state setters
  ]);


  useEffect(() => {
    let mainTimer: ReturnType<typeof setTimeout> | null = null;

    const performEndOfRaceProcessing = () => {
        setIsSimulatingLive(false);
        setGameStage('raceResults');
        if(isFastForwardingRaceEnd) setIsFastForwardingRaceEnd(false);
        processRaceEndLogic();
    };

    if (isFastForwardingRaceEnd) {
        mainTimer = setTimeout(() => {
            performEndOfRaceProcessing();
        }, 1000); // Show "Finishing Race..." for 1s

    } else if (isSimulatingLive && simulationSnapshots.length > 0 && currentSnapshotIndex < simulationSnapshots.length - 1) {
        const delay = isAutopilotMode 
                        ? BASE_SIMULATION_STEP_INTERVAL_MS / autopilotSpeedMultiplier 
                        : BASE_SIMULATION_STEP_INTERVAL_MS / MANUAL_SIMULATION_SPEED_MULTIPLIER;
        mainTimer = setTimeout(() => {
            const nextSnapshotIndex = currentSnapshotIndex + 1;
            const nextFrameSnapshot = simulationSnapshots[nextSnapshotIndex];

            if (nextFrameSnapshot && currentRace) {
                const raceDistMeters = parseInt(currentRace.distance.replace('m', ''));
                const finishedHorsesCount = nextFrameSnapshot.participantStates.filter(
                    ps => ps.distanceCovered >= raceDistMeters && !ps.status
                ).length;

                if (finishedHorsesCount >= 5 && nextSnapshotIndex < simulationSnapshots.length - 1) {
                    setIsFastForwardingRaceEnd(true);
                } else {
                    setCurrentSnapshotIndex(prev => prev + 1);
                }
            } else {
                 setCurrentSnapshotIndex(prev => prev + 1); 
            }
        }, Math.max(1, delay));

    } else if (isSimulatingLive && currentSnapshotIndex >= simulationSnapshots.length - 1 && simulationSnapshots.length > 0) {
        performEndOfRaceProcessing();
    }

    return () => {
        if (mainTimer) clearTimeout(mainTimer);
    };
  }, [
    isSimulatingLive, currentSnapshotIndex, simulationSnapshots, 
    isFastForwardingRaceEnd, currentRace, 
    processRaceEndLogic, 
    isAutopilotMode, autopilotSpeedMultiplier,
    MANUAL_SIMULATION_SPEED_MULTIPLIER, BASE_SIMULATION_STEP_INTERVAL_MS // Constants are stable
  ]);


  const handleToggleAutopilot = useCallback(() => {
    const newAutopilotState = !isAutopilotMode;
    setIsAutopilotMode(newAutopilotState);
    
    if (newAutopilotState) {
        addGameMessage(`Autopilot Enabled (Speed: ${autopilotSpeedMultiplier}x).`);
        if (gameStage === 'betting' && currentPlayerId && currentRace && currentRace.participants.length >= MIN_HORSES_PER_RACE && !isLoading) {
            addGameMessage("Autopilot engaged during betting. Starting race with current bets...");
            setGameStage('raceInProgress');
            startRaceSimulation(currentRace); 
        } else if (gameStage === 'raceResults' && !isLoading) { 
            const autopilotDelay = Math.max(1, AUTOPILOT_BASE_POST_RACE_DELAY_MS / autopilotSpeedMultiplier);
            addGameMessage("Autopilot: Scheduling next race from results.");
            setTimeout(() => handleNewRace(players, players[0]?.id), autopilotDelay);
        } else if (gameStage === 'setup' && !isLoading) {
             addGameMessage("Autopilot: Will start automatically after setup.");
        }
    } else {
        addGameMessage("Autopilot Disabled.");
        if (gameStage === 'raceInProgress' || isLoading) {
            addGameMessage("Manual control will resume after the current action/race completes.");
        }
    }
  }, [isAutopilotMode, autopilotSpeedMultiplier, gameStage, currentPlayerId, isLoading, players, currentRace, handleNewRace, addGameMessage, startRaceSimulation]);
  
  const sortHorses = (horses: Horse[], config: HorseSortConfig): Horse[] => {
    return [...horses].sort((a, b) => {
        let valA: string | number | null, valB: string | number | null;
        switch (config.key) {
            case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
            case 'age': valA = a.age; valB = b.age; break;
            case 'grade': valA = GRADES_ORDER.indexOf(a.grade); valB = GRADES_ORDER.indexOf(b.grade); break;
            case 'earnings': valA = a.careerStats.earnings; valB = b.careerStats.earnings; break;
            case 'wins': valA = a.careerStats.wins; valB = b.careerStats.wins; break;
            case 'top3': valA = a.careerStats.wins + a.careerStats.places + a.careerStats.shows; valB = b.careerStats.wins + b.careerStats.places + b.careerStats.shows; break;
            case 'races': valA = a.careerStats.races; valB = b.careerStats.races; break;
            case 'form': valA = FORM_RATINGS_ORDER.indexOf(a.form); valB = FORM_RATINGS_ORDER.indexOf(b.form); break;
            case 'best400m': valA = a.best400mTimeSecs; valB = b.best400mTimeSecs; break;
            case 'bestLast400m': valA = a.bestLast400mTimeSecs; valB = b.bestLast400mTimeSecs; break;
            default: valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        }

        if (valA === null && valB !== null) return config.direction === 'asc' ? 1 : -1; 
        if (valA !== null && valB === null) return config.direction === 'asc' ? -1 : 1; 
        if (valA === null && valB === null) return 0;


        if (typeof valA === 'string' && typeof valB === 'string') {
            const comparison = valA.localeCompare(valB);
            if (comparison !== 0) return config.direction === 'asc' ? comparison : -comparison;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            if (valA < valB) return config.direction === 'asc' ? -1 : 1;
            if (valA > valB) return config.direction === 'asc' ? 1 : -1;
        }
        
        if (config.key !== 'name') {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
        return 0;
    });
  };
  
  const handleHorseSortChange = (key: HorseSortKey) => {
    if (horseListSortConfig.key === key) {
      setHorseListSortConfig({ key, direction: horseListSortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      const defaultDirection = (key === 'name' || key === 'best400m' || key === 'bestLast400m') ? 'asc' : 'desc';
      setHorseListSortConfig({ key, direction: defaultDirection }); 
    }
  };

  const getBarColor = (value: number): string => {
    const v = Math.max(0, Math.min(1, value)); // Clamp value
    const hue = v * 120; // 0 is red, 60 is yellow, 120 is green
    return `hsl(${hue}, 100%, 45%)`;
  };

  const renderPlayerSetup = () => (
    <div className="p-6 bg-surface-card shadow-xl rounded-lg max-w-2xl mx-auto my-10">
      <h2 className="text-2xl font-bold text-brand-secondary mb-6 text-center">Game Setup</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
        <div>
            <label htmlFor="numPlayers" className="block text-sm font-medium text-text-secondary mb-1">Number of Players (1-{MAX_PLAYERS})</label>
            <input
            type="number"
            id="numPlayers"
            value={numberOfPlayersForSetup}
            onChange={(e) => setNumberOfPlayersForSetup(Math.max(1, Math.min(parseInt(e.target.value) || 1, MAX_PLAYERS)))}
            min="1"
            max={MAX_PLAYERS}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary bg-white text-text-primary"
            />
        </div>
        <div>
            <label htmlFor="numHorses" className="block text-sm font-medium text-text-secondary mb-1">
                Number of Horses ({MIN_HORSES_SETUP}-{MAX_HORSES_SETUP})
            </label>
            <input
                type="number"
                id="numHorses"
                value={numberOfHorsesForSetup}
                onChange={(e) => setNumberOfHorsesForSetup(Math.max(MIN_HORSES_SETUP, Math.min(parseInt(e.target.value) || MIN_HORSES_SETUP, MAX_HORSES_SETUP)))}
                min={MIN_HORSES_SETUP}
                max={MAX_HORSES_SETUP}
                step="10"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary bg-white text-text-primary"
            />
        </div>
        <div>
            <label htmlFor="numJockeys" className="block text-sm font-medium text-text-secondary mb-1">
                Number of Jockeys ({MIN_JOCKEYS_SETUP}-{MAX_JOCKEYS_SETUP})
            </label>
            <input
                type="number"
                id="numJockeys"
                value={numberOfJockeysForSetup}
                onChange={(e) => setNumberOfJockeysForSetup(Math.max(MIN_JOCKEYS_SETUP, Math.min(parseInt(e.target.value) || MIN_JOCKEYS_SETUP, MAX_JOCKEYS_SETUP)))}
                min={MIN_JOCKEYS_SETUP}
                max={MAX_JOCKEYS_SETUP}
                step="10"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary bg-white text-text-primary"
            />
        </div>
        <div className="flex items-center mt-4 md:mt-7">
            <input
                type="checkbox"
                id="generateHistory"
                checked={generateHistoryForSetup}
                onChange={(e) => setGenerateHistoryForSetup(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
            />
            <label htmlFor="generateHistory" className="ml-2 block text-sm text-text-secondary">
                Generate Horse History (Varied ages/grades)
            </label>
            <InformationCircleIcon className="h-4 w-4 ml-1 text-gray-400 cursor-help" title="If unchecked, all horses start as 2-3yo Maidens with no race history."/>
        </div>
      </div>
      
      {Array.from({ length: numberOfPlayersForSetup }).map((_, index) => (
        <div key={index} className="mb-3">
          <label htmlFor={`playerName${index}`} className="block text-xs font-medium text-text-secondary mb-0.5">Player {index + 1} Name</label>
          <input
            type="text"
            id={`playerName${index}`}
            value={playerNamesForSetup[index]}
            onChange={(e) => {
              const newNames = [...playerNamesForSetup];
              newNames[index] = e.target.value;
              setPlayerNamesForSetup(newNames);
            }}
            placeholder={`Player ${index + 1}`}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary text-sm bg-white text-text-primary"
          />
        </div>
      ))}
      <button
        onClick={handleStartMultiplayerGame}
        className="w-full mt-6 px-6 py-3 bg-brand-primary text-text-on-primary rounded-md hover:bg-brand-secondary transition-colors flex items-center justify-center shadow-lg text-lg font-semibold"
      >
        <UserPlusIcon className="h-6 w-6 mr-2" /> Start Game
      </button>
    </div>
  );
  
  const renderRaceTrack = () => {
    if (isFastForwardingRaceEnd) {
        return (
            <div className="my-6 p-4 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden text-white text-center h-64 flex items-center justify-center">
                <LoadingSpinner message="Finishing Race..." />
            </div>
        );
    }

    if (!currentRace || simulationSnapshots.length === 0) return null;
    
    const rawRaceDistance = parseInt(currentRace.distance.replace('m', ''));
    if (isNaN(rawRaceDistance) || rawRaceDistance <= 0) {
      console.error("Error: raceDistanceMeters is not a positive number in renderRaceTrack.", currentRace.distance, rawRaceDistance);
      return <div className="text-red-500 p-4 bg-white rounded-md shadow">Error: Invalid race distance configuration ("{currentRace.distance}"). Cannot render track.</div>;
    }
    const raceDistanceMeters = rawRaceDistance;

    const snapshot = simulationSnapshots[currentSnapshotIndex];
    if (!snapshot || !snapshot.participantStates) {
      console.error("Error: Snapshot or participantStates missing in renderRaceTrack. Index:", currentSnapshotIndex, "Snapshot data:", snapshot);
      return <div className="text-red-500 p-4 bg-white rounded-md shadow">Error: Missing simulation data for this frame.</div>;
    }
     if (snapshot.participantStates.length === 0 && currentRace.participants.length > 0) { 
        return (
            <div className="my-6 p-4 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden text-white text-center">
                Waiting for simulation data... (Snapshot participant states empty, current race has participants)
            </div>
        );
    }
     if (snapshot.participantStates.length === 0 && currentRace.participants.length === 0) {
        return (
             <div className="my-6 p-4 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden text-white text-center">
                Preparing race track data... (No participants in current snapshot or race)
            </div>
        );
    }


    return (
      <div className="my-6 p-4 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden" aria-label="Race track animation">
        <div className="absolute top-2 left-2 text-xs text-gray-300 z-30">
          Time: {snapshot.simulatedTimeElapsed.toFixed(1)}s / {(raceDistanceMeters/15).toFixed(0)}s est.
        </div>
         <div className="absolute top-2 right-2 text-xs text-gray-300 z-30">
          Segment: {snapshot.segment}
        </div>
        
        {/* Key/Legend for Bars */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 p-2 rounded-md shadow-lg text-white text-xs z-40">
          <div className="flex items-center mb-1">
            <KeyIcon className="h-3.5 w-3.5 mr-1 text-yellow-400"/> 
            <span className="font-semibold">Key:</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-gray-400 rounded-sm mr-1.5 shrink-0"></div>
            <span className="text-gray-300">Example Horse</span>
          </div>
          <div className="flex items-center mb-0.5">
            <span className="w-12 inline-block mr-1 text-gray-300">Stamina:</span>
            <div title="Example Stamina (Average)" className="w-8 h-1.5 bg-gray-700 rounded-sm overflow-hidden">
              <div 
                className="h-full rounded-sm" 
                style={{ width: `50%`, backgroundColor: getBarColor(0.5) }}
              ></div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="w-12 inline-block mr-1 text-gray-300">Speed:</span>
            <div title="Example Speed (Good)" className="w-8 h-1.5 bg-gray-700 rounded-sm overflow-hidden">
              <div 
                className="h-full rounded-sm" 
                style={{ width: `70%`, backgroundColor: getBarColor(0.7) }}
              ></div>
            </div>
          </div>
        </div>

        <div className="relative h-auto w-full bg-gray-700 rounded" style={{ paddingBottom: `${Math.max(MIN_HORSES_PER_RACE, currentRace.participants.length) * 3 + 4}%` }}> {/* Adjusted padding for taller elements */}
          <div className="absolute top-0 bottom-0 right-[5%] w-1 bg-white opacity-50 z-10" title="Finish Line"></div>
          <div className="absolute text-white text-[10px] font-semibold tracking-wider z-10"
             style={{
                top: '50%',
                right: 'calc(5% + 3px)', 
                transform: 'translateY(-50%) rotate(-90deg)',
             }}
          >FINISH</div>

          {snapshot.participantStates.map((ps, index) => {
            try {
                const participantDetails = currentRace.participants.find(p => p.horse.id === ps.horseId);
                if (!participantDetails) {
                    console.warn("renderRaceTrack: participantDetails not found for horseId:", ps.horseId, "in currentRace.participants. Snapshot ps:", ps, "CurrentRace participants:", currentRace.participants);
                    return (
                      <div key={`missing-${ps.horseId || index}`} className="absolute text-red-400 text-xs" style={{top: `${(index / Math.max(1,snapshot.participantStates.length)) * 90 + 5}%`}}>
                        Horse data missing for ID: {ps.horseId ? ps.horseId.substring(0,8) : 'N/A'}
                      </div>
                    );
                }
                
                let calculatedProgressPercent = (ps.distanceCovered / raceDistanceMeters) * 100 * 0.95;
                if (typeof ps.distanceCovered !== 'number' || isNaN(ps.distanceCovered) || !isFinite(ps.distanceCovered)) {
                    calculatedProgressPercent = 0;
                } else if (isNaN(calculatedProgressPercent) || !isFinite(calculatedProgressPercent)) {
                    calculatedProgressPercent = 0;
                }
                const progressPercent = Math.min(100, Math.max(0, calculatedProgressPercent));

                const horseColorClass = horseSpriteColors[participantDetails.gate % horseSpriteColors.length];
                
                let verticalCalcValue = 0;
                if (snapshot.participantStates.length > 0) {
                    verticalCalcValue = (index / snapshot.participantStates.length) * 90 + 5;
                }
                const verticalPosition = `${verticalCalcValue}%`; 

                const horseStatusFromSnapshot = ps.status; 
                const horseNameDisplay = typeof participantDetails.horse.name === 'string' ? participantDetails.horse.name.substring(0,12) : "Unknown";

                return (
                  <div 
                    key={ps.horseId} 
                    className="absolute transition-all duration-100 ease-linear flex items-start z-20" // items-start for vertical alignment
                    style={{ left: `${progressPercent}%`, top: verticalPosition, transitionTimingFunction: 'linear' }}
                    title={`${horseNameDisplay} (#${participantDetails.gate}) - Speed: ${(typeof ps.currentSpeed === 'number' ? ps.currentSpeed.toFixed(1) : 'N/A')} m/s, Fatigue: ${(typeof ps.fatigue === 'number' ? ps.fatigue.toFixed(0) : 'N/A')}%`}
                    role="img"
                    aria-label={`${horseNameDisplay}, gate ${participantDetails.gate}`}
                  >
                    <div className={`w-5 h-5 ${horseColorClass} rounded-sm shadow-md relative flex items-center justify-center mr-1 shrink-0`}>
                      <span className="text-white text-[10px] font-bold">{participantDetails.gate}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xs ${horseStatusFromSnapshot ? 'text-red-400 line-through' : 'text-gray-200' } whitespace-nowrap -mt-0.5`}>
                        {horseNameDisplay}{ps.distanceCovered >= raceDistanceMeters && !horseStatusFromSnapshot ? '🏁' : ''} {horseStatusFromSnapshot ? `(${horseStatusFromSnapshot.replace('DNF_', '')})`: ''}
                        </span>
                        {/* Stamina Bar (from fatigue) */}
                        <div title={`Stamina: ${((100 - (ps.fatigue || 0))).toFixed(0)}%`} className="w-10 h-1 bg-black bg-opacity-50 rounded-sm overflow-hidden my-0.5">
                        <div 
                            className="h-full rounded-sm transition-all duration-100 ease-linear" 
                            style={{ 
                            width: `${Math.max(0, Math.min(100, (100 - (ps.fatigue || 0))))}%`, 
                            backgroundColor: getBarColor((100 - (ps.fatigue || 0)) / 100) 
                            }}
                        ></div>
                        </div>
                        {/* Speed Bar */}
                        <div title={`Speed: ${(((ps.currentSpeed || 0) / MAX_SPEED_MPS) * 100).toFixed(0)}% of max`} className="w-10 h-1 bg-black bg-opacity-50 rounded-sm overflow-hidden">
                        <div 
                            className="h-full rounded-sm transition-all duration-100 ease-linear" 
                            style={{ 
                            width: `${Math.max(0, Math.min(100, ((ps.currentSpeed || 0) / MAX_SPEED_MPS) * 100))}%`, 
                            backgroundColor: getBarColor((ps.currentSpeed || 0) / MAX_SPEED_MPS) 
                            }}
                        ></div>
                        </div>
                    </div>
                  </div>
                );
            } catch (error) {
                console.error("Error rendering individual horse in race track:", error, "Participant snapshot data:", ps, "Index:", index, "Full snapshot:", snapshot);
                return <div key={`error-${ps.horseId || index}`} className="text-red-300 text-xs absolute" style={{top: `${(index / Math.max(1, snapshot.participantStates.length)) * 90 + 5}%`, left: '0%' }}>Error rendering horse.</div>;
            }
          })}
        </div>
      </div>
    );
  };

  if (isLoading && gameStage === 'setup' && players.length === 0 && !currentRace) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-ground">
      <LoadingSpinner size="lg" message="Initializing Your Racing Empire..." />
    </div>
  );
  
  const currentPlayerForBetting = players.find(p => p.id === currentPlayerId);
  const currentMaxBet = currentPlayerForBetting ? Math.floor(currentPlayerForBetting.currency * 0.5) : MIN_BET_AMOUNT;
  const sortedHorsesForModal = sortHorses(allHorses, horseListSortConfig);
  const sortableKeys: { key: HorseSortKey, label: string }[] = [
    { key: 'name', label: 'Name' }, { key: 'age', label: 'Age' }, { key: 'grade', label: 'Grade' },
    { key: 'earnings', label: 'Earnings' }, { key: 'wins', label: 'Wins' }, { key: 'top3', label: 'Top 3' },
    { key: 'races', label: 'Races' }, { key: 'form', label: 'Form' },
    {key: 'best400m', label: 'Best 400m'},
    {key: 'bestLast400m', label: 'Best Last 400m'}
  ];

  const sortedParticipantsForMCModal = (currentRace && monteCarloDebugData) 
    ? [...currentRace.participants]
      .map(p => ({
        ...p,
        mcProb: monteCarloDebugData.probabilities ? (monteCarloDebugData.probabilities[p.horse.id] || 0) : 0,
      }))
      .sort((a, b) => b.mcProb - a.mcProb)
    : [];


  return (
    <div className="min-h-screen bg-surface-ground text-text-primary flex flex-col">
      <Header
        players={players}
        currentPlayerId={currentPlayerId}
        gameDate={gameDate}
        isAutopilotMode={isAutopilotMode}
        onToggleAutopilot={handleToggleAutopilot}
        autopilotSpeedMultiplier={autopilotSpeedMultiplier}
        onSetAutopilotSpeedMultiplier={setAutopilotSpeedMultiplier}
        gameStage={gameStage}
      />

      <main className="container mx-auto p-4 flex-grow">
        {gameMessages.length > 0 && (
            <div className="mb-4 space-y-2">
                {gameMessages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-md text-sm opacity-${100 - idx*20} ${msg.toLowerCase().includes('error') || msg.toLowerCase().includes('lost stake') || msg.toLowerCase().includes('cannot start') || msg.toLowerCase().includes('aborted') ? 'bg-red-100 text-red-700' : msg.toLowerCase().includes('won') || msg.toLowerCase().includes('collected') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`} role="alert">
                        {msg}
                    </div>
                ))}
            </div>
        )}
        
        {gameStage === 'setup' && renderPlayerSetup()}
        {isMonteCarloRunning && <LoadingSpinner message="Calculating odds with Monte Carlo simulation..." />}

        {gameStage !== 'setup' && !isSimulatingLive && gameStage !== 'raceInProgress' && (
            <div className="mb-6 p-4 bg-surface-card shadow-md rounded-lg flex flex-wrap items-center justify-start gap-3">
                {((gameStage === 'betting' && !currentRace && !isMonteCarloRunning && players.length > 0) || (gameStage === 'raceResults' && !isAutopilotMode)) && (
                    <button
                    onClick={() => handleNewRace(players, currentPlayerId || players[0]?.id)}
                    disabled={isLoading || isMonteCarloRunning}
                    className="px-4 py-2 bg-brand-primary text-text-on-primary rounded-md hover:bg-brand-secondary transition-colors flex items-center shadow hover:shadow-lg disabled:opacity-50"
                    >
                    <PlayIcon className="h-5 w-5 mr-2" /> {gameStage === 'raceResults' ? "Next Race" : "Generate New Race"}
                    </button>
                )}
                 <button
                    onClick={() => setShowHorseListModal(true)}
                    className="px-4 py-2 bg-gray-200 text-text-secondary rounded-md hover:bg-gray-300 transition-colors flex items-center shadow hover:shadow-lg"
                    >
                    <ListBulletIcon className="h-5 w-5 mr-2" /> View All Horses ({allHorses.length})
                </button>
                 <button
                    onClick={() => setShowGradeHelpModal(true)} 
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center shadow hover:shadow-lg"
                    aria-label="Horse Grades Explained"
                    >
                    <QuestionMarkCircleIcon className="h-5 w-5 mr-2" /> Horse Grades Explained
                </button>
                 {isDebugMode && !isMonteCarloRunning && currentRace && (
                    <button
                    onClick={() => setShowMonteCarloDebugModal(true)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center shadow hover:shadow-lg"
                    title="Show Monte Carlo Simulation Data"
                    >
                    <Cog6ToothIcon className="h-5 w-5 mr-2" /> MC Data
                    </button>
                )}
                <button
                    onClick={() => resetGameState(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center shadow hover:shadow-lg"
                    >
                    <ArrowPathIcon className="h-5 w-5 mr-2" /> Reset Game
                </button>
            </div>
        )}

        {currentRace && gameStage === 'betting' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="p-4 bg-surface-card shadow-lg rounded-lg">
                    <h2 className="text-xl font-semibold text-brand-secondary mb-1 border-b pb-2">
                        <TrophyIcon className="h-6 w-6 inline mr-2 text-brand-accent" />
                        Race: {currentRace.name}
                    </h2>
                    <p className="text-sm text-gray-500 mb-0.5">Overall Grade Context: {currentRace.targetRaceGrade}</p>
                    {currentRace.targetSpeedBandName && <p className="text-xs text-gray-400 mb-2">Speed Tier: {currentRace.targetSpeedBandName}</p>}
                     {isAutopilotMode ? (
                         <div className="text-center my-3 p-3 bg-sky-50 rounded-md">
                            <p className="text-lg font-semibold text-sky-700">Autopilot Active</p>
                            <p className="text-sm text-sky-500">Bypassing bets, preparing for race...</p>
                            <LoadingSpinner size="sm" message="Auto-starting race..." />
                        </div>
                     ) : currentPlayerForBetting && (
                        <div className="text-center my-3 p-3 bg-indigo-50 rounded-md">
                            <p className="text-lg font-semibold text-indigo-700">{`${currentPlayerForBetting.name}'s Turn`}</p>
                            <p className="text-sm text-indigo-500">Balance: ${currentPlayerForBetting.currency.toLocaleString()}</p>
                        </div>
                     )}
                    <p className="text-sm text-text-secondary"><ClockIcon className="h-4 w-4 inline mr-1" /> Track: {currentRace.trackName}</p>
                    <p className="text-sm text-text-secondary"><Cog6ToothIcon className="h-4 w-4 inline mr-1" /> Distance: {currentRace.distance}</p>
                    <p className="text-sm text-text-secondary"><EyeIcon className="h-4 w-4 inline mr-1" /> Condition: {currentRace.trackCondition}</p>
                    <p className="text-sm text-text-secondary"><BanknotesIcon className="h-4 w-4 inline mr-1" /> Purse: ${currentRace.purse.toLocaleString()}</p>
                </div>

                {!isAutopilotMode && currentPlayerForBetting && (
                    <div className="p-4 bg-surface-card shadow-lg rounded-lg">
                    <h3 className="text-lg font-semibold text-brand-secondary mb-3">Place Your Bet</h3>
                    {selectedHorseForBet ? (
                        <>
                        <p className="mb-1 text-sm">Betting on: <span className="font-semibold">{selectedHorseForBet.name}</span></p>
                        <p className="mb-2 text-xs text-text-secondary">Odds: {gameLogic.formatOddsForDisplay(currentRace.participants.find(p=>p.horse.id === selectedHorseForBet?.id)?.odds)}</p>
                        <div className="mb-3">
                            <label htmlFor="betType" className="block text-xs font-medium text-text-secondary">Bet Type</label>
                            <select 
                            id="betType" value={betType} onChange={(e) => setBetType(e.target.value as BetType)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary text-sm bg-white text-text-primary"
                            >
                            {Object.values(BetType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="betStake" className="block text-xs font-medium text-text-secondary">Stake ($) (Min: ${MIN_BET_AMOUNT}, Max: ${currentMaxBet.toLocaleString()})</label>
                            <input
                            type="number" id="betStake" value={betStake} onChange={(e) => setBetStake(e.target.value)}
                            min={MIN_BET_AMOUNT} max={currentMaxBet} step="10"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary text-sm bg-white text-text-primary"
                            />
                        </div>
                        <button onClick={handlePlaceBet} className="w-full px-4 py-2 bg-brand-accent text-text-on-primary rounded-md hover:opacity-90 transition-opacity font-semibold flex items-center justify-center">
                            <CheckCircleIcon className="h-5 w-5 mr-2"/> Confirm Bet
                        </button>
                        </>
                    ) : ( <p className="text-sm text-text-secondary italic">Select a horse from the list to place a bet.</p> )}
                    
                    <button onClick={handleDoneBettingOrPass} className="mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-semibold flex items-center justify-center">
                        <SkipTurnIcon className="h-5 w-5 mr-2"/> Done Betting / Pass Turn
                    </button>

                    </div>
                )}
                 {(activeBetsThisRace[currentPlayerId] && activeBetsThisRace[currentPlayerId].length > 0 && !isAutopilotMode && currentPlayerForBetting) && (
                    <div className="p-4 bg-white shadow-lg rounded-lg">
                        <h4 className="text-md font-semibold text-brand-secondary mb-2">Your Bets This Race:</h4>
                        <ul className="space-y-2 text-xs max-h-40 overflow-y-auto">
                        {activeBetsThisRace[currentPlayerId].map((bet, index) => {
                            const horseName = currentRace?.participants.find(p => p.horse.id === bet.horseId)?.horse.name || 'Unknown Horse';
                            const potentialPayout = bet.stake * bet.oddsAtBetTime;
                            return (
                            <li key={index} className="p-2 border rounded-md bg-gray-50">
                                <div><strong>{horseName}</strong> to {bet.type}</div>
                                <div>Stake: ${bet.stake.toLocaleString()} @ {gameLogic.formatOddsForDisplay(bet.oddsAtBetTime)}</div>
                                <div>Potential Payout: ${potentialPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            </li>
                            );
                        })}
                        </ul>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2">
                 <div className="p-4 bg-surface-card shadow-lg rounded-lg max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-brand-secondary mb-3">Race Card</h3>
                    <div className="space-y-3">
                    {currentRace.participants.sort((a,b) => a.gate - b.gate).map(p => {
                        const horseHistory = p.horse.raceHistory.slice(0, 5);
                        let formString = "";
                        if (horseHistory.length > 0) {
                            formString = horseHistory.map(result => {
                                if (result.status) return 'D';
                                if (result.position >= 1 && result.position <= 9) return result.position.toString();
                                return '0';
                            }).join('');
                        }

                        return (
                        <div key={p.horse.id} 
                            className={`p-3 border rounded-md ${!isAutopilotMode ? 'cursor-pointer hover:shadow-lg' : ''} transition-all
                                        ${selectedHorseForBet?.id === p.horse.id && !isAutopilotMode ? 'border-brand-primary ring-2 ring-brand-primary bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => !isAutopilotMode && setSelectedHorseForBet(p.horse)}
                            role="button" aria-pressed={selectedHorseForBet?.id === p.horse.id && !isAutopilotMode} tabIndex={isAutopilotMode ? -1 : 0}
                        >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-md text-brand-secondary">
                                    #{p.gate} {p.horse.name} 
                                    {p.horse.isLegendary && <StarIcon className="h-4 w-4 inline text-yellow-400 ml-1" title="Legendary Horse"/>}
                                    {formString && <span className="text-xs text-gray-500 ml-1.5">({formString})</span>}
                                </p>
                                <p className="text-xs text-text-secondary">{p.horse.age}yo {p.horse.gender.charAt(0)} - Grade: {p.horse.grade} - Form: {p.horse.form}</p>
                                <p className="text-xs text-text-secondary">Jockey: {p.jockey.name} (Jky Top 3s: {p.jockey.careerStats.top3Finishes})</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-brand-primary">{gameLogic.formatOddsForDisplay(p.odds)}</p>
                                {isDebugMode && p.adjustmentReason !== 'none' && (
                                    <p className={`text-xs ${p.adjustmentArrowDirection === 'down' ? 'text-green-500' : 'text-red-500'}`}>
                                        {p.adjustmentArrowDirection === 'down' ? '▼' : '▲'} {gameLogic.formatOddsForDisplay(p.originalOddsBeforeHobbyAdjustment)} ({p.adjustmentReason})
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                            {p.horse.best400mTimeSecs && (
                                <span className="flex items-center" title="Best Overall 400m Time">
                                <BoltIcon className="h-3.5 w-3.5 inline mr-0.5 text-yellow-500" />
                                400m: {p.horse.best400mTimeSecs.toFixed(2)}s
                                </span>
                            )}
                            {p.horse.bestLast400mTimeSecs && (
                                <span className="flex items-center" title="Best Last 400m Time">
                                <ForwardIcon className="h-3.5 w-3.5 inline mr-0.5 text-orange-500" />
                                Last 400m: {p.horse.bestLast400mTimeSecs.toFixed(2)}s
                                </span>
                            )}
                        </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            </div>
          </div>
        )}

        {(isSimulatingLive || gameStage === 'raceInProgress') && renderRaceTrack()}

        {raceResults && gameStage === 'raceResults' && (
          <div className="mt-6 p-4 bg-surface-card shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-brand-secondary mb-4">Race Results: {currentRace?.name || "Completed Race"}</h2>
            {(raceResults.length === 0 && finalSimResultsForProcessing === null) && (
                 <p className="text-center text-lg text-red-500 p-4 bg-red-50 rounded-md">
                    The race was aborted or encountered an issue, and no results are available.
                 </p>
            )}
            {raceResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Pos</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Gate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Horse</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Jockey</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Odds</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Grade</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Time</th>
                       <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider" title="Best 400m time in this race">400m Split</th>
                       <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider" title="Last 400m time in this race">Last 400m</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Prize</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {raceResults.map((resultEntry) => {
                      const prizeMoney = currentRace ? gameLogic.getPrizeDistribution(currentRace.purse, resultEntry.finishPosition, currentRace.participants.length, !!resultEntry.participant.status) : 0;
                      const horseGlobalStats = allHorses.find(h => h.id === resultEntry.participant.horse.id);
                      
                      let isPersonalBest400m = false;
                      if (resultEntry.best400mTimeForThisRace !== null && horseGlobalStats) {
                          if (resultEntry.best400mTimeForThisRace === horseGlobalStats.best400mTimeSecs) {
                              isPersonalBest400m = true;
                          }
                      }

                      let isPersonalBestLast400m = false;
                      if (resultEntry.last400mTimeForThisRace !== null && horseGlobalStats) {
                          if (resultEntry.last400mTimeForThisRace === horseGlobalStats.bestLast400mTimeSecs) {
                            isPersonalBestLast400m = true;
                          }
                      }

                      return (
                        <tr key={resultEntry.participant.horse.id} className={`${resultEntry.finishPosition === 1 && !resultEntry.participant.status ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                            {resultEntry.participant.status 
                                ? <span className="text-red-500 font-bold">DNF</span> 
                                : resultEntry.finishPosition === 1 
                                    ? <TrophyIcon className="h-5 w-5 text-amber-500 inline-block" /> 
                                    : resultEntry.finishPosition
                            }
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">{resultEntry.participant.gate}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-primary font-semibold">{resultEntry.participant.horse.name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">{resultEntry.participant.jockey.name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">{gameLogic.formatOddsForDisplay(resultEntry.participant.odds)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">{resultEntry.participant.horse.grade}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">
                            {resultEntry.participant.finishTime ? `${resultEntry.participant.finishTime.toFixed(2)}s` : '-'}
                          </td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-text-secondary">
                                {resultEntry.best400mTimeForThisRace ? `${resultEntry.best400mTimeForThisRace.toFixed(2)}s` : '-'}
                                {isPersonalBest400m && <span className="ml-1 text-xs font-semibold text-green-600">(PB)</span>}
                           </td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-text-secondary">
                                {resultEntry.last400mTimeForThisRace ? `${resultEntry.last400mTimeForThisRace.toFixed(2)}s` : '-'}
                                {isPersonalBestLast400m && <span className="ml-1 text-xs font-semibold text-green-600">(PB)</span>}
                           </td>
                           <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {resultEntry.participant.status 
                                ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{resultEntry.participant.status.replace('_', ' ')}</span> 
                                : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Finished</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-semibold">${prizeMoney.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {gameStage === 'raceResults' && (
                <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 shadow">
                    <h3 className="text-lg font-semibold text-brand-secondary mb-2 flex items-center">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-brand-accent" />
                        Race Summary
                    </h3>
                    {isGeneratingSummary && <LoadingSpinner size="sm" message="Generating race summary..." />}
                    {!isGeneratingSummary && raceSummaryData && raceSummaryData.mainSummary && (
                        <p className="text-sm text-text-primary whitespace-pre-line">{raceSummaryData.mainSummary}</p>
                    )}
                    {!isGeneratingSummary && (!raceSummaryData || !raceSummaryData.mainSummary) && (
                        <p className="text-sm text-text-secondary italic">No summary available for this race.</p>
                    )}
                </div>
            )}
             {gameStage === 'raceResults' && !isAutopilotMode && players.length > 0 && (
                 <button
                    onClick={() => handleNewRace(players, currentPlayerId || players[0]?.id)}
                    disabled={isLoading || isMonteCarloRunning}
                    className="mt-6 px-6 py-3 bg-brand-primary text-text-on-primary rounded-md hover:bg-brand-secondary transition-colors flex items-center justify-center shadow-lg text-lg"
                    >
                    <PlayIcon className="h-6 w-6 mr-2" /> Next Race
                </button>
             )}
          </div>
        )}

      </main>
      
      <Modal isOpen={showHorseListModal} onClose={() => setShowHorseListModal(false)} title={`All Horses (${allHorses.length}) / Jockeys (${allJockeys.length})`} size="7xl">
        <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Sort by:</span>
            {sortableKeys.map(({key, label}) => (
                 <button
                    key={key}
                    onClick={() => handleHorseSortChange(key)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${horseListSortConfig.key === key ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-200 text-text-secondary hover:bg-gray-300'}`}
                 >
                    {label} {horseListSortConfig.key === key && (horseListSortConfig.direction === 'asc' ? '▲' : '▼')}
                 </button>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto p-1">
          {sortedHorsesForModal.map(horse => (
            <div key={horse.id} onClick={() => setSelectedHorseForDetails(horse)} className="cursor-pointer">
              <HorseCard horse={horse} showFullStats={isDebugMode || players.some(p => p.ownedHorses.find(h => h.id === horse.id))} />
            </div>
          ))}
        </div>
      </Modal>

      {selectedHorseForDetails && (
        <Modal isOpen={!!selectedHorseForDetails} onClose={() => setSelectedHorseForDetails(null)} title={`Horse Details: ${selectedHorseForDetails.name}`} size="4xl">
          <HorseCard horse={selectedHorseForDetails} showFullStats={true} />
        </Modal>
      )}
      
      {showGradeHelpModal && (
        <Modal isOpen={showGradeHelpModal} onClose={() => setShowGradeHelpModal(false)} title="Horse Grades Explained" size="2xl">
            <div className="space-y-4">
                {gradeExplanations.map(item => (
                    <div key={item.title}>
                        <h4 className="text-lg font-semibold text-brand-secondary">{item.title}</h4>
                        <p className="text-sm text-text-secondary">{item.description}</p>
                    </div>
                ))}
            </div>
        </Modal>
      )}

      {showMonteCarloDebugModal && monteCarloDebugData && currentRace && (
        <Modal isOpen={showMonteCarloDebugModal} onClose={() => setShowMonteCarloDebugModal(false)} title={`Monte Carlo Simulation Data (${currentRace.name})`} size="3xl">
            <div className="space-y-3">
                <p className="text-sm text-text-primary">Total simulations run: {monteCarloDebugData.totalSimulations.toLocaleString()}</p>
                <div className="max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">Horse</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">MC Wins</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">MC Prob.</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">Orig. Odds</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">Final Odds</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary uppercase tracking-wider">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedParticipantsForMCModal.map(p => {
                                const mcWins = monteCarloDebugData.winCounts ? monteCarloDebugData.winCounts[p.horse.id] : 0;
                                return (
                                    <tr key={p.horse.id} className="text-text-primary">
                                        <td className="px-3 py-2 whitespace-nowrap font-medium">{p.horse.name} (#{p.gate})</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{mcWins.toLocaleString()}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{(p.mcProb * 100).toFixed(2)}%</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{gameLogic.formatOddsForDisplay(p.originalOddsBeforeHobbyAdjustment)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{gameLogic.formatOddsForDisplay(p.odds)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {p.adjustmentReason !== 'none' && (
                                                 <span className={`text-xs ${p.adjustmentArrowDirection === 'down' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {p.adjustmentArrowDirection === 'down' ? '▼ ' : '▲ '}
                                                    ({p.adjustmentReason})
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
      )}


      <footer className="bg-brand-secondary text-text-on-primary text-center p-3 text-xs shadow-inner">
        Punter: Horse Racing Simulator. Enjoy the races!
      </footer>
    </div>
  );
};

export default App;
