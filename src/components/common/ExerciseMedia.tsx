import React, { useState } from 'react';

export interface ExerciseMediaProps {
  thumbnailUrl: string;
  animationUrl?: string;
  videoUrl?: string;
  altText: string;
  className?: string;
  showAnimation?: boolean;
  aspectRatio?: 'video' | 'square' | 'wide';
}

export const ExerciseMedia: React.FC<ExerciseMediaProps> = ({
  thumbnailUrl,
  animationUrl,
  videoUrl,
  altText,
  className = '',
  showAnimation = false,
  aspectRatio = 'wide'
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : 'h-48 md:h-56';

  return (
    <div className={`relative overflow-hidden bg-[#e1e2e4] ${aspectClass} ${className}`}>
      {/* Skeleton / Shimmer placeholder while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-[#e7e8ea] animate-pulse flex items-center justify-center">
          <span className="material-symbols-outlined text-[#75777a] text-3xl opacity-40">
            fitness_center
          </span>
        </div>
      )}

      {videoUrl && showAnimation ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoadedData={() => setLoaded(true)}
        />
      ) : (
        <img
          src={showAnimation && animationUrl ? animationUrl : thumbnailUrl}
          alt={altText}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 bg-[#f3f4f6] flex flex-col items-center justify-center text-[#75777a] p-4 text-center">
          <span className="material-symbols-outlined text-2xl mb-1">image_not_supported</span>
          <span className="text-xs font-semibold">{altText}</span>
        </div>
      )}
    </div>
  );
};
