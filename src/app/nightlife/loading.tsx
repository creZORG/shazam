import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function NightlifeCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col bg-card/50">
      <Skeleton className="relative w-full h-48" />
      <CardContent className="p-4 flex flex-col flex-grow space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex-grow" />
        <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
        </div>
      </CardContent>
    </Card>
  );
}


export default function NightlifeLoading() {
  return (
    <div className="min-h-screen">
      <section className="relative py-12 md:py-16 text-center">
         <div className="container mx-auto px-4">
            <Skeleton className="h-16 w-1/2 mx-auto" />
            <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
        </div>
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
            <Skeleton className="h-32 w-full" />
        </div>
      </section>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
              <NightlifeCardSkeleton key={i} />
            ))}
        </div>
      </div>
    </div>
  );
}
