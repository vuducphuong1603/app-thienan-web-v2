export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="bg-transparent px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-20">
            <div className="w-[52px] h-[52px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[45px] w-24 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[45px] w-[324px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="w-[45px] h-[45px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="p-5">
        <div className="space-y-5">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-40 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-10 w-80 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[140px] rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[300px] rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
