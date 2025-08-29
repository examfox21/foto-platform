'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Upload,
  Trash2,
  Eye,
  Download,
  MoreVertical,
  Grid3X3,
  List,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/lib/utils'

interface Photo {
  id: string
  filename: string
  original_url: string
  thumbnail_url: string
  file_size: number | null
  width: number | null
  height: number | null
  upload_order: number | null
  created_at: string
}

interface Gallery {
  id: string
  title: string
  clients: {
    name: string
    email: string
  } | null
}

export default function GalleryPhotosPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const loadGalleryAndPhotos = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Load gallery
        const { data: galleryData, error: galleryError } = await supabase
          .from('galleries')
          .select(`
            id,
            title,
            clients(name, email)
          `)
          .eq('id', params.id)
          .eq('photographer_id', session.user.id)
          .single()

        if (galleryError) throw galleryError

        const transformedGallery = {
          ...galleryData,
          clients: Array.isArray(galleryData.clients) 
            ? galleryData.clients[0] || null 
            : galleryData.clients
        }

        setGallery(transformedGallery)

        // Load photos
        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('gallery_id', params.id)
          .order('upload_order', { ascending: true })

        if (photosError) throw photosError

        setPhotos(photosData || [])
      } catch (error) {
        console.error('Error loading gallery and photos:', error)
        router.push('/galleries')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadGalleryAndPhotos()
    }
  }, [params.id, router])

  const filteredPhotos = photos.filter(photo =>
    photo.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setSelectedPhotos(prev => prev.filter(id => id !== photoId))
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Błąd podczas usuwania zdjęcia')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedPhotos.length === 0) return
    
    if (!confirm(`Czy na pewno chcesz usunąć ${selectedPhotos.length} zdjęć?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .in('id', selectedPhotos)

      if (error) throw error

      setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)))
      setSelectedPhotos([])
    } catch (error) {
      console.error('Error deleting photos:', error)
      alert('Błąd podczas usuwania zdjęć')
    }
  }

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="gallery-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Galeria nie znaleziona</h1>
        <Button asChild>
          <Link href="/galleries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do galerii
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/galleries/${gallery.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{gallery.title}</h1>
          <p className="text-gray-600">
            {gallery.clients?.name} • {photos.length} zdjęć
          </p>
        </div>
        <Button asChild>
          <Link href={`/galleries/${gallery.id}/upload`}>
            <Upload className="mr-2 h-4 w-4" />
            Dodaj zdjęcia
          </Link>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Szukaj zdjęć..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          {selectedPhotos.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Wybrano: {selectedPhotos.length}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń ({selectedPhotos.length})
              </Button>
            </div>
          )}
          
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Photos */}
      {filteredPhotos.length > 0 ? (
        <div className={viewMode === 'grid' ? 'gallery-grid' : 'space-y-4'}>
          {viewMode === 'grid' ? (
            // Grid View
            filteredPhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={photo.thumbnail_url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(photo.original_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePhoto(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Selection checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.includes(photo.id)}
                    onChange={() => togglePhotoSelection(photo.id)}
                    className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary"
                  />
                </div>

                {/* Upload order */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  #{photo.upload_order}
                </div>
              </div>
            ))
          ) : (
            // List View
            filteredPhotos.map((photo) => (
              <Card key={photo.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.includes(photo.id)}
                      onChange={() => togglePhotoSelection(photo.id)}
                      className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary"
                    />
                    
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.filename}
                      className="w-16 h-16 object-cover rounded"
                      loading="lazy"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {photo.filename}
                      </h3>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Rozmiar: {photo.file_size ? formatBytes(photo.file_size) : 'Nieznany'}</div>
                        {photo.width && photo.height && (
                          <div>Wymiary: {photo.width} × {photo.height}px</div>
                        )}
                        <div>Dodano: {formatDate(photo.created_at)}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(photo.original_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Upload />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            {searchTerm ? 'Brak wyników' : 'Brak zdjęć'}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchTerm 
              ? `Nie znaleziono zdjęć dla "${searchTerm}"` 
              : 'Ta galeria nie zawiera jeszcze żadnych zdjęć'
            }
          </p>
          {!searchTerm && (
            <Button className="mt-4" asChild>
              <Link href={`/galleries/${gallery.id}/upload`}>
                <Upload className="mr-2 h-4 w-4" />
                Dodaj pierwsze zdjęcia
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
