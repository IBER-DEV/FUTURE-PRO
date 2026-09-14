import { Exercise } from '../types';
import { RawExercise } from '../data/rawExercise.types';
import { adaptRawExercise } from '../data/exerciseAdapter';

export interface ExerciseService {
  getExercises(filters?: { category?: string; query?: string; bodyPart?: string }): Promise<Exercise[]>;
  getExerciseById(id: string): Promise<Exercise | null>;
}

class DatasetExerciseService implements ExerciseService {
  private exercises: Promise<Exercise[]> | null = null;

  private async load(): Promise<Exercise[]> {
    if (!this.exercises) {
      this.exercises = fetch('/exercise-data/data/exercises.json')
        .then((res) => res.json())
        .then((raw: RawExercise[]) => raw.map(adaptRawExercise));
    }
    return this.exercises;
  }

  async getExercises(filters?: { category?: string; query?: string; bodyPart?: string }): Promise<Exercise[]> {
    let result = await this.load();
    if (filters?.category && filters.category !== 'Todos') {
      result = result.filter((ex) => ex.bodyPart.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.bodyPart) {
      result = result.filter((ex) => ex.bodyPart.toLowerCase() === filters.bodyPart!.toLowerCase());
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.target.toLowerCase().includes(q) ||
          ex.bodyPart.toLowerCase().includes(q) ||
          ex.equipment.toLowerCase().includes(q)
      );
    }
    return result;
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    const all = await this.load();
    return all.find((ex) => ex.id === id) || null;
  }
}

export const exerciseService: ExerciseService = new DatasetExerciseService();
