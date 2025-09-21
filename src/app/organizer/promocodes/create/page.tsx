
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertTriangle, Ticket, Route, Calendar, ArrowLeft, Percent, CheckCircle, Search, User, Sparkles, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getListings } from "../../actions";
import type { Event, Tour } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { findInfluencerByUsername, createPromocode } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Listing = (Event | Tour) & { id: string; type: 'event' | 'tour' };
type SelectedListing = Listing | { id: 'all', type: 'all', name: 'All Active Events' };


const couponSchema = z.object({
  code: z.string().min(4, "Code must be at least 4 characters").max(20, "Code is too long").regex(/^[a-zA-Z0-9]+$/, "Code can only contain letters and numbers"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive("Discount value must be positive."),
  usageLimit: z.coerce.number().int().positive("Usage limit must be at least 1."),
  expiresAt: z.date().optional(),
}).refine(data => !(data.discountType === 'percentage' && data.discountValue > 100), {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
});

function ListingSelectionStep({ onSelect }: { onSelect: (listing: SelectedListing) => void }) {
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedListing, setSelectedListing] = useState<SelectedListing | null>(null);

    useEffect(() => {
        if (user?.uid) {
            getListings(user.uid).then(result => {
                if (result.success && result.data) {
                    const publishedEvents = result.data.published.filter(l => 'venue' in l).map(l => ({ ...(l as Event & { id: string }), type: 'event' as const }));
                    const publishedTours = result.data.published.filter(l => !('venue' in l)).map(l => ({ ...(l as Tour & { id: string }), type: 'tour' as const }));
                    setListings([...publishedEvents, ...publishedTours]);
                } else {
                    setError(result.error || "Could not load listings.");
                }
                setLoading(false);
            });
        }
    }, [user]);

    if (loading) {
        return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Loading your listings...</p></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-destructive">
                <AlertTriangle className="h-8 w-8" />
                <p className="mt-4">{error}</p>
            </div>
        );
    }
    
    if (listings.length === 0) {
        return (
             <div className="text-center py-12">
                <h3 className="text-lg font-semibold">No Published Listings Found</h3>
                <p className="text-muted-foreground mt-2">
                  You must have at least one published event or tour to create a promocode.
                </p>
              </div>
        )
    }

    return (
        <div className="space-y-4">
             <Card
                onClick={() => setSelectedListing({ id: 'all', type: 'all', name: 'All Active Events' })}
                className={cn(
                    "cursor-pointer transition-all border-2",
                    selectedListing?.id === 'all' ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                )}
            >
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-primary" />
                        All Active Events
                    </CardTitle>
                    <CardDescription>Create one code that works across all your published events and tours.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map(listing => (
                    <Card
                        key={listing.id}
                        onClick={() => setSelectedListing(listing)}
                        className={cn(
                            "cursor-pointer transition-all",
                            selectedListing?.id === listing.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                        )}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {listing.type === 'event' ? <Ticket className="h-5 w-5 text-primary" /> : <Route className="h-5 w-5 text-primary" />}
                                {listing.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(listing.date || (listing as Tour).startDate), 'PPP')}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
            <div className="flex justify-end pt-4">
                <Button onClick={() => onSelect(selectedListing!)} disabled={!selectedListing}>
                    Next <ArrowRight className="ml-2" />
                </Button>
            </div>
        </div>
    );
}

function CouponDetailsStep({ onBack, onNext }: { onBack: () => void, onNext: (data: z.infer<typeof couponSchema>) => void }) {
    const form = useForm<z.infer<typeof couponSchema>>({
        resolver: zodResolver(couponSchema),
        defaultValues: {
            code: "",
            discountType: "percentage",
            discountValue: 10,
            usageLimit: 999999,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Coupon Code</FormLabel><FormControl><Input placeholder="e.g., NAKS10" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="discountType" render={({ field }) => (<FormItem><FormLabel>Discount Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (Ksh)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="discountValue" render={({ field }) => (<FormItem><FormLabel>Discount Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 10 or 500" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="usageLimit" render={({ field }) => (<FormItem><FormLabel>Usage Limit</FormLabel><FormControl><Input type="number" placeholder="e.g., 999999 for unlimited" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="expiresAt" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Expiration Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><Button type="button" variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal",!field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}</><CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button>
                    <Button type="submit">Next <ArrowRight className="ml-2" /></Button>
                </div>
            </form>
        </Form>
    );
}

function InfluencerStep({ onBack, onFinalize }: { onBack: () => void, onFinalize: (data: { influencerId?: string, commissionType?: 'percentage' | 'fixed', commissionValue?: number }) => void }) {
    const [username, setUsername] = useState('');
    const [influencer, setInfluencer] = useState<{ uid: string; name: string; photoURL?: string; } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [assignmentType, setAssignmentType] = useState('general');

    const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
    const [commissionValue, setCommissionValue] = useState<number | string>('');


    const handleFindInfluencer = async () => {
        setIsLoading(true);
        setError(null);
        setInfluencer(null);
        const result = await findInfluencerByUsername(username);
        if (result.success && result.data) {
            setInfluencer(result.data);
            toast({ title: "Influencer Found!", description: `Coupon will be assigned to ${result.data.name}.` });
        } else {
            setError(result.error || "An unknown error occurred.");
        }
        setIsLoading(false);
    };

    const handleFinalizeClick = () => {
        if (assignmentType === 'general') {
            onFinalize({});
            return;
        }

        if (!influencer) {
            toast({ variant: 'destructive', title: 'No influencer selected.' });
            return;
        }
        if (commissionValue === '' || Number(commissionValue) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Commission', description: 'Please enter a valid, positive commission value.' });
            return;
        }
        if (commissionType === 'percentage' && Number(commissionValue) > 100) {
             toast({ variant: 'destructive', title: 'Invalid Commission', description: 'Percentage commission cannot exceed 100%.' });
            return;
        }
        onFinalize({
            influencerId: influencer.uid,
            commissionType,
            commissionValue: Number(commissionValue),
        });
    };

    return (
        <div className="space-y-6">
            <RadioGroup value={assignmentType} onValueChange={setAssignmentType} className="grid grid-cols-2 gap-4">
                 <div>
                    <RadioGroupItem value="general" id="r-general" className="peer sr-only" />
                    <Label htmlFor="r-general" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Sparkles className="mb-3 h-6 w-6" />
                        General Code
                    </Label>
                </div>
                 <div>
                    <RadioGroupItem value="influencer" id="r-influencer" className="peer sr-only" />
                    <Label htmlFor="r-influencer" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <User className="mb-3 h-6 w-6" />
                        Assign to Influencer
                    </Label>
                </div>
            </RadioGroup>

            {assignmentType === 'influencer' && (
                <div className="space-y-6 pt-4 border-t">
                    <div className="space-y-2">
                        <Label htmlFor="username">Influencer's Username</Label>
                        <div className="flex gap-2">
                            <Input id="username" placeholder="e.g., nax_hustler" value={username} onChange={e => setUsername(e.target.value)} />
                            <Button onClick={handleFindInfluencer} disabled={isLoading || !username}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Search />} Find
                            </Button>
                        </div>
                        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    </div>

                    {influencer && (
                        <>
                        <Card className="bg-muted/50">
                            <CardHeader className="flex-row items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={influencer.photoURL} />
                                    <AvatarFallback>{influencer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle>Assign to: {influencer.name}</CardTitle>
                                    <CardDescription>UID: {influencer.uid}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>

                        <div className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-medium">Set Influencer Commission</h4>
                            <p className="text-sm text-muted-foreground">Define what this influencer will earn for each ticket sold via their code.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="commissionType">Commission Type</Label>
                                    <Select onValueChange={(v: 'percentage' | 'fixed') => setCommissionType(v)} defaultValue={commissionType}>
                                        <SelectTrigger id="commissionType"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount (Ksh)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="commissionValue">Commission Value</Label>
                                    <Input id="commissionValue" type="number" placeholder={commissionType === 'percentage' ? "e.g., 5" : "e.g., 50"} value={commissionValue} onChange={e => setCommissionValue(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        </>
                    )}
                </div>
            )}
             <div className="flex justify-between pt-8">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button>
                <Button onClick={handleFinalizeClick} disabled={assignmentType === 'influencer' && !influencer}>
                    <CheckCircle className="mr-2" /> Create Promocode
                </Button>
            </div>
        </div>
    )
}

export default function CreatePromocodePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedListing, setSelectedListing] = useState<SelectedListing | null>(null);
    const [couponData, setCouponData] = useState<z.infer<typeof couponSchema> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleListingSelected = (listing: SelectedListing) => {
        setSelectedListing(listing);
        setStep(2);
    }
    
    const handleCouponDataSubmit = (data: z.infer<typeof couponSchema>) => {
        setCouponData(data);
        setStep(3);
    }

    const handleFinalize = async (influencerData: { influencerId?: string, commissionType?: 'percentage' | 'fixed', commissionValue?: number }) => {
        if (!user || !selectedListing || !couponData) return;

        setIsSubmitting(true);
        const result = await createPromocode({
            organizerId: user.uid,
            listingId: selectedListing.id === 'all' ? undefined : selectedListing.id,
            listingName: selectedListing.name,
            listingType: selectedListing.type,
            influencerId: influencerData.influencerId,
            code: couponData.code,
            discountType: couponData.discountType,
            discountValue: couponData.discountValue,
            usageLimit: couponData.usageLimit,
            expiresAt: couponData.expiresAt ? couponData.expiresAt.toISOString() : null,
            commissionType: influencerData.commissionType,
            commissionValue: influencerData.commissionValue,
        });

        if (result.success) {
            toast({
                title: "Promocode Created!",
                description: `Code ${couponData.code} is now active.`
            });
            router.push('/organizer/promocodes');
        } else {
            toast({
                variant: 'destructive',
                title: "Creation Failed",
                description: result.error
            });
        }
        setIsSubmitting(false);
    }

    const titles: Record<number, { title: string, description: string }> = {
        1: { title: "Step 1: Select a Scope", description: "Choose which event, tour, or all listings this promocode will apply to." },
        2: { title: "Step 2: Define Coupon Details", description: `Set the terms for your new coupon for "${selectedListing?.name}".` },
        3: { title: "Step 3: Assign & Finalize", description: "Assign to an influencer for commission tracking or create a general-purpose code." }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            {isSubmitting && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            )}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Create a New Promocode</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{titles[step].title}</CardTitle>
                    <CardDescription>{titles[step].description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && <ListingSelectionStep onSelect={handleListingSelected} />}
                    {step === 2 && <CouponDetailsStep onBack={() => setStep(1)} onNext={handleCouponDataSubmit} />}
                    {step === 3 && selectedListing && couponData && <InfluencerStep onBack={() => setStep(2)} onFinalize={handleFinalize} />}
                </CardContent>
            </Card>
        </div>
    );
}
