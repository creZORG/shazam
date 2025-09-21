
'use server';

import { v2 as cloudinary } from 'cloudinary';
import { logError } from '@/app/developer/analytics/actions';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImage(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided in formData.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: "auto",
        max_file_size: 10000000, // ~10MB
      }, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }).end(buffer);
    });

    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error("[uploadImage] CRITICAL UPLOAD ERROR:", error);
    
    // Log the error to the server-side logging service
    await logError({
      message: error.message || 'Cloudinary upload failed.',
      stack: error.stack,
      path: '/actions/uploadImage',
      userAgent: 'server-action', // This is a server action, so no direct user agent
    });

    const errorMessage = error.message || `An unexpected server error occurred.`;
    
    return { success: false, error: errorMessage };
  }
}
