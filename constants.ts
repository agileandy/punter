

import { HorseBreed, HorseGender, FormRating, TrackCondition, RaceDistance, HorseGrade } from './types';

export const INITIAL_PLAYER_CURRENCY = 10000;
export const MIN_BET_AMOUNT = 10;
// export const MAX_BET_AMOUNT = 1000; // Removed, will be dynamic (50% of player balance)
export const MAX_PLAYERS = 5;

export const HORSE_NAMES_PREFIX = Array.from(new Set([
  "Swift", "Gallant", "Noble", "Iron", "Golden", "Shadow", "Lightning", "Wind", "Star", "Royal",
  "Midnight", "Crimson", "Silver", "Diamond", "Blazing", "Thunder", "Mystic", "Velvet", "Whispering", "Sun",
  "Moonlit", "Dawn", "Dusk", "Twilight", "Silent", "Brave", "Bold", "Quick", "Steady", "Grand",
  "Majestic", "Regal", "Victory", "Glory", "Lucky", "Fortune", "Destiny", "Phantom", "Spirit", "Comet",
  "Meteor", "Galaxy", "Nebula", "Oracle", "Prophet", "Legend", "Mythic", "Ancient", "Titan", "Zephyr",
  "Storm", "Hurricane", "Typhoon", "Cyclone", "Blizzard", "Avalanche", "River", "Mountain", "Forest", "Desert",
  "Ocean", "Sky", "Cloud", "Steel", "Bronze", "Copper", "Ruby", "Sapphire", "Emerald", "Opal", "Jasper",
  "Phoenix", "Griffin", "Dragon", "Unicorn", "Pegasus", "Centaur", "Sphinx", "Hydra", "Cerberus", "Minotaur",
  "Captain", "Admiral", "General", "Commander", "Major", "Sergeant", "Baron", "Duke", "Count", "Viscount",
  "King", "Queen", "Prince", "Princess", "Emperor", "Empress", "Sultan", "Pharaoh", "Chief", "Warrior",
  "Azure", "Final", "True", "Moon", "Ghost", "Wild", "Proud", "Keen", "Dark", "Bright", "Frozen", "Silk",
  "Giant", "First", "Last", "Alpha", "Omega", "Prime", "King's", "Queen's", "Prince's", "Duke's", "Lady's",
  "Baron's", "Knight's", "Secret", "Hidden", "Lost", "Future", "Cosmic", "Solar", "Lunar", "Terra", "Aero",
  "Aqua", "Ignis", "Nimbus", "Legacy", "Honor", "Valour", "Rebel", "Rogue", "Bandit", "Outlaw", "Drifter",
  "Voyager", "Pilgrim", "Sentinel", "Guardian", "Warden", "Apex", "Zenith", "Sovereign", "Imperial"
]));


export const HORSE_NAMES_SUFFIX = Array.from(new Set([
  "Runner", "Dancer", "Striker", "Comet", "Dreamer", "King", "Queen", "Prince", "Baron", "Legend",
  "Glory", "Spirit", "Fury", "Storm", "Arrow", "Flame", "Knight", "Grace", "Hope", "Victory",
  "Star", "Moon", "Sun", "Light", "Shade", "Mist", "Song", "Rhythm", "Melody", "Echo", "Whisper",
  "Tale", "Fable", "Story", "Poem", "Quest", "Journey", "Saga", "Legacy", "Heir", "Successor",
  "Champion", "Hero", "Guardian", "Protector", "Savior", "Conqueror", "Vanquisher", "Avenger", "Defender", "Crusader",
  "Pioneer", "Explorer", "Wanderer", "Voyager", "Pilgrim", "Nomad", "Drifter", "Ranger", "Scout", "Pathfinder",
  "Jewel", "Gem", "Treasure", "Charm", "Talisman", "Amulet", "Relic", "Artifact", "Wonder", "Miracle",
  "Secret", "Mystery", "Enigma", "Riddle", "Puzzle", "Paradox", "Illusion", "Mirage", "Fantasy", "Vision",
  "Destiny", "Fate", "Fortune", "Kismet", "Chance", "Luck", "Serendipity", "Providence", "Oracle", "Prophecy",
  "Princess", "Duke", "Lady", "Flyer", "Gallop", "Dream", "Magic", "Wind", "Fire", "Myth", "Path", "Blade",
  "Shield", "Crown", "Gold", "Silver", "Coin", "Faith", "Pride", "Joy", "Roar", "Cry", "Call", "Wish", "Vow",
  "", "Nova", "Streak", "Dash", "Bolt", "Flash", "River", "Mountain", "Sky", "Cloud", "Sea", "Wave", "Tide",
  "Heart", "Soul", "Ghost", "Phantom", "Code", "Sign", "Mark", "Symbol", "Honor", "Spear", "Warrior", "Fox",
  "Hawk", "Eagle"
]));


export const JOCKEY_FIRST_NAMES = [
  "Alex", "Jamie", "Chris", "Pat", "Sam", "Lee", "Mike", "Ryan", "Frankie", "Will",
  "Katie", "Nina", "Hollie", "Rachael", "Josephine", "Bryony", "Megan", "Nicola", "Hayley", "Sophie",
  "Ben", "Tom", "James", "Daniel", "Adam", "Luke", "Mark", "Paul", "David", "Richard",
  "Olivia", "Chloe", "Jessica", "Emily", "Laura", "Sarah", "Emma", "Hannah", "Georgia", "Abigail",
  "Liam", "Noah", "Oliver", "Elijah", "William", "Lucas", "Henry", "Theodore", "Jack", "Levi",
  "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn", "Ava", "Luna", "Camila",
  "Mateo", "Sebastian", "Ethan", "Leo", "Owen", "Ezra", "Michael", "Muhammad", "Jayden", "Asher",
  "Aria", "Scarlett", "Grace", "Ellie", "Nora", "Riley", "Zoe", "Penelope", "Lily", "Layla"
];
export const JOCKEY_LAST_NAMES = [
  "Smith", "Jones", "Moore", "Dettori", "Buick", "Egan", "Spencer", "Murphy", "Atzeni", "Doyle",
  "McDonald", "Berry", "Shoemaker", "Day", "Velazquez", "Ortiz", "Castellano", "Prado", "Stevens", "McCarron",
  "Williams", "Brown", "Davis", "Miller", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White",
  "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
  "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams",
  "Nelson", "Hill", "Ramirez", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans", "Turner",
  "Torres", "Parker", "Collins", "Edwards", "Stewart", "Flores", "Morris", "Nguyen", "Murphy", "Rivera",
  "Cook", "Rogers", "Morgan", "Peterson", "Cooper", "Reed", "Bailey", "Bell", "Gomez", "Kelly",
  "Howard", "Ward", "Cox", "Diaz", "Richardson", "Wood", "Watson", "Brooks", "Bennett", "Gray",
  "James", "Reyes", "Cruz", "Hughes", "Price", "Myers", "Long", "Foster", "Sanders", "Ross"
];

export const HORSE_COLORS = ["Bay", "Chestnut", "Gray", "Black", "Brown", "Roan", "Palomino", "Dun", "Buckskin", "Cremello", "Perlino"];

export const HORSE_BREEDS_AVAILABLE: HorseBreed[] = [HorseBreed.Thoroughbred, HorseBreed.Arabian, HorseBreed.QuarterHorse];
export const HORSE_GENDERS_AVAILABLE: HorseGender[] = [HorseGender.Male, HorseGender.Female];
export const FORM_RATINGS_ORDER: FormRating[] = [FormRating.Terrible, FormRating.Poor, FormRating.Average, FormRating.Good, FormRating.Excellent];

export const TRACK_NAMES = Array.from(new Set([
  "Emerald Downs", "Golden Gate Fields", "Santa Anita Park", "Churchill Downs", "Belmont Park",
  "Saratoga Race Course", "Ascot Racecourse", "Flemington Racecourse", "Longchamp Racecourse", "Tokyo Racecourse",
  "Del Mar Racetrack", "Keeneland", "Pimlico Race Course", "Gulfstream Park", "Monmouth Park", "Woodbine Racetrack",
  "Nakayama Racecourse", "Sha Tin Racecourse", "Meydan Racecourse", "Curragh Racecourse",
  "Aintree Racecourse", "Cheltenham Racecourse", "Epsom Downs Racecourse", "Goodwood Racecourse", "Newmarket Racecourse",
  "Hanshin Racecourse", "Kyoto Racecourse", "Randwick Racecourse", "Caulfield Racecourse", "Leopardstown Racecourse"
]));
export const TRACK_CONDITIONS_AVAILABLE: TrackCondition[] = [TrackCondition.Fast, TrackCondition.Good, TrackCondition.Soft, TrackCondition.Heavy];
export const RACE_DISTANCES_AVAILABLE: RaceDistance[] = [RaceDistance.Sprint, RaceDistance.Middle, RaceDistance.Long];

export const DEFAULT_NUM_HORSES_IN_GAME = 600;
export const MIN_HORSES_SETUP = 50;
export const MAX_HORSES_SETUP = 500;

export const DEFAULT_NUM_JOCKEYS_IN_GAME = 200;
export const MIN_JOCKEYS_SETUP = 50;
export const MAX_JOCKEYS_SETUP = 200;

export const MIN_HORSES_PER_RACE = 6;
export const MAX_HORSES_PER_RACE = 15; // Max per race can be smaller than total pool

export const AGE_DEVELOPMENT_PEAK = 5; // Age when stats might peak (e.g. 4-5 year olds are at their best)
export const MAX_HORSE_AGE = 12; // Max age before retirement or significant decline

export const ODDS_MIN_PAYOUT = 1.1; // Minimum payout for a strong favorite
export const ODDS_MAX_PAYOUT = 100; // Maximum payout for a longshot (e.g. 74/1)
export const ODDS_OVERROUND_FACTOR = 1.20; // Bookmaker's margin (e.g., 1.20 for a 20% overround)

export const MONTE_CARLO_ITERATIONS = 1000; // Number of simulations for odds calculation
export const MIN_RAW_MC_PROBABILITY_FLOOR = 0.0004; // New: Minimum probability for a horse from raw MC results before hobbyist adjustments, to prevent near-infinite odds. (0.0004 implies ~2083/1 max initial odds before hobbyist changes)


// Legendary Horse Constants
export const LEGENDARY_THRESHOLD_WINS = 12;
export const LEGENDARY_THRESHOLD_WIN_PLACE_PERCENT = 0.70; // 70%
export const LEGENDARY_THRESHOLD_MIN_RACES_FOR_LEGENDARY = 10; // Min races to be considered for legendary by win %

// Hobby Punter Odds Adjustment Constants
export const HIGH_SKILL_JOCKEY_THRESHOLD = 85;
export const AVERAGE_HORSE_STAT_MIN = 60;
export const AVERAGE_HORSE_STAT_MAX = 75;
export const MIN_ODDS_MULTIPLIER_EFFECT = 0.3; // Odds will be multiplied by a random factor between this and MAX_ODDS_MULTIPLIER_EFFECT
export const MAX_ODDS_MULTIPLIER_EFFECT = 0.6; // (e.g. 0.6 means odds become 60% of original), was 0.7


// Race Date Constants
export const MIN_DAYS_BETWEEN_RACES = 5;
export const MAX_DAYS_BETWEEN_RACES = 10;
export const INITIAL_GAME_YEAR = 2025;

// Horse Grading Constants
export const INITIAL_HORSE_GRADE = HorseGrade.Maiden;
export const GRADES_ORDER: HorseGrade[] = [
  HorseGrade.Maiden, HorseGrade.Novice, HorseGrade.ClassD, HorseGrade.ClassC, 
  HorseGrade.ClassB, HorseGrade.ClassA, HorseGrade.Elite
];
export const RACES_IN_GRADE_FOR_PROMOTION_CONSIDERATION = 3; // Min races in current grade before auto promotion (win-based)
export const WINS_FOR_GUARANTEED_PROMOTION_CHANCE = 1; // Wins needed in current grade for a high chance of promotion
export const RACES_FOR_DEMOTION_REVIEW = 5; // Number of poor performance races to consider demotion
export const DEMOTION_PERFORMANCE_THRESHOLD_POSITION = 0.75; // Finish in bottom 25% to count as poor
export const MIN_HORSES_FOR_GRADE_SPECIFIC_RACE = 4; // Min horses needed in a grade to target it primarily

// Autopilot Constants
export const AUTOPILOT_BASE_POST_RACE_DELAY_MS = 3000; // Base time results are shown before autopilot triggers next race
export const AUTOPILOT_BET_TURN_DELAY_MS = 500; // Delay for autopilot to "pass turn" in multiplayer betting

// Simulation Speed Constants
export const BASE_SIMULATION_STEP_INTERVAL_MS = 80; // Base ms per race snapshot. (was 60 for autopilot, now universal base)
export const MANUAL_SIMULATION_SPEED_MULTIPLIER = 400; // New: Manual mode runs at BASE / this_multiplier speed.
export const MAX_SPEED_MPS = 18; // Max speed in meters per second for simulation calculations & UI normalization.

// DNF Constants
export const DNF_DISTANCE_BEHIND_WINNER_THRESHOLD_PERCENT = 0.70; // Must complete 70% of race dist if winner finishes (was 0.60)
export const DNF_FATIGUE_PULL_UP_THRESHOLD = 78; // Fatigue > 78% (was 80)
export const DNF_DISTANCE_PULL_UP_THRESHOLD_PERCENT = 0.78; // And distance covered < 78% (was 0.80)

// New Horse Selection Constants
export const MIN_SPEED_FOR_ACTIVE_RACING = 60;
export const SPEED_BANDS = [
    {min: 60, max: 70, name: "Spd 60-70"},
    {min: 70, max: 80, name: "Spd 70-80"},
    {min: 80, max: 90, name: "Spd 80-90"},
    {min: 90, max: 101, name: "Spd 90+"} // Max 101 to include 100
];

// Jockey Simulation Constants
export const JOCKEY_MANAGE_FATIGUE_START_THRESHOLD = 70; // Fatigue level (0-100) at which jockey starts active fatigue management (e.g. easing pace).
