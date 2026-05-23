export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#080810]">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-[#6C63FF] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-[#B3B3B3] text-sm font-medium tracking-widest uppercase">
          Loading
        </p>
      </div>
    </div>
  )
}
