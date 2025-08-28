'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { 
  ArrowLeft, 
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, uploadPhoto, getPhotoUrl } from '@/lib/supabase'
import { formatBytes } from '@/lib/utils'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  preview?: string
}

interface Gallery {
  id: string
  title: string
  clients: {
    name: string
  } | null
}

export default function GalleryUploadPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        const { data: galleryData, error } = await supabase
          .from('galleries')
          .select(`
            id,
            title,
            clients(name)
          `)
          .eq('id', params.id)
          .eq('photographer_id', session.user.id)
          .single()

        if (error) throw error

        const transformedGallery = {
          ...galleryData,
          clients: Array.isArray(galleryData.clients) 
            ? galleryData.clients[0] || null 
            : galleryData.clients
        }

        setGallery(transformedGallery)
      } catch (error) {
        console.error('Error loading gallery:', error)
        router.push('/galleries')
      }
    }

    if (params.id) {
      loadGallery()
    }
  }, [params.id, router])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      status: 'pending',
      progress: 0,
      preview: URL.createObjectURL(file)
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB per file
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const uploadFiles = async () => {
    if (!gallery || !user) return

    setUploading(true)
    const pendingFiles = files.filter(f => f.status === 'pending')

    for (let i = 0; i < pendingFiles.length; i++) {
      const uploadFile = pendingFiles[i]
      
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ))

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const fileExt = uploadFile.file.name.split('.').pop()
        const fileName = `${gallery.id}/${timestamp}-${randomString}.${fileExt}`

        // Upload original to Supabase Storage
        const originalPath = `photos/${fileName}`
        await uploadPhoto(uploadFile.file, 'photos', originalPath)

        // Create thumbnail (simplified - just use smaller version)
        const thumbnailPath = `thumbnails/${fileName}`
        
        // For demo purposes, we'll use the same file as thumbnail
        // In production, you'd resize the image here
        await uploadPhoto(uploadFile.file, 'thumbnails', thumbnailPath)

        // Get URLs
        const originalUrl = getPhotoUrl('photos', originalPath)
        const thumbnailUrl = getPhotoUrl('thumbnails', thumbnailPath)

        // Save to database
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            gallery_id: gallery.id,
            filename: uploadFile.file.name,
            original_url: originalUrl,
            thumbnail_url: thumbnailUrl,
            file_size: uploadFile.file.size,
            upload_order: i + 1
          })

        if (dbError) throw dbError

        // Update status to success
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        ))

      } catch (error) {
        console.error('Error uploading file:', error)
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: 'Błąd podczas przesyłania' }
            : f
        ))
      }
    }

    setUploading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default:
        return <ImageIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  if (!gallery) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/galleries/${gallery.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dodaj zdjęcia</h1>
          <p className="text-sm text-gray-500">
            {gallery.title} • {gallery.clients?.name}
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Wybierz zdjęcia</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary font-medium">
                Upuść zdjęcia tutaj...
              </p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Przeciągnij zdjęcia lub kliknij aby wybrać
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Obsługujemy formaty: JPG, PNG, GIF, WEBP (maks. 50MB na plik)
                </p>
                <Button type="button">
                  <Plus className="mr-2 h-4 w-4" />
                  Wybierz pliki
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Wybrane pliki ({files.length})
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={uploadFiles}
                  disabled={uploading || pendingCount === 0}
                >
                  {uploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Przesyłanie...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Prześlij ({pendingCount})</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
            {(successCount > 0 || errorCount > 0) && (
              <div className="text-sm text-gray-600">
                Wysłano: {successCount} • Błędy: {errorCount}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {files.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  {uploadFile.preview && (
                    <img
                      src={uploadFile.preview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(uploadFile.file.size)}
                    </p>
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-1 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}
                    {uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(uploadFile.status)}
                    {uploadFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {successCount > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">
                  Przesłano {successCount} zdjęć
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Zdjęcia są już dostępne w galerii dla klienta
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Button variant="outline" asChild>
                <Link href={`/galleries/${gallery.id}`}>
                  Zobacz galerię
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setFiles([])}>
                Dodaj więcej zdjęć
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
