

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/app/admin/content/actions";
import type { Product } from "@/lib/types";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function ProductCard({ product }: { product: Product }) {
    const hasDiscount = typeof product.discountPrice === 'number' && product.discountPrice < product.price;

    return (
        <Card className="overflow-hidden group">
            <Link href={`/shop/${product.id}`} className="block">
                <div className="relative aspect-square">
                    <Image
                        src={product.imageUrls[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
                <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                </CardHeader>
            </Link>
            <CardContent>
                <div className="flex justify-between items-center">
                    <div>
                        {hasDiscount ? (
                            <div className="flex items-baseline gap-2">
                                <p className="font-bold text-lg text-primary">Ksh {product.discountPrice?.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground line-through">Ksh {product.price.toLocaleString()}</p>
                            </div>
                        ) : (
                            <p className="font-bold text-lg text-primary">Ksh {product.price.toLocaleString()}</p>
                        )}
                    </div>
                     <p className="text-sm text-muted-foreground">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
                </div>
            </CardContent>
             <CardFooter>
                 <Link href={`/shop/${product.id}`} className="w-full">
                    <Button className="w-full">
                        <ShoppingBag className="mr-2 h-4 w-4" /> View Product
                    </Button>
                 </Link>
            </CardFooter>
        </Card>
    );
}


export default function ShopPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then(result => {
            if (result.data) {
                // Sort client-side since server-side sort was removed
                const sortedData = result.data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setProducts(sortedData);
            }
            setLoading(false);
        });
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">NaksYetu Shop</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
                    Grab your official NaksYetu merchandise. All items are available for pickup at our events.
                </p>
            </div>
            
            {loading ? (
                 <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-20">The shop is currently empty. Check back soon for new merchandise!</p>
            )}
        </div>
    );
}
