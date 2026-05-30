"use client"

import React from "react"

export default function HomeSkeleton() {
  return (
    <div className="space-y-10 px-4 md:px-6 py-6 md:py-8 select-none">
      {/* 3 rows of beautiful pulsing skeletons */}
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <div key={rowIndex} className="space-y-4">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-6 md:h-8 w-48 bg-[#1a1a24] rounded-md animate-pulse" />
            <div className="h-5 md:h-6 w-20 bg-[#1a1a24] rounded-full animate-pulse" />
          </div>

          {/* Cards Skeleton Row */}
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 6 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="flex-shrink-0 space-y-3"
              >
                {/* Image Skeleton */}
                <div
                  className="rounded-2xl bg-[#1a1a24] animate-pulse w-[130px] h-[130px] md:w-[160px] md:h-[160px]"
                />
                
                {/* Title Skeleton */}
                <div className="h-3.5 bg-[#1a1a24] rounded-md animate-pulse w-3/4" />
                {/* Subtitle Skeleton */}
                <div className="h-2.5 bg-[#1a1a24] rounded-md animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
