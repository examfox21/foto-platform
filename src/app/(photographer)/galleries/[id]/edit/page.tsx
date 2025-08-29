'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Image, 
  DollarSign, 
  Calendar,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface Gallery {
  id: string
  title: string
  description: string | null
  access_code: string
  status: string
  package_photos_count: number
  additional_photo_price: number
  expires_at: string | null
  client_id: string
  clients: {
    id: string
    name: string
    email: string
  } | null
}

interface Client {
  id: string
  name: string
  email: string
}

export default function EditGalleryPage() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    package_photos_count: 20,
    additional_photo_price: 15.00,
    expires_at: '',
    status: 'draft'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const loadGalleryAndClients = async () => {
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
            description,
            access_code,
            status,
            package_photos_count,
            additional_photo_price,
            expires_at,
            client_id,
            clients(id, name, email)
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

        // Set form data from gallery
        setFormData({
          title: transformedGallery.title,
          description: transformedGallery.description || '',
          client_id: transformedGallery.client_id,
          package_photos_count: transformedGallery.package_photos_count,
          additional_photo_price: transformedGallery.additional_photo_price,
          expires_at: transformedGallery.expires_at 
            ? new Date(transformedGallery.expires_at).toISOString().split('T')[0] 
            : '',
          status: transformedGallery.status
        })

        // Load clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('photographer_id', session.user.id)
          .order('name', { ascending: true })

        if (clientsError) throw clientsError

        setClients(clientsData || [])

      } catch (error) {
        console.error('Error loading gallery:', error)
        router.push('/galleries')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadGalleryAndClients()
    }
  }, [params.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!formData.title.trim() || !formData.client_id) {
        throw new Error('Tytuł galerii i klient są wymagane')
      }

      if (formData.package_photos_count < 1) {
        throw new Error('Liczba zdjęć w pakiecie musi być większa od 0')
      }

      // Update gallery
      const { error } = await supabase
        .from('galleries')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          client_id: formData.client_id,
          package_photos_count: formData.package_photos_count,
          additional_photo_price: formData.additional_photo_price,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
          status: formData.status
        })
        .eq('id', params.id)

      if (error) throw error

      router.push(`/galleries/${params.id}`)
    } catch (error: any) {
      setError(error.message || 'Błąd podczas zapisywania galerii')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć tę galerię? Wszystkie zdjęcia również zostaną usunięte. Ta operacja jest nieodwracalna.')) {
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('galleries')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      router.push('/galleries')
    } catch (error: any) {
      setError(error.message || 'Błąd podczas usuwania galerii')
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/galleries/${gallery.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edytuj galerię</h1>
          <p className="text-sm text-gray-500">
            {gallery.title} • Kod: {gallery.access_code}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły galerii</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-gray-700">
                Tytuł galerii *
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Sesja ślubna - Anna i Piotr"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Opis (opcjonalny)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Krótki opis sesji fotograficznej..."
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="client_id" className="text-sm font-medium text-gray-700">
                Klient *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Wybierz klienta...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status galerii *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="draft">Szkic</option>
                <option value="active">Aktywna</option>
                <option value="completed">Zakończona</option>
                <option value="expired">Wygasła</option>
              </select>
              <p className="text-xs text-gray-500">
                Tylko aktywne galerie są dostępne dla klientów
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="package_photos_count" className="text-sm font-medium text-gray-700">
                  Zdjęcia w pakiecie *
                </label>
                <Input
                  id="package_photos_count"
                  name="package_photos_count"
                  type="number"
                  value={formData.package_photos_count}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="additional_photo_price" className="text-sm font-medium text-gray-700">
                  Cena za dodatkowe zdjęcie (PLN)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="additional_photo_price"
                    name="additional_photo_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.additional_photo_price}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="expires_at" className="text-sm font-medium text-gray-700">
                Data wygaśnięcia
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Po tej dacie klienci nie będą mogli już wybierać zdjęć
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Zapisywanie...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>Zapisz zmiany</span>
                  </div>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/galleries/${gallery.id}`)}
                disabled={isLoading}
              >
                Anuluj
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Strefa niebezpieczna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-900">Usuń galerię</h3>
              <p className="text-sm text-red-700">
                Permanentnie usuń tę galerię i wszystkie jej zdjęcia. Ta operacja jest nieodwracalna.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń galerię
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
