
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  initialRating?: number;
  onRatingChange: (rating: number) => void;
  totalStars?: number;
  readOnly?: boolean;
}

export function StarRating({ initialRating = 0, onRatingChange, totalStars = 5, readOnly = false }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (ratingValue: number) => {
    if (readOnly) return;
    setRating(ratingValue);
    onRatingChange(ratingValue);
  };

  return (
    <div className="flex items-center">
      {[...Array(totalStars)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={ratingValue} className={cn(!readOnly && "cursor-pointer")}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => handleClick(ratingValue)}
              className="sr-only"
              disabled={readOnly}
            />
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                ratingValue <= (hoverRating || rating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-muted-foreground"
              )}
              onMouseEnter={() => !readOnly && setHoverRating(ratingValue)}
              onMouseLeave={() => !readOnly && setHoverRating(0)}
            />
          </label>
        );
      })}
    </div>
  );
}
