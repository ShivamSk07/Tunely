export default function ChartsLoading() {
  return (
    <div className="min-h-full pb-36 md:pb-12">
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="h-8 w-40 bg-[#1a1a24] rounded-lg animate-pulse mb-4" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-[#1a1a24] rounded-full animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#1a1a24] animate-pulse">
              <span className="w-6 h-5 bg-[#282828] rounded flex-shrink-0" />
              <div className="w-12 h-12 rounded-lg bg-[#282828] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#282828] rounded w-1/2" />
                <div className="h-3 bg-[#282828] rounded w-1/3" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#282828]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
