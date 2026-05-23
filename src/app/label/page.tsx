import React, { Suspense } from "react"
import LabelClient from "@/components/LabelClient"

export const dynamic = "force-dynamic"

export default function LabelPage({
  searchParams,
}: {
  searchParams: { token?: string; type?: string; p?: string }
}) {
  const token = searchParams.token || ""
  const type = searchParams.type || "albums"
  const page = searchParams.p || "1"

  return (
    <Suspense fallback={
      <div className="px-6 pt-8 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#1a1a24] rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[#1a1a24] rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <LabelClient token={token} type={type} initialPage={parseInt(page, 10)} />
    </Suspense>
  )
}
