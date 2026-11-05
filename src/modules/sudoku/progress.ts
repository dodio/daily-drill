import { readPref, writePref } from '../../lib/prefs.ts';
import type { SudokuMode } from './generator.ts';

export interface SudokuCompletion {
  bestMs: number;
  lastMs: number;
  solves: number;
  bestMistakes: number;
  hints: number;
}

export type SudokuProgress = Record<string, SudokuCompletion>;

export interface SudokuSolve {
  durationMs: number;
  mistakes: number;
  hints: number;
}

export function readSudokuProgress(): SudokuProgress {
  const raw = readPref('sudoku-progress');
  if (!raw || typeof raw !== 'object') return {};
  const clean: SudokuProgress = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const item = value as Record<string, unknown>;
    if (
      typeof item.bestMs !== 'number' ||
      typeof item.lastMs !== 'number' ||
      typeof item.solves !== 'number' ||
      typeof item.bestMistakes !== 'number' ||
      typeof item.hints !== 'number'
    ) {
      continue;
    }
    clean[id] = {
      bestMs: Math.max(0, item.bestMs),
      lastMs: Math.max(0, item.lastMs),
      solves: Math.max(0, Math.round(item.solves)),
      bestMistakes: Math.max(0, Math.round(item.bestMistakes)),
      hints: Math.max(0, Math.round(item.hints)),
    };
  }
  return clean;
}

export function saveSudokuSolve(
  progress: SudokuProgress,
  id: string,
  solve: SudokuSolve,
): SudokuProgress {
  const previous = progress[id];
  const next: SudokuProgress = {
    ...progress,
    [id]: {
      bestMs: previous ? Math.min(previous.bestMs, solve.durationMs) : solve.durationMs,
      lastMs: solve.durationMs,
      solves: (previous?.solves ?? 0) + 1,
      bestMistakes: previous
        ? Math.min(previous.bestMistakes, solve.mistakes)
        : solve.mistakes,
      hints: solve.hints,
    },
  };
  writePref('sudoku-progress', next);
  return next;
}

export function completedInMode(progress: SudokuProgress, mode: SudokuMode): number {
  return Object.keys(progress).filter((id) => id.startsWith(`${mode}-`)).length;
}
