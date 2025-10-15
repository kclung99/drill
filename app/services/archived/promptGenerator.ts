/**
 * Prompt Generator
 *
 * Standalone utility for generating random drawing prompts.
 * Supports full-body, hands, feet, and portrait categories.
 */

/**
 * Attribute options for prompts
 */
export const BODY_TYPES = [
  'slim',
  'athletic',
  'curvy',
  'average',
  'petite',
  'tall',
] as const;

export const RACES = [
  'Asian',
  'White',
  'Latina',
  'Middle Eastern',
] as const;

export const POSES = [
  // Standing poses - basic
  'standing with hands on hips',
  'standing with arms crossed',
  'standing with arms at sides',
  'standing with weight on one leg',
  'standing with one leg forward',
  'standing in contrapposto',
  'standing with arms behind back',
  'standing with one hand on hip',
  'standing with hands clasped',
  'standing with arms folded',

  // Sitting poses
  'sitting cross-legged',
  'sitting with knees to chest',
  'sitting on the ground',
  'sitting with legs extended',
  'sitting with one leg bent',
  'sitting on heels',
  'sitting with legs to one side',
  'sitting hunched forward',
  'sitting upright',
  'sitting with ankles crossed',

  // Lying poses
  'lying on side',
  'lying on back',
  'lying on stomach',
  'lying on side curled up',
  'lying on back with one knee up',
  'lying on side with head propped up',

  // Movement poses
  'walking forward',
  'mid-stride walking',
  'turning to look over shoulder',
  'stepping forward',
  'turning around',

  // Reaching and stretching
  'reaching up with one arm',
  'reaching up with both arms',
  'stretching arms overhead',
  'stretching to one side',
  'reaching across body',
  'reaching down',
  'reaching forward',
  'stretching sideways',

  // Crouching and kneeling
  'crouching down',
  'kneeling on one knee',
  'kneeling on both knees',
  'squatting',
  'crouching low',

  // Athletic poses
  'jumping with arms up',
  'balancing on one foot',
  'lunging forward',
  'lunging to the side',
  'yoga warrior pose',
  'tree pose',
  'throwing motion',
  'catching pose',
  'kicking motion',

  // Expressive poses
  'pointing forward',
  'pointing upward',
  'waving',
  'thinking pose',
  'surprised pose',
  'confident pose',
  'relaxed pose',
] as const;

export const HAND_GESTURES = [
  'open palm facing forward',
  'fist',
  'pointing gesture',
  'peace sign',
  'thumbs up',
  'relaxed hand',
  'grabbing gesture',
  'pinching gesture',
  'waving gesture',
  'rock gesture',
  'finger gun',
  'counting one',
  'counting two',
  'counting three',
  'ok sign',
  'stop gesture',
] as const;

export const FOOT_ANGLES = [
  'side view',
  'front view',
  'bottom view',
  '3/4 angle',
  'top view',
  'pointed toes',
  'flexed foot',
  'standing position',
  'walking position',
] as const;

/**
 * Prompt generation result
 */
export interface PromptResult {
  prompt: string;
  bodyType: string;
  race: string;
  pose: string;
}

/**
 * Random selection helper
 */
function randomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random drawing prompt
 */
export function generateDrawingPrompt(
  category: 'full-body' | 'hands' | 'feet' | 'portraits' = 'full-body',
  gender: 'male' | 'female' | 'both' = 'female',
  clothing: 'minimal' | 'clothed' = 'minimal'
): PromptResult {
  // For 'both' gender, randomly pick male or female
  const actualGender = gender === 'both' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;

  let prompt = '';
  let bodyType = '';
  let race = '';
  let pose = '';

  switch (category) {
    case 'full-body':
      bodyType = randomItem(BODY_TYPES);
      race = randomItem(RACES);
      pose = randomItem(POSES);
      const clothingItem =
        actualGender === 'male' ? 'white athletic underwear' : 'white bikini';
      prompt = `A full body image from head to toe of a ${bodyType} ${race} ${actualGender} wearing ${clothingItem} ${pose}. The background should be neutral grey with soft spotlight`;
      break;

    case 'hands':
      pose = randomItem(HAND_GESTURES);
      prompt = `A detailed close-up photograph of natural ${actualGender} hands with short nails, no jewelry, showing ${pose}. Neutral grey background with soft lighting`;
      break;

    case 'feet':
      pose = randomItem(FOOT_ANGLES);
      prompt = `A detailed close-up photograph of natural ${actualGender} feet with short nails, no jewelry, ${pose}. Neutral grey background with soft lighting`;
      break;

    case 'portraits':
      race = randomItem(RACES);
      prompt = `A portrait photograph of a ${race} ${actualGender} showing head and shoulders. Neutral grey background with soft lighting`;
      break;
  }

  return {
    prompt,
    bodyType,
    race,
    pose,
  };
}

/**
 * Generate multiple prompts at once
 */
export function generateBatchPrompts(
  count: number,
  category: 'full-body' | 'hands' | 'feet' | 'portraits' = 'full-body',
  gender: 'male' | 'female' | 'both' = 'female',
  clothing: 'minimal' | 'clothed' = 'minimal'
): PromptResult[] {
  return Array.from({ length: count }, () =>
    generateDrawingPrompt(category, gender, clothing)
  );
}
