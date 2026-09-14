export interface AnimalAvatarOption {
  id: string;
  emoji: string;
  label: string;
}

// Fixed, deterministic set — no external assets, works offline.
export const ANIMAL_AVATARS: AnimalAvatarOption[] = [
  { id: 'lion', emoji: '🦁', label: 'León' },
  { id: 'fox', emoji: '🦊', label: 'Zorro' },
  { id: 'wolf', emoji: '🐺', label: 'Lobo' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'tiger', emoji: '🐯', label: 'Tigre' },
  { id: 'owl', emoji: '🦉', label: 'Búho' },
  { id: 'koala', emoji: '🐨', label: 'Koala' },
  { id: 'bear', emoji: '🐻', label: 'Oso' },
  { id: 'cat', emoji: '🐱', label: 'Gato' },
  { id: 'dog', emoji: '🐶', label: 'Perro' },
  { id: 'eagle', emoji: '🦅', label: 'Águila' },
  { id: 'turtle', emoji: '🐢', label: 'Tortuga' }
];

export const animalEmoji = (animalId: string | null): string =>
  ANIMAL_AVATARS.find((a) => a.id === animalId)?.emoji ?? '🙂';
