
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
import { Loader2, UploadCloud, X, ArrowLeft } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { updateProduct } from "@/app/admin/content/actions";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import { getProductById } from "@/app/admin/shop/actions";
import type { Product } from "@/lib/types";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

export default function EditProductPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [isSaving, startSavingTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: { name: "", description: "", price: 0, stock: 100, imageUrls: [], sizes: "S, M, L, XL", colors: "" },
    });

    useEffect(() => {
        if (productId) {
            getProductById(productId).then(result => {
                if (result.success && result.data) {
                    form.reset({
                        ...result.data,
                        sizes: result.data.sizes?.join(', ') || '',
                        colors: result.data.colors?.join(', ') || '',
                    });
                } else {
                    notFound();
                }
                setIsLoading(false);
            });
        }
    }, [productId, form]);

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
            const result = await updateProduct(productId, {
                ...values,
                sizes: values.sizes?.split(',').map(s => s.trim()).filter(Boolean) || [],
                colors: values.colors?.split(',').map(s => s.trim()).filter(Boolean) || [],
            });
            if (result.success) {
                toast({ title: "Product Updated!", description: "Your changes have been saved." });
                router.push('/admin/shop');
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    const imageUrls = form.watch('imageUrls');

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-8">
            <Link href="/admin/shop" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop Management
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Product</CardTitle>
                    <CardDescription>Update the details for "{form.getValues('name')}".</CardDescription>
                </CardHeader>
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
                                    <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-2">
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

                            <Button type="submit" disabled={isSaving || isUploading} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Save Changes</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
