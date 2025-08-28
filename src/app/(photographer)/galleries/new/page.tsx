'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Image, 
  DollarSign, 
  Calendar,
  Users,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { generateAccessCode } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string
}

export default function NewGalleryPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    package_photos_count: 20,
    additional_photo_price: 15.00,
    expires_at: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingClients, setLoadingClients] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('photographer_id', session.user.id)
          .order('name', { ascending: true })

        if (error) throw error

        setClients(clientsData || [])

        // Pre-select client if provided in URL
        if (preselectedClient && clientsData?.some(c => c.id === preselectedClient)) {
          setFormData(prev => ({ ...prev, client_id: preselectedClient }))
        }
      } catch (error) {
        console.error('Error loading clients:', error)
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [preselectedClient])

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Nie jesteś zalogowany')
      }

      // Validate form
      if (!formData.title.trim() || !formData.client_id) {
        throw new Error('Tytuł galerii i klient są wymagane')
      }

      if (formData.package_photos_count < 1) {
        throw new Error('Liczba zdjęć w pakiecie musi być większa od 0')
      }

      // Generate unique access code
      let accessCode = generateAccessCode()
      let isUnique = false
      let attempts = 0

      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from('galleries')
          .select('id')
          .eq('access_code', accessCode)
          .single()

        if (!existing) {
          isUnique = true
        } else {
          accessCode = generateAccessCode()
          attempts++
        }
      }

      if (!isUnique) {
        throw new Error('Nie udało się wygenerować unikalnego kodu dostępu')
      }

      // Create gallery
      const { data: gallery, error } = await supabase
        .from('galleries')
        .insert({
          photographer_id: session.user.id,
          client_id: formData.client_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          access_code: accessCode,
          status: 'draft',
          package_photos_count: formData.package_photos_count,
          additional_photo_price: formData.additional_photo_price,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/galleries/${gallery.id}`)
    } catch (error: any) {
      setError(error.message || 'Błąd podczas tworzenia galerii')
    } finally {
      setIsLoading(false)
    }
  }

  // Set default expiration date (30 days from now)
  useEffect(() => {
    const defaultExpiry = new Date()
    defaultExpiry.setDate(defaultExpiry.getDate() + 30)
    setFormData(prev => ({
      ...prev,
      expires_at: defaultExpiry.toISOString().split('T')[0]
    }))
  }, [])

  if (loadingClients) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/galleries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nowa galeria</h1>
          <p className="text-sm text-gray-500">
            Stwórz nową galerię fotograficzną dla klienta
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
              {clients.length === 0 && (
                <p className="text-sm text-gray-500">
                  Brak klientów.{' '}
                  <Link href="/clients/new" className="text-primary hover:underline">
                    Dodaj pierwszego klienta
                  </Link>
                </p>
              )}
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
                disabled={isLoading || clients.length === 0}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Tworzenie...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>Stwórz galerię</span>
                  </div>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/galleries')}
                disabled={isLoading}
              >
                Anuluj
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-2">Co dalej?</h3>
          <p className="text-sm text-blue-700 mb-3">
            Po utworzeniu galerii będziesz mógł:
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Dodać zdjęcia do galerii</li>
            <li>• Udostępnić klientowi kod dostępu</li>
            <li>• Śledzić wybory klienta i zarządzać zamówieniami</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
