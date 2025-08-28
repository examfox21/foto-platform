'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Eye, 
  Edit,
  Copy,
  MoreVertical,
  Calendar,
  User,
  Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  }
  _count?: {
    photos: number
    selections: number
  }
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadGalleries = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: galleriesData, error } = await supabase
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
            clients!inner(name, email)
          `)
          .eq('photographer_id', session.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Get counts for each gallery
        const galleriesWithCounts = await Promise.all(
          (galleriesData || []).map(async (gallery) => {
            const [photosCount, selectionsCount] = await Promise.all([
              supabase
                .from('photos')
                .select('*', { count: 'exact', head: true })
                .eq('gallery_id', gallery.id),
              supabase
                .from('client_selections')
                .select('*', { count: 'exact', head: true })
                .eq('gallery_id', gallery.id)
            ])

            return {
              ...gallery,
              _count: {
                photos: photosCount.count || 0,
                selections: selectionsCount.count || 0
              }
            }
          })
        )

        setGalleries(galleriesWithCounts)
      } catch (error) {
        console.error('Error loading galleries:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGalleries()
  }, [])

  const filteredGalleries = galleries.filter(gallery =>
    gallery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const copyAccessCode = (accessCode: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/gallery/${accessCode}`)
    // TODO: Add toast notification
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galerie</h1>
          <p className="mt-1 text-sm text-gray-500">
            Zarządzaj swoimi galeriami fotograficznymi
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link href="/galleries/new">
              <Plus className="mr-2 h-4 w-4" />
              Nowa galeria
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Szukaj galerii..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Galleries Grid */}
      {filteredGalleries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGalleries.map((gallery) => (
            <Card key={gallery.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-medium truncate">
                      {gallery.title}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4" />
                      <span className="truncate">{gallery.clients?.name}</span>
                    </CardDescription>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(gallery.status)}`}>
                    {getStatusText(gallery.status)}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Image className="h-4 w-4 text-gray-400" />
                    <span>{gallery._count?.photos || 0} zdjęć</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span>{gallery._count?.selections || 0} wybranych</span>
                  </div>
                </div>

                {/* Package Info */}
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <span>Pakiet: {gallery.package_photos_count} zdjęć</span>
                    {gallery.additional_photo_price > 0 && (
                      <span>+{formatCurrency(gallery.additional_photo_price)}/szt</span>
                    )}
                  </div>
                </div>

                {/* Access Code */}
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {gallery.access_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAccessCode(gallery.access_code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* Meta */}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(gallery.created_at)}</span>
                  </div>
                  {gallery.expires_at && (
                    <div className="flex items-center space-x-1">
                      <span>Wygasa: {formatDate(gallery.expires_at)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/galleries/${gallery.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Zobacz
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link href={`/galleries/${gallery.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {searchTerm ? (
            <div>
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak wyników
              </h3>
              <p className="mt-2 text-gray-500">
                Nie znaleziono galerii dla frazy "{searchTerm}"
              </p>
            </div>
          ) : (
            <div>
              <Image className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak galerii
              </h3>
              <p className="mt-2 text-gray-500">
                Stwórz swoją pierwszą galerię fotograficzną
              </p>
              <Button className="mt-4" asChild>
                <Link href="/galleries/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nowa galeria
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
