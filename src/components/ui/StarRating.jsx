"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({ 
  rating = 0, 
  size = "sm", 
  readonly = false, 
  onChange,
  showValue = false 
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4", 
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  function handleClick(starValue) {
    if (readonly) return;
    onChange?.(starValue);
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hoverRating || rating);
          return (
            <Star
              key={star}
              className={`${sizes[size]} transition-colors ${
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-slate-200 text-slate-300"
              } ${!readonly ? "cursor-pointer hover:text-yellow-300" : ""}`}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
            />
          );
        })}
      </div>
      
      {showValue && (
        <span className="ml-1 text-sm text-slate-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Rating display component for showing user ratings
export function RatingDisplay({ userId, size = "sm", showCount = true }) {
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  // This would normally load from Firestore
  // For now, using placeholder
  useState(() => {
    // Simulate loading rating
    setTimeout(() => {
      setRating({ average: 4.2, count: 12 });
      setLoading(false);
    }, 500);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-4 w-4 animate-pulse rounded bg-slate-200`} />
          ))}
        </div>
        {showCount && <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />}
      </div>
    );
  }

  if (rating.count === 0) {
    return (
      <div className="flex items-center gap-1 text-sm text-slate-400">
        <Star className="h-4 w-4 fill-slate-200 text-slate-300" />
        <span>Pas encore noté</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <StarRating rating={rating.average} size={size} readonly />
      {showCount && (
        <span className="text-sm text-slate-600">({rating.count})</span>
      )}
    </div>
  );
}
