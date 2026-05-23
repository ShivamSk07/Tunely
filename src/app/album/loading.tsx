export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse bg-[#080810] min-h-screen">
      {/* Back Button and Album Banner Skeleton */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start py-8">
        <div className="w-48 h-48 sm:w-64 sm:h-64 bg-[#1a1a24] rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-4 w-full text-center md:text-left">
          <div className="h-4 bg-[#1a1a24] rounded w-24 mx-auto md:mx-0" />
          <div className="h-10 bg-[#1a1a24] rounded w-3/4 mx-auto md:mx-0" />
          <div className="h-4 bg-[#1a1a24] rounded w-1/2 mx-auto md:mx-0" />
          <div className="h-10 bg-[#1a1a24] rounded w-48 mx-auto md:mx-0" />
        </div>
      </div>
      
      {/* Title Skeleton */}
      <div className="h-6 bg-[#1a1a24] rounded w-32 border-b border-gray-900/60 pb-3" />
      
      {/* Track list Skeletons */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#1a1a24] rounded-xl w-full" />
        ))}
      </div>
    </div>
  )
}
