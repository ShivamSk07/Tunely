export default function PlaylistsLoading() {
  return (
    <div className="min-h-full pb-36 md:pb-12">
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="h-8 w-52 bg-[#1a1a24] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#1a1a24] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-xl bg-[#1a1a24] animate-pulse" />
              <div className="h-4 bg-[#1a1a24] rounded animate-pulse w-3/4" />
              <div className="h-3 bg-[#1a1a24] rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
