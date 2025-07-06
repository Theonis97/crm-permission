import { Skeleton } from "@/components/ui/skeleton"

export default function OpportunitiesLoading() {
  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            {/* Column header */}
            <div className="rounded-lg p-4 mb-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="border rounded-lg p-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4 mb-3" />
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
