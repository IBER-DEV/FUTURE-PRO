import React from 'react';
import { animalEmoji } from '../../data/animalAvatars';

interface AvatarProps {
  avatarType: 'animal' | 'photo' | null;
  avatarAnimal: string | null;
  avatarPhotoUrl: string | null;
  name: string;
  sizeClassName?: string;
  emojiSizeClassName?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatarType,
  avatarAnimal,
  avatarPhotoUrl,
  name,
  sizeClassName = 'w-16 h-16',
  emojiSizeClassName = 'text-3xl'
}) => {
  if (avatarType === 'photo' && avatarPhotoUrl) {
    return (
      <img
        src={avatarPhotoUrl}
        alt={name}
        className={`${sizeClassName} rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (avatarType === 'animal' && avatarAnimal) {
    return (
      <div className={`${sizeClassName} rounded-full bg-[#edeef0] flex items-center justify-center shrink-0`}>
        <span className={emojiSizeClassName}>{animalEmoji(avatarAnimal)}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClassName} rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0 ${emojiSizeClassName}`}>
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  );
};
