export const BODY_TYPES = [
  'slim',
  'athletic',
  'curvy',
  'average',
  'petite',
  'tall',
];

export const RACES = [
  'Asian',
  'White',
  'Latina',
  'Middle Eastern',
];

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
  'relaxed pose'
];

export const ANGLES = [
  '' // Empty for now to simplify prompts
];

export const generateDrawingPrompt = (): {
  prompt: string;
  bodyType: string;
  race: string;
  pose: string;
  angle: string;
} => {
  const bodyType = BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)];
  const race = RACES[Math.floor(Math.random() * RACES.length)];
  const pose = POSES[Math.floor(Math.random() * POSES.length)];
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];

  const prompt = `A full body image from head to toe of a ${bodyType} ${race} female in white bikini ${pose}. The background should be neutral grey with soft spotlight`;

  return {
    prompt,
    bodyType,
    race,
    pose,
    angle
  };
};