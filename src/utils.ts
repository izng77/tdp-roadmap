import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const categorizeDomain = (courseName: string): string => {
  if (!courseName) return 'Cognitive & Academic';
  const name = courseName.toLowerCase();
  if (name.includes('olympiad') || name.includes('science') || name.includes('math') || name.includes('computing') || name.includes('hackathon') || name.includes('stem') || name.includes('programming') || name.includes('engineering') || name.includes('physics') || name.includes('chemistry') || name.includes('biology')) {
    return 'STEM & Innovation';
  }
  if (name.includes('lead') || name.includes('council') || name.includes('service') || name.includes('volunteer') || name.includes('community') || name.includes('mentor') || name.includes('facilitator')) {
    return 'Leadership & Service';
  }
  if (name.includes('art') || name.includes('music') || name.includes('dance') || name.includes('drama') || name.includes('theatre') || name.includes('writing') || name.includes('essay') || name.includes('poetry') || name.includes('choir') || name.includes('band')) {
    return 'Aesthetics & Culture';
  }
  if (name.includes('sport') || name.includes('physical') || name.includes('game') || name.includes('tournament') || name.includes('championship') || name.includes('athletics') || name.includes('fitness')) {
    return 'Physical & Sports';
  }
  if (name.includes('global') || name.includes('mun') || name.includes('overseas') || name.includes('trip') || name.includes('united nations') || name.includes('international') || name.includes('cultural') || name.includes('bilingual')) {
    return 'Global Awareness';
  }
  return 'Cognitive & Academic';
};

export const getTierName = (tier: number) => {
  if (tier === 1) return 'Tier 1';
  if (tier === 2) return 'Tier 2';
  if (tier === 3) return 'Tier 3';
  return `Tier ${tier}`;
};
