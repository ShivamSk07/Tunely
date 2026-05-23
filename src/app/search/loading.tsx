export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse bg-[#080810] min-h-screen">
      {/* Search Input Bar Skeleton */}
      <div className="max-w-2xl mx-auto h-12 bg-[#1a1a24] rounded-full w-full" />
      
      {/* Title Skeleton */}
      <div className="h-6 bg-[#1a1a24] rounded w-36 mt-8" />
      
      {/* Browse Grid Categories Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-[#1a1a24] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
