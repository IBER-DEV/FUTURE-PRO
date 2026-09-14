// Shape of a record in public/exercise-data/data/exercises.json (untouched raw dataset).
// Source: hasaneyldrm/exercises-dataset — see public/exercise-data/NOTICE.md for media attribution.
export interface RawExercise {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions: Record<string, string>;
  instruction_steps: Record<string, string[]>;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  image: string;
  gif_url: string;
  attribution: string;
  created_at: string;
}
