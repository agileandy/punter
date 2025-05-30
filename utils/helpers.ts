/**
 * Utility functions shared across the application
 */

export const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const getRandomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const formatOddsForDisplay = (odds: number | undefined | null): string => {
  if (odds === null || odds === undefined || isNaN(Number(odds))) return '-';
  const num = Number(odds);

  if (num < 10) return (Math.round(num * 10) / 10).toFixed(1);
  if (num < 100) return Math.round(num).toString();
  if (num < 1000) return (Math.round(num / 10) * 10).toString();
  return (Math.round(num / 100) * 100).toString();
};