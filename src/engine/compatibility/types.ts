import type { CalculateOptions } from '@/engine/saju/calculator';
import type { Gender, Ohaeng, Palja } from '@/engine/types';

export interface CompatibilityInput {
  person1: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
    gender: Gender;
    isLunar?: boolean;
    isLeapMonth?: boolean;
    birthPlace?: string | null;
    calculateOptions?: CalculateOptions;
  };
  person2: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
    gender: Gender;
    isLunar?: boolean;
    isLeapMonth?: boolean;
    birthPlace?: string | null;
    calculateOptions?: CalculateOptions;
  };
}

export interface CompatibilityCategory {
  key: string;
  name: string;
  score: number; // 0-100
  maxScore: number;
  description: string;
  details: string[];
}

export type CompatibilityGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface CompatibilityResult {
  totalScore: number; // 0-100
  grade: CompatibilityGrade;
  summary: string;
  categories: CompatibilityCategory[];
  dayGanRelation: { type: string; description: string };
  dayJiRelation: { type: string; description: string };
  ohaengComplement: { score: number; description: string };
  guseongRelation: { score: number; description: string };
  advice: string[];
  person1Palja: Palja;
  person2Palja: Palja;
}
