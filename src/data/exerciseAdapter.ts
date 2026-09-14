import { Exercise } from '../types';
import { RawExercise } from './rawExercise.types';
import { translateBodyPart, translateEquipment, translateMuscle } from './exerciseTranslations';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const capitalize = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

// Maps a raw dataset record (English, keyed by ISO language codes) into the app's
// Exercise shape. Data stays as close to the source as possible: only body_part,
// equipment and muscle names go through a fixed ES vocabulary (exerciseTranslations.ts);
// name and instructions use the dataset's own `es` locale.
export const adaptRawExercise = (raw: RawExercise): Exercise => ({
  id: raw.id,
  name: capitalize(raw.name),
  slug: slugify(raw.name),
  thumbnail: `/exercise-data/${raw.image}`,
  animation: `/exercise-data/${raw.gif_url}`,
  category: translateEquipment(raw.equipment),
  bodyPart: translateBodyPart(raw.body_part),
  equipment: translateEquipment(raw.equipment),
  target: translateMuscle(raw.target),
  instructions: raw.instruction_steps.es?.length ? raw.instruction_steps.es : raw.instruction_steps.en,
  secondaryMuscles: raw.secondary_muscles.map(translateMuscle),
});
