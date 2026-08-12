import React, { useRef, useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

/**
 * Optimized image component with lazy loading support.
 * Uses IntersectionObserver for efficient image loading on scroll.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = 'bg-gray-200 animate-pulse',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      { rootMargin: '50px' } // Start loading 50px before image comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder shown while image loads */}
      {!isLoaded && (
        <div className={`absolute inset-0 ${placeholderClassName}`} />
      )}

      {/* Actual image - only loads when visible or fallback */}
      <img
        ref={imgRef}
        src={isVisible ? src : undefined}
        alt={alt}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
};
