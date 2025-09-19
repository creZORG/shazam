
'use client';

import { useState, useEffect, Suspense } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { getProductById } from '@/app/admin/shop/actions';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShoppingBag, ArrowLeft, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


function ProductPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <Skeleton className="aspect-square w-full" />
                <div className="space-y-6">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}

function ProductDetailClient({ params }: { params: { id: string } }) {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const router = useRouter();
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (params.id) {
            getProductById(params.id).then(result => {
                if (result.success && result.data) {
                    setProduct(result.data);
                    if (result.data.sizes && result.data.sizes.length > 0) {
                        setSelectedSize(result.data.sizes[0]);
                    }
                     if (result.data.colors && result.data.colors.length > 0) {
                        setSelectedColor(result.data.colors[0]);
                    }
                } else {
                    notFound();
                }
                setLoading(false);
            });
        }
    }, [params.id]);

    useEffect(() => {
        if (!carouselApi) return;
        setCurrent(carouselApi.selectedScrollSnap() + 1);
        carouselApi.on("select", () => {
            setCurrent(carouselApi.selectedScrollSnap() + 1);
        });
    }, [carouselApi]);

    const handleCheckout = () => {
        if (!product || product.stock <= 0) return;
        
        const checkoutUrl = `/shop/checkout?productId=${product.id}&size=${selectedSize || ''}&color=${selectedColor || ''}&quantity=1`;
        router.push(checkoutUrl);
    }

    if (loading) {
        return <ProductPageSkeleton />;
    }

    if (!product) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
             <Link href="/shop" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
            </Link>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-4">
                    <Carousel setApi={setCarouselApi}>
                        <CarouselContent>
                            {product.imageUrls.map((url, index) => (
                                <CarouselItem key={index}>
                                    <Card className="overflow-hidden">
                                        <div className="relative aspect-square">
                                            <Image src={url} alt={`${product.name} image ${index + 1}`} layout="fill" className="object-cover" />
                                        </div>
                                    </Card>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </Carousel>
                     <div className="text-center text-sm text-muted-foreground">
                        {current} of {product.imageUrls.length}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                        <p className="text-2xl font-semibold text-primary mt-2">Ksh {product.price.toLocaleString()}</p>
                    </div>

                    <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                    
                    <Separator />

                    {product.sizes && product.sizes.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-lg font-semibold">Size</Label>
                            <RadioGroup value={selectedSize || ''} onValueChange={setSelectedSize} className="flex flex-wrap gap-2">
                                {product.sizes.map(size => (
                                    <RadioGroupItem key={size} value={size} id={`size-${size}`} className="sr-only" />
                                ))}
                                {product.sizes.map(size => (
                                    <Label key={`label-${size}`} htmlFor={`size-${size}`} className={`cursor-pointer border-2 rounded-md px-4 py-2 transition-colors ${selectedSize === size ? 'border-primary bg-primary/10' : 'border-border'}`}>{size}</Label>
                                ))}
                            </RadioGroup>
                        </div>
                    )}
                    
                    {product.colors && product.colors.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-lg font-semibold">Color</Label>
                             <RadioGroup value={selectedColor || ''} onValueChange={setSelectedColor} className="flex flex-wrap gap-2">
                                {product.colors.map(color => (
                                    <RadioGroupItem key={color} value={color} id={`color-${color}`} className="sr-only" />
                                ))}
                                {product.colors.map(color => (
                                    <Label key={`label-${color}`} htmlFor={`color-${color}`} className={`cursor-pointer border-2 rounded-full h-10 w-10 flex items-center justify-center transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary' : 'border-border'}`} style={{ backgroundColor: color }} title={color}></Label>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

                    <Button size="lg" className="w-full mt-8" onClick={handleCheckout} disabled={product.stock <= 0}>
                        {product.stock > 0 ? (
                            <>
                                <ShoppingBag className="mr-2" />
                                Add to Cart & Checkout
                            </>
                        ) : (
                             <>
                                <XCircle className="mr-2" />
                                Out of Stock
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Items are available for pickup at NaksYetu events. No delivery.</p>
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
    return (
        <Suspense fallback={<ProductPageSkeleton />}>
            <ProductDetailClient params={params} />
        </Suspense>
    );
}
