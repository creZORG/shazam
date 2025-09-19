

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useCallback, useEffect, useTransition } from "react";
import { Loader2, UploadCloud, X, Trash2, EyeOff, Eye, Edit } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { createProduct, getProducts, updateProductStatus } from "@/app/admin/content/actions";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

const productSchema = z.object({
    name: z.string().min(3, "Product name is required."),
    description: z.string().min(10, "Description is required."),
    price: z.coerce.number().min(0, "Price must be positive."),
    discountPrice: z.coerce.number().optional(),
    stock: z.coerce.number().int().min(0, "Stock must be positive."),
    imageUrls: z.array(z.string().url()).min(1, "At least one image is required.").max(5, "You can upload a maximum of 5 images."),
    sizes: z.string().optional(), // Comma-separated
    colors: z.string().optional(), // Comma-separated
});

function ProductListItem({ product, onStatusChange }: { product: Product, onStatusChange: (id: string, status: 'active' | 'taken-down') => void }) {
    const { toast } = useToast();
    const [isUpdating, startUpdating] = useTransition();

    const handleStatusToggle = () => {
        startUpdating(async () => {
            const newStatus = product.status === 'active' ? 'taken-down' : 'active';
            const result = await updateProductStatus(product.id, newStatus);
            if (result.success) {
                onStatusChange(product.id, newStatus);
                toast({ title: 'Status Updated', description: `${product.name} is now ${newStatus === 'active' ? 'visible' : 'hidden'}.` });
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    }

    return (
        <div className="flex items-center gap-4 p-2 border rounded-lg">
            <Image src={product.imageUrls[0]} alt={product.name} width={64} height={64} className="rounded-md object-cover aspect-square" />
            <div className="flex-grow">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-primary">Ksh {product.price.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {product.status}
                </Badge>
                <div className="flex gap-1">
                    <Link href={`/admin/shop/edit/${product.id}`}>
                        <Button variant="outline" size="icon" className="h-8 w-8"><Edit /></Button>
                    </Link>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleStatusToggle} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="animate-spin" /> : product.status === 'active' ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" disabled><Trash2 /></Button>
                </div>
            </div>
        </div>
    );
}

export default function AdminShopPage() {
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: { name: "", description: "", price: 0, stock: 100, imageUrls: [], sizes: "S, M, L, XL", colors: "" },
    });

    const fetchProducts = useCallback(() => {
        setIsLoading(true);
        getProducts(true).then(result => {
            if (result.data) setProducts(result.data);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);
    
    const handleStatusChange = (productId: string, newStatus: 'active' | 'taken-down') => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const currentImages = form.getValues("imageUrls") || [];
            if (currentImages.length + acceptedFiles.length > 5) {
                toast({ variant: 'destructive', title: 'Limit Exceeded', description: 'You can only upload up to 5 images per product.' });
                return;
            }

            setIsUploading(true);
            const uploadPromises = acceptedFiles.map(file => {
                const formData = new FormData();
                formData.append("file", file);
                return uploadImage(formData);
            });
            
            const results = await Promise.all(uploadPromises);
            const newUrls = results.filter(r => r.success).map(r => r.url!);
            
            form.setValue("imageUrls", [...currentImages, ...newUrls], { shouldValidate: true, shouldDirty: true });

            setIsUploading(false);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 5,
        multiple: true,
    });
    
    const handleRemoveImage = (index: number) => {
        const currentImages = form.getValues("imageUrls");
        currentImages.splice(index, 1);
        form.setValue("imageUrls", currentImages, { shouldValidate: true, shouldDirty: true });
    }

    const onSubmit = (values: z.infer<typeof productSchema>) => {
        startSavingTransition(async () => {
            const result = await createProduct({
                ...values,
                status: 'active',
                sizes: values.sizes?.split(',').map(s => s.trim()).filter(Boolean) || [],
                colors: values.colors?.split(',').map(s => s.trim()).filter(Boolean) || [],
            });
            if (result.success) {
                toast({ title: "Product Created!", description: "The new product has been added to the shop." });
                fetchProducts();
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    const imageUrls = form.watch('imageUrls');

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Manage Shop</h1>
            <div className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                     <Card>
                        <CardHeader><CardTitle>Add New Product</CardTitle></CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormItem>
                                        <FormLabel>Product Images (up to 5)</FormLabel>
                                        <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
                                            <input {...getInputProps()} />
                                            {isUploading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : (
                                                <div className="text-muted-foreground">
                                                    <UploadCloud className="mx-auto h-12 w-12" />
                                                    <p>Click or drag to upload</p>
                                                </div>
                                            )}
                                        </div>
                                         {imageUrls.length > 0 && (
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                {imageUrls.map((url, index) => (
                                                    <div key={index} className="relative aspect-square group">
                                                        <Image src={url} alt={`Preview ${index}`} fill className="object-cover rounded-md" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveImage(index)}>
                                                            <X className="h-3 w-3"/>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <FormMessage>{form.formState.errors.imageUrls?.message}</FormMessage>
                                    </FormItem>
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., NaksYetu Hoodie" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short description of the product." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (Ksh)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                         <FormField control={form.control} name="discountPrice" render={({ field }) => (<FormItem><FormLabel>Discount Price (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    <FormField control={form.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="sizes" render={({ field }) => (<FormItem><FormLabel>Available Sizes (comma-separated)</FormLabel><FormControl><Input placeholder="S, M, L, XL" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="colors" render={({ field }) => (<FormItem><FormLabel>Available Colors (comma-separated)</FormLabel><FormControl><Input placeholder="Black, White, Orange" {...field} /></FormControl><FormMessage /></FormItem>)}/>

                                    <Button type="submit" disabled={isSaving || isUploading} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Add Product</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-3">
                     <Card>
                        <CardHeader>
                            <CardTitle>Current Products</CardTitle>
                            <CardDescription>An overview of all items currently in your shop.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : products.length === 0 ? <p className="text-muted-foreground text-center">No products created yet.</p> :
                                products.map(product => (
                                    <ProductListItem key={product.id} product={product} onStatusChange={handleStatusChange} />
                                ))
                            }
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
