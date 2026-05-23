export default function JioSaavnPlaylistLoading() {
  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 w-16 bg-[#1a1a24] rounded-lg" />
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start py-8">
        <div className="w-64 h-64 bg-[#1a1a24] border border-[#282828] rounded-2xl" />
        <div className="flex-1 space-y-4 w-full">
          <div className="h-8 bg-[#1a1a24] rounded-lg w-1/2" />
          <div className="h-4 bg-[#1a1a24] rounded-lg w-1/4" />
          <div className="flex gap-3 mt-4">
            <div className="h-10 w-28 bg-[#1a1a24] rounded-xl" />
            <div className="h-10 w-24 bg-[#1a1a24] rounded-xl" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a24] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
