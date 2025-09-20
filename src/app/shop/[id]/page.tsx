
import { getProductById } from '@/app/admin/shop/actions';
import type { Product } from '@/lib/types';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProductDetailClient from './ProductDetailClient';
import { ProductPageSkeleton } from './_components/ProductPageSkeleton';


type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: product } = await getProductById(params.id);

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }
  
  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://naksyetu.com'}/shop/${product.id}`;

  return {
    title: `${product.name} | NaksYetu Shop`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.substring(0, 160),
      url: productUrl,
      images: [
        {
          url: product.imageUrls[0],
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description.substring(0, 160),
      images: [product.imageUrls[0]],
    },
  }
}


export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const { data: initialProduct } = await getProductById(params.id);
    
    return (
        <Suspense fallback={<ProductPageSkeleton />}>
            <ProductDetailClient initialProduct={initialProduct} productId={params.id} />
        </Suspense>
    );
}
