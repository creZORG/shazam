
'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImage(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
  try {
    console.log('[uploadImage] Action started.');

    const file = formData.get('file') as File;
    if (!file) {
      console.error('[uploadImage] Error: No file provided in formData.');
      return { success: false, error: 'No file provided.' };
    }
    console.log(`[uploadImage] File received: ${file.name}, Size: ${file.size} bytes`);


    // Convert file to buffer
    console.log('[uploadImage] Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    console.log('[uploadImage] File converted to buffer successfully.');

    // Upload to Cloudinary and get the URL
    console.log('[uploadImage] Starting upload stream to Cloudinary...');
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: "auto",
        max_file_size: 10000000, // ~10MB
      }, (error, result) => {
        if (error) {
          console.error('[uploadImage] Cloudinary upload stream callback error:', error);
          reject(error);
          return;
        }
        resolve(result);
      }).end(buffer);
    });
    console.log('[uploadImage] Cloudinary upload stream finished successfully.');

    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error("==================================================================");
    console.error("!!!!!!!!!! [uploadImage] CRITICAL UPLOAD ERROR CATCH !!!!!!!!!!!");
    console.error("==================================================================");
    
    // Log every possible piece of information about the error
    console.error("[uploadImage] Error Type:", typeof error);
    console.error("[uploadImage] Error Name:", error.name);
    console.error("[uploadImage] Error Message:", error.message);
    console.error("[uploadImage] Error Stack:", error.stack);
    
    let fullErrorObject: string;
    try {
        fullErrorObject = JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
        fullErrorObject = "Could not stringify the full error object.";
    }
    console.error("[uploadImage] Full Error Object (stringified):", fullErrorObject);
    
    // Construct the most detailed error message possible for the client
    const errorMessage = error.message || `An unexpected server error occurred. Check server logs for details. Raw error: ${fullErrorObject}`;
    
    return { success: false, error: errorMessage };
  }
}
