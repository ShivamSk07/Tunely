import React from "react"

export function SongPillSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-[#12121E] border border-rgba(108, 99, 255, 0.08) rounded-lg p-3 w-full animate-pulse">
      <div className="w-12 h-12 bg-gray-800 rounded-md"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-800 rounded w-1/3"></div>
        <div className="h-3 bg-gray-800 rounded w-1/4"></div>
      </div>
      <div className="w-16 h-4 bg-gray-800 rounded"></div>
    </div>
  )
}

export function RowSkeleton() {
  return (
    <div className="space-y-4 py-4 w-full">
      <div className="h-6 bg-gray-800 rounded w-48 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SongPillSkeleton />
        <SongPillSkeleton />
        <SongPillSkeleton />
      </div>
    </div>
  )
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 py-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3 animate-pulse bg-[#12121E] rounded-xl p-4">
          <div className="w-full aspect-square bg-gray-800 rounded-lg"></div>
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-800 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-8 w-full py-8">
      <div className="w-64 flex-shrink-0 space-y-4 animate-pulse">
        <div className="w-64 h-64 bg-gray-800 rounded-xl"></div>
        <div className="h-6 bg-gray-800 rounded w-3/4"></div>
        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
      </div>
      <div className="flex-grow space-y-3 animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-1/4 mb-6"></div>
        <div className="h-12 bg-gray-800 rounded w-full"></div>
        <div className="h-12 bg-gray-800 rounded w-full"></div>
        <div className="h-12 bg-gray-800 rounded w-full"></div>
        <div className="h-12 bg-gray-800 rounded w-full"></div>
      </div>
    </div>
  )
}
