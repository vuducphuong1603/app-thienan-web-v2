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
      <main className="px-6 pb-6">
        {/* Back + Title */}
        <div className="mb-6">
          <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-10 w-72 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[147px] rounded-[15px] bg-gray-200 dark:bg-white/10 animate-pulse" />
          ))}
        </div>

        {/* Content area */}
        <div className="flex gap-6">
          <div className="w-[208px] flex-shrink-0 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[55px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[120px] rounded-[25px] bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
