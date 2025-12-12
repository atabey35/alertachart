import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { fileTypeFromBuffer } from 'file-type';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Dosya bulunamadı.' },
        { status: 400 }
      );
    }

    // Dosya boyutunu kontrol et (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Dosya boyutu 5MB\'dan büyük olamaz.' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Validate file type by MIME type (client-provided, can be spoofed)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Sadece JPEG, PNG, WebP ve GIF formatları desteklenir.' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Validate file type by magic bytes (file signature) - REAL file type check
    // This prevents malicious files with fake MIME types
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      return NextResponse.json(
        { success: false, error: 'Dosya tipi tespit edilemedi. Lütfen geçerli bir görsel dosyası yükleyin.' },
        { status: 400 }
      );
    }

    // Check if detected file type matches allowed types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(fileType.mime)) {
      return NextResponse.json(
        { success: false, error: `Dosya tipi geçersiz. Tespit edilen tip: ${fileType.mime}. Sadece JPEG, PNG, WebP ve GIF formatları desteklenir.` },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Additional check - ensure MIME type from client matches detected type
    // This prevents files with mismatched MIME types
    if (file.type !== fileType.mime) {
      console.warn('[Upload API] MIME type mismatch:', {
        clientType: file.type,
        detectedType: fileType.mime,
        fileName: file.name,
      });
      // Use detected type instead of client-provided type for security
    }

    // Unique dosya adı oluştur
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    // 🔒 SECURITY: Use detected file extension instead of client-provided extension
    const fileExtension = fileType.ext || 'jpg';
    const fileName = `uploads/${timestamp}-${randomString}.${fileExtension}`;

    // Vercel Blob Storage'a yükle
    // 🔒 SECURITY: Use detected MIME type instead of client-provided type
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: fileType.mime, // Use detected type, not client-provided
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    
    // 🔒 SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    return NextResponse.json(
      { 
        success: false, 
        error: isProduction 
          ? 'Dosya yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' 
          : 'Dosya yüklenirken bir hata oluştu.',
        ...(isProduction ? {} : { details: error.message }) // Only in development
      },
      { status: 500 }
    );
  }
}

