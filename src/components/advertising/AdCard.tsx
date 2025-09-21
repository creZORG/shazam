
"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { trackAdClick } from "@/app/admin/requests/actions";
import { AdSubmission } from "@/lib/types";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface AdCardProps {
  ad: AdSubmission;
  isNightlife?: boolean;
}

export function AdCard({ ad, isNightlife = false }: AdCardProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDisclaimer(true);
  }

  const handleProceed = () => {
    trackAdClick(ad.id);
    window.open(ad.ctaLink, '_blank', 'noopener,noreferrer');
  }

  const primaryImage = ad.imageUrls[0];

  return (
    <>
      <div onClick={handleCardClick} className="block h-full group cursor-pointer">
          <Card className={cn(
              "overflow-hidden h-full flex flex-col transition-all duration-300 relative group",
              "hover:shadow-2xl hover:-translate-y-1",
               isNightlife ? "hover:shadow-purple-500/40" : "hover:shadow-primary/40"
          )}>
            <div className="relative aspect-[4/5] w-full">
                <Image
                src={primaryImage}
                alt={ad.campaignName}
                fill
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </div>

            <div className="absolute inset-0 h-full flex flex-col justify-between p-4 text-white">
              <div>
                   <Badge
                    variant="destructive"
                    className={cn(
                      "text-xs bg-black/50 border-white/20 text-white",
                    )}
                  >
                    Sponsored
                  </Badge>
              </div>
              
              <div className="space-y-2">
                  <h3 className="font-bold text-2xl" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>{ad.campaignName}</h3>
                  <Button
                    variant="secondary"
                    className={cn(
                      "w-full bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30",
                      isNightlife && "bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30"
                    )}
                  >
                    {ad.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
            </div>
          </Card>
      </div>

      <AlertDialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                <AlertDialogTitle className="text-center">External Link Notice</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                    You are about to navigate to an external website. While we do our best to verify the authenticity of our advertisers, NaksYetu is not liable for any content, transactions, or outcomes that occur on third-party sites.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleProceed}>Proceed <ArrowRight className="ml-2 h-4 w-4" /></AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
