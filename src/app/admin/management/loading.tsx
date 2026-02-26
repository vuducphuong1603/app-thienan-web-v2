export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
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
        </div>
      </header>

      {/* Content skeleton */}
      <div className="flex-1 flex px-5 pb-5 gap-5">
        {/* Sidebar */}
        <aside className="w-[208px] flex-shrink-0">
          <nav className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <div className="h-[600px] rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
        </main>
      </div>
    </div>
  )
}
