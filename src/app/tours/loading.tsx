
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function TourCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <Skeleton className="relative w-full h-48" />
      <CardContent className="p-4 flex flex-col flex-grow space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex-grow" />
        <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ToursLoading() {
  return (
    <div className="flex flex-col">
      <section className="relative w-full h-[50vh]">
        <Skeleton className="w-full h-full" />
      </section>

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
