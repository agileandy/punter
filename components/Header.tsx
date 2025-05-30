
import React from 'react';
import { BanknotesIcon, TrophyIcon, CalendarDaysIcon, CogIcon, ForwardIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Player } from '../types';

interface HeaderProps {
  players: Player[];
  currentPlayerId: string | null;
  gameDate: Date | null;
  isAutopilotMode: boolean;
  onToggleAutopilot: () => void;
  autopilotSpeedMultiplier: number;
  onSetAutopilotSpeedMultiplier: (speed: number) => void;
  gameStage: 'setup' | 'betting' | 'raceInProgress' | 'raceResults';
}

const Header: React.FC<HeaderProps> = ({ 
  players,
  currentPlayerId,
  gameDate,
  isAutopilotMode,
  onToggleAutopilot,
  autopilotSpeedMultiplier,
  onSetAutopilotSpeedMultiplier,
  gameStage,
}) => {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  
  const getDisplayName = () => {
    if (gameStage === 'betting' && currentPlayer) {
      return `${currentPlayer.name}'s Turn`;
    }
    if (players.length === 1) {
      return players[0].name;
    }
    return "Multiplayer Game";
  };

  const getDisplayCurrency = () => {
    if (gameStage === 'betting' && currentPlayer) {
      return currentPlayer.currency;
    }
    if (players.length > 0) {
      return players[0].currency; // Default to player 1 if not in betting or no current player
    }
    return 0;
  };

  return (
    <header className="bg-brand-secondary text-text-on-primary p-4 shadow-md">
      <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0">
        <div className="flex items-center space-x-2">
          <TrophyIcon className="h-8 w-8 text-brand-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Punter: Horse Racing Sim</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Autopilot Controls */}
          <div className="flex items-center space-x-2 p-2 bg-brand-secondary rounded-md border border-gray-600 shadow-sm">
            <ForwardIcon className={`h-5 w-5 ${isAutopilotMode ? 'text-brand-accent' : 'text-gray-400'}`} />
            <label htmlFor="autopilotToggle" className="flex items-center cursor-pointer text-sm">
              <span className="mr-2 font-medium">Autopilot:</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="autopilotToggle" 
                  className="sr-only" 
                  checked={isAutopilotMode} 
                  onChange={onToggleAutopilot} 
                />
                <div className={`block w-10 h-6 rounded-full ${isAutopilotMode ? 'bg-brand-primary' : 'bg-gray-500'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAutopilotMode ? 'transform translate-x-full' : ''}`}></div>
              </div>
            </label>
            {isAutopilotMode && (
              <div className="flex items-center space-x-1 ml-2">
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="1" 
                  value={autopilotSpeedMultiplier} 
                  onChange={(e) => onSetAutopilotSpeedMultiplier(parseInt(e.target.value))}
                  className="w-20 h-4 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                  title={`Autopilot Speed: ${autopilotSpeedMultiplier}x`}
                />
                <span className="text-xs w-8 text-right">{autopilotSpeedMultiplier}x</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <CalendarDaysIcon className="h-5 w-5 text-brand-accent" />
            <span>Date: {gameDate ? gameDate.toLocaleDateString() : 'Loading...'}</span>
          </div>
          
          {players.length > 1 && gameStage !== 'setup' && (
            <div className="flex items-center space-x-1 text-xs p-1 bg-gray-700 rounded">
              <UserGroupIcon className="h-4 w-4 text-brand-accent" />
              {players.map(p => (
                <span key={p.id} className={`px-1.5 py-0.5 rounded text-xs ${p.id === currentPlayerId && gameStage === 'betting' ? 'bg-brand-accent text-text-primary font-semibold' : 'text-gray-300'}`}>
                  {p.name}: ${p.currency.toLocaleString()}
                </span>
              ))}
            </div>
          )}

          {gameStage !== 'setup' && players.length > 0 && (
            <div className="flex items-center space-x-2 bg-brand-primary px-3 py-1.5 rounded-md shadow text-text-primary">
              <BanknotesIcon className="h-6 w-6" />
              <div className="flex flex-col items-end">
                <span className="text-xs -mb-1 opacity-80">{getDisplayName()}</span>
                <span className="text-lg font-semibold">
                  ${getDisplayCurrency().toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;