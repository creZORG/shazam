
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function NightlifeCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col bg-card/50">
      <Skeleton className="relative w-full aspect-[4/5]" />
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
