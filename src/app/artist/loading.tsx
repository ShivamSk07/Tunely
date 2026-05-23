export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse bg-[#080810] min-h-screen">
      {/* Hero Banner Skeleton */}
      <div className="h-48 md:h-64 bg-[#1a1a24] rounded-2xl w-full" />
      
      {/* Title Skeleton */}
      <div className="h-8 bg-[#1a1a24] rounded w-48" />
      
      {/* Track Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a24] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
