'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Upload,
  Eye,
  Edit,
  Share2,
  Copy,
  Calendar,
  User,
  Image,
  Settings,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Gallery {
  id: string
  title: string
  description: string | null
  access_code: string
  status: string
  package_photos_count: number
  additional_photo_price: number
  expires_at: string | null
  created_at: string
  clients: {
    name: string
    email: string
  } | null
}

export default function GalleryDetailPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoCount, setPhotoCount] = useState(0)
  const [selectionCount, setSelectionCount] = useState(0)
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

        const { data: galleryData, error } = await supabase
          .from('galleries')
          .select(`
            id,
            title,
            description,
            access_code,
            status,
            package_photos_count,
            additional_photo_price,
            expires_at,
            created_at,
            clients(name, email)
          `)
          .eq('id', params.id)
          .eq('photographer_id', session.user.id)
          .single()

        if (error) throw error

        // Transform clients if it's an array
        const transformedGallery = {
          ...galleryData,
          clients: Array.isArray(galleryData.clients) 
            ? galleryData.clients[0] || null 
            : galleryData.clients
        }

        setGallery(transformedGallery)

        // Get counts
        const [photosResult, selectionsResult] = await Promise.all([
          supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', params.id),
          supabase
            .from('client_selections')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', params.id)
        ])

        setPhotoCount(photosResult.count || 0)
        setSelectionCount(selectionsResult.count || 0)

      } catch (error) {
        console.error('Error loading gallery:', error)
        router.push('/galleries')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadGallery()
    }
  }, [params.id, router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktywna'
      case 'draft':
        return 'Szkic'
      case 'completed':
        return 'Zakończona'
      case 'expired':
        return 'Wygasła'
      default:
        return status
    }
  }

  const copyGalleryLink = () => {
    const link = `${window.location.origin}/gallery/${gallery?.access_code}`
    navigator.clipboard.writeText(link)
    // TODO: Add toast notification
  }

  const copyAccessCode = () => {
    if (gallery?.access_code) {
      navigator.clipboard.writeText(gallery.access_code)
      // TODO: Add toast notification
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/galleries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{gallery.title}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(gallery.status)}`}>
              {getStatusText(gallery.status)}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {gallery.clients?.name} • Utworzono {formatDate(gallery.created_at)}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/galleries/${gallery.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </Link>
          </Button>
          <Button onClick={copyGalleryLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Udostępnij
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Image className="mx-auto h-8 w-8 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{photoCount}</p>
            <p className="text-sm text-gray-600">Zdjęć w galerii</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Eye className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{selectionCount}</p>
            <p className="text-sm text-gray-600">Wybranych przez klienta</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Settings className="mx-auto h-8 w-8 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{gallery.package_photos_count}</p>
            <p className="text-sm text-gray-600">Zdjęć w pakiecie</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="mx-auto h-8 w-8 text-orange-600 mb-2" />
            <p className="text-sm font-medium">
              {gallery.expires_at ? formatDate(gallery.expires_at) : 'Bez limitu'}
            </p>
            <p className="text-sm text-gray-600">Data wygaśnięcia</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Gallery Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery Details */}
          <Card>
            <CardHeader>
              <CardTitle>Szczegóły galerii</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gallery.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Opis</label>
                  <p className="mt-1 text-gray-900">{gallery.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Klient</label>
                  <p className="mt-1 text-gray-900">{gallery.clients?.name}</p>
                  <p className="text-sm text-gray-500">{gallery.clients?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(gallery.status)}`}>
                      {getStatusText(gallery.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Zdjęcia w pakiecie</label>
                  <p className="mt-1 text-gray-900">{gallery.package_photos_count} zdjęć</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cena za dodatkowe</label>
                  <p className="mt-1 text-gray-900">
                    {gallery.additional_photo_price > 0 
                      ? formatCurrency(gallery.additional_photo_price) 
                      : 'Brak dodatkowych'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Zdjęcia ({photoCount})</CardTitle>
                <Button asChild>
                  <Link href={`/galleries/${gallery.id}/upload`}>
                    <Upload className="h-4 w-4 mr-2" />
                    Dodaj zdjęcia
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {photoCount === 0 ? (
                <div className="text-center py-8">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Brak zdjęć
                  </h3>
                  <p className="mt-2 text-gray-500">
                    Dodaj pierwsze zdjęcia do tej galerii
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href={`/galleries/${gallery.id}/upload`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj zdjęcia
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">
                    Galeria zawiera {photoCount} zdjęć
                  </p>
                  <Button variant="outline" className="mt-2" asChild>
                    <Link href={`/galleries/${gallery.id}/photos`}>
                      Zobacz wszystkie zdjęcia
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Access Code */}
          <Card>
            <CardHeader>
              <CardTitle>Kod dostępu</CardTitle>
              <CardDescription>
                Przekaż ten kod klientowi aby mógł zobaczyć galerię
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-center font-mono text-lg">
                  {gallery.access_code}
                </code>
                <Button variant="ghost" size="sm" onClick={copyAccessCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={copyGalleryLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Kopiuj link do galerii
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/galleries/${gallery.id}/upload`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Dodaj zdjęcia
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/galleries/${gallery.id}/selections`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Zobacz wybory klienta
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/galleries/${gallery.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj galerię
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
