'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Heart,
  HeartOff,
  ShoppingCart,
  Eye,
  Download,
  Share2,
  User,
  Calendar,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'

// Add gallery grid styles
const galleryGridStyles = `
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  @media (min-width: 640px) {
    .gallery-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }
  }
  
  @media (min-width: 1024px) {
    .gallery-grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
  }
`

interface Gallery {
  id: string
  title: string
  description: string | null
  status: string
  package_photos_count: number
  additional_photo_price: number
  expires_at: string | null
  client_id: string // Dodajemy client_id bezpośrednio
  clients: {
    id: string // Dodajemy id do clients
    name: string
    email: string
  }
  photographers: {
    name: string
    business_name: string | null
    phone: string | null
    website: string | null
  }
}

interface Photo {
  id: string
  filename: string
  thumbnail_url: string
  watermark_url: string | null
  upload_order: number | null
}

interface Selection {
  id: string
  photo_id: string
  selected_for_package: boolean
  is_additional_purchase: boolean
}

export default function ClientGalleryPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'select' | 'preview'>('select')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const params = useParams()

  useEffect(() => {
    const loadGallery = async () => {
      try {
        // Load gallery by access code - dodajemy client_id i id do clients
        const { data: galleryData, error: galleryError } = await supabase
          .from('galleries')
          .select(`
            id,
            title,
            description,
            status,
            package_photos_count,
            additional_photo_price,
            expires_at,
            client_id,
            clients(id, name, email),
            photographers(name, business_name, phone, website)
          `)
          .eq('access_code', params.code)
          .single()

        if (galleryError) throw galleryError

        // Transform nested objects
        const transformedGallery = {
          ...galleryData,
          clients: Array.isArray(galleryData.clients) 
            ? galleryData.clients[0] 
            : galleryData.clients,
          photographers: Array.isArray(galleryData.photographers) 
            ? galleryData.photographers[0] 
            : galleryData.photographers
        }

        // Check if gallery is active
        if (transformedGallery.status !== 'active') {
          throw new Error('Ta galeria nie jest już dostępna')
        }

        // Check if gallery expired
        if (transformedGallery.expires_at && new Date(transformedGallery.expires_at) < new Date()) {
          throw new Error('Ta galeria wygasła')
        }

        setGallery(transformedGallery)

        // Load photos
        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('id, filename, thumbnail_url, watermark_url, upload_order')
          .eq('gallery_id', transformedGallery.id)
          .order('upload_order', { ascending: true })

        if (photosError) throw photosError

        setPhotos(photosData || [])

        // Load existing selections for this client - używamy client_id bezpośrednio
        const { data: selectionsData } = await supabase
          .from('client_selections')
          .select('*')
          .eq('gallery_id', transformedGallery.id)
          .eq('client_id', transformedGallery.client_id) // Poprawka: używamy client_id zamiast clients.id

        setSelections(selectionsData || [])

      } catch (error: any) {
        setError(error.message || 'Nie udało się załadować galerii')
      } finally {
        setLoading(false)
      }
    }

    if (params.code) {
      loadGallery()
    }
  }, [params.code])

  const isPhotoSelected = (photoId: string) => {
    return selections.some(s => s.photo_id === photoId)
  }

  const togglePhotoSelection = async (photo: Photo) => {
    if (!gallery) return

    try {
      const existingSelection = selections.find(s => s.photo_id === photo.id)

      if (existingSelection) {
        // Remove selection
        const { error } = await supabase
          .from('client_selections')
          .delete()
          .eq('id', existingSelection.id)

        if (error) {
          console.error('Delete error:', error)
          throw error
        }

        setSelections(prev => prev.filter(s => s.id !== existingSelection.id))
      } else {
        // Add selection - używamy client_id bezpośrednio
        const packageSelections = selections.filter(s => s.selected_for_package).length
        const isForPackage = packageSelections < gallery.package_photos_count

        const selectionData = {
          photo_id: photo.id,
          gallery_id: gallery.id,
          client_id: gallery.client_id,
          selected_for_package: isForPackage,
          is_additional_purchase: !isForPackage
        }

        console.log('Inserting selection:', selectionData)

        const { data, error } = await supabase
          .from('client_selections')
          .insert(selectionData)
          .select()
          .single()

        if (error) {
          console.error('Insert error:', error)
          throw error
        }

        console.log('Selection added:', data)
        setSelections(prev => [...prev, data])
      }
    } catch (error: any) {
      console.error('Error toggling selection:', error)
      alert(`Błąd podczas wybierania zdjęcia: ${error.message}`)
    }
  }

  const getSelectionStats = () => {
    const packageSelections = selections.filter(s => s.selected_for_package).length
    const additionalSelections = selections.filter(s => s.is_additional_purchase).length
    const totalCost = additionalSelections * gallery!.additional_photo_price

    return {
      packageSelections,
      additionalSelections,
      totalSelections: packageSelections + additionalSelections,
      totalCost,
      remainingInPackage: Math.max(0, gallery!.package_photos_count - packageSelections)
    }
  }

  const handleProceedToCheckout = () => {
    // TODO: Implement checkout process with Przelewy24
    alert('Funkcja płatności zostanie wkrótce dodana!')
  }

  const openLightbox = (photoIndex: number) => {
    setCurrentPhotoIndex(photoIndex)
    setShowLightbox(true)
  }

  const closeLightbox = () => {
    setShowLightbox(false)
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!showLightbox) return
    
    switch (e.key) {
      case 'Escape':
        closeLightbox()
        break
      case 'ArrowLeft':
        prevPhoto()
        break
      case 'ArrowRight':
        nextPhoto()
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [showLightbox])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie galerii...</p>
        </div>
      </div>
    )
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <X className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Galeria niedostępna
            </h1>
            <p className="text-gray-600 mb-4">
              {error || 'Nie znaleziono galerii'}
            </p>
            <p className="text-sm text-gray-500">
              Sprawdź kod dostępu lub skontaktuj się z fotografem
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getSelectionStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{galleryGridStyles}</style>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {gallery.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{gallery.clients.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ImageIcon className="h-4 w-4" />
                  <span>{photos.length} zdjęć</span>
                </div>
                {gallery.expires_at && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Do {formatDate(gallery.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selection Summary - Mobile */}
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">
                      {stats.totalSelections} / {gallery.package_photos_count + stats.additionalSelections}
                    </div>
                    <div className="text-xs text-gray-600">
                      wybrane zdjęcia
                    </div>
                    {stats.totalCost > 0 && (
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        +{formatCurrency(stats.totalCost)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Info */}
      {gallery.description && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-gray-700">{gallery.description}</p>
        </div>
      )}

      {/* Photos Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="gallery-grid">
          {photos.map((photo, index) => {
            const isSelected = isPhotoSelected(photo.id)
            const imageUrl = photo.watermark_url || photo.thumbnail_url
            
            return (
              <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Selection Overlay */}
                <div 
                  className={`
                    absolute inset-0 transition-all duration-200 cursor-pointer
                    ${isSelected 
                      ? 'bg-primary/20 border-2 border-primary' 
                      : 'hover:bg-black/10'
                    }
                  `}
                  onClick={() => togglePhotoSelection(photo)}
                >
                  {/* Preview Button */}
                  <div className="absolute top-2 left-2">
                    <div 
                      className="w-8 h-8 rounded-full bg-white/80 text-gray-600 group-hover:bg-white flex items-center justify-center transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        openLightbox(index)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Selection Button */}
                  <div className="absolute top-2 right-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors
                      ${isSelected 
                        ? 'bg-primary text-white' 
                        : 'bg-white/80 text-gray-600 group-hover:bg-white'
                      }
                    `}>
                      {isSelected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Photo Number */}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    #{photo.upload_order}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Brak zdjęć
            </h3>
            <p className="mt-2 text-gray-500">
              Ta galeria nie zawiera jeszcze żadnych zdjęć
            </p>
          </div>
        )}
      </div>

      {/* Bottom Bar - Checkout */}
      {stats.totalSelections > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-inset-bottom">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-gray-900">
                {stats.packageSelections} w pakiecie
                {stats.additionalSelections > 0 && (
                  <span className="text-primary ml-2">
                    +{stats.additionalSelections} dodatkowych
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {stats.remainingInPackage > 0 && (
                  <span>Możesz wybrać jeszcze {stats.remainingInPackage} zdjęć w pakiecie</span>
                )}
                {stats.totalCost > 0 && (
                  <span className="ml-2">• Koszt: {formatCurrency(stats.totalCost)}</span>
                )}
              </div>
            </div>
            
            <Button 
              onClick={handleProceedToCheckout}
              size="lg"
              className="ml-4"
              disabled={stats.totalSelections === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Zamów ({stats.totalSelections})
            </Button>
          </div>
        </div>
      )}

      {/* Photographer Info */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {gallery.photographers.business_name || gallery.photographers.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Fotograf: {gallery.photographers.name}
                </p>
                {gallery.photographers.phone && (
                  <p className="text-sm text-gray-600">
                    Tel: {gallery.photographers.phone}
                  </p>
                )}
              </div>
              {gallery.photographers.website && (
                <Button variant="outline" asChild>
                  <a 
                    href={gallery.photographers.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Strona
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && photos.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-60 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation Buttons */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-60 text-white hover:text-gray-300 transition-colors p-2"
              >
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-60 text-white hover:text-gray-300 transition-colors p-2"
              >
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Photo Container */}
          <div className="relative max-w-7xl max-h-full mx-4 flex items-center justify-center">
            <img
              src={photos[currentPhotoIndex]?.watermark_url || photos[currentPhotoIndex]?.thumbnail_url}
              alt={photos[currentPhotoIndex]?.filename}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>

          {/* Photo Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white">
            <div className="bg-black/50 px-4 py-2 rounded-lg">
              <div className="text-sm">
                #{photos[currentPhotoIndex]?.upload_order} • {currentPhotoIndex + 1} z {photos.length}
              </div>
              <div className="flex items-center justify-center space-x-4 mt-2">
                {/* Selection Toggle in Lightbox */}
                <button
                  onClick={() => togglePhotoSelection(photos[currentPhotoIndex])}
                  className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
                    isPhotoSelected(photos[currentPhotoIndex]?.id)
                      ? 'bg-primary text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isPhotoSelected(photos[currentPhotoIndex]?.id) ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Wybrane</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      <span>Wybierz</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={closeLightbox}
          />
        </div>
      )}
    </div>
  )
}
