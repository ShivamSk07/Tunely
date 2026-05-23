export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse bg-[#080810] min-h-screen max-w-6xl mx-auto">
      {/* Page Header Skeleton */}
      <div className="flex items-center gap-3 border-b border-gray-900/60 pb-5">
        <div className="w-10 h-10 rounded-xl bg-[#1a1a24] flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-6 bg-[#1a1a24] rounded w-48" />
          <div className="h-3.5 bg-[#1a1a24] rounded w-72" />
        </div>
      </div>
      
      {/* Horizontal Tabs Skeleton */}
      <div className="flex gap-6 border-b border-gray-900/60 pb-2">
        <div className="h-8 bg-[#1a1a24] rounded w-32" />
        <div className="h-8 bg-[#1a1a24] rounded w-32" />
      </div>
      
      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a24] rounded-xl w-full" />
        ))}
      </div>
    </div>
  )
}
