
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/app/admin/content/actions";
import type { Product } from "@/lib/types";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from 'next';
import ShopPageClient from './ShopPageClient';

export const metadata: Metadata = {
  title: 'Mov33 Shop | Official Merchandise',
  description: 'Grab your official Mov33 merchandise. Hoodies, t-shirts, and more, available for pickup at our events.',
  openGraph: {
    title: 'Mov33 Shop | Official Merchandise',
    description: 'The official place to get your Mov33 gear.',
    url: 'https://mov33.com/shop',
    images: [
      {
        url: 'https://i.postimg.cc/4yK23PLk/download.png', // A generic brand image
        width: 1200,
        height: 630,
        alt: 'Mov33 Shop',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mov33 Shop | Official Merchandise',
    description: 'The official place to get your Mov33 gear.',
    images: ['https://i.postimg.cc/4yK23PLk/download.png'],
  },
};

export default async function ShopPage() {
    const { data: initialProducts } = await getProducts(false); // Fetch only active products
    const sortedProducts = initialProducts?.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    
    return <ShopPageClient initialProducts={sortedProducts} />;
}
