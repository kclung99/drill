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
  'stop gesture'
];

export const FOOT_ANGLES = [
  'side view',
  'front view',
  'bottom view',
  '3/4 angle',
  'top view',
  'pointed toes',
  'flexed foot',
  'standing position',
  'walking position'
];

export const generateDrawingPrompt = (
  category: string = 'full-body',
  gender: string = 'female',
  clothing: string = 'minimal'
): {
  prompt: string;
  bodyType: string;
  race: string;
  pose: string;
} => {
  const bodyType = BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)];
  const race = RACES[Math.floor(Math.random() * RACES.length)];
  const pose = POSES[Math.floor(Math.random() * POSES.length)];

  // For 'both' gender, randomly pick male or female
  const actualGender = gender === 'both'
    ? (Math.random() > 0.5 ? 'male' : 'female')
    : gender;

  let prompt = '';

  switch (category) {
    case 'full-body':
      // Full body uses complete attributes: body type, race, gender, clothing, pose
      prompt = `A full body image from head to toe of a ${bodyType} ${race} ${actualGender} in white bikini ${pose}. The background should be neutral grey with soft spotlight`;
      break;

    case 'hands':
      // Hands: pick specific gesture deterministically
      const handGesture = HAND_GESTURES[Math.floor(Math.random() * HAND_GESTURES.length)];
      prompt = `A detailed close-up photograph of ${actualGender} hands showing ${handGesture}. Neutral grey background with soft lighting`;
      break;

    case 'feet':
      // Feet: pick specific angle deterministically
      const footAngle = FOOT_ANGLES[Math.floor(Math.random() * FOOT_ANGLES.length)];
      prompt = `A detailed close-up photograph of ${actualGender} feet, ${footAngle}. Neutral grey background with soft lighting`;
      break;

    case 'portraits':
      // Portraits: focus on face and upper body, include race for diversity
      prompt = `A portrait photograph of a ${race} ${actualGender} showing head and shoulders. Neutral grey background with soft lighting`;
      break;
  }

  return {
    prompt,
    bodyType,
    race,
    pose
  };
};