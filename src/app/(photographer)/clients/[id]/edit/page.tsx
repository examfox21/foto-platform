'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  created_at: string
  _count?: {
    galleries: number
  }
}

export default function EditClientPage() {
  const [client, setClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const loadClient = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Load client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', params.id)
          .eq('photographer_id', session.user.id)
          .single()

        if (clientError) throw clientError

        // Get gallery count
        const { count } = await supabase
          .from('galleries')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientData.id)

        const clientWithCount = {
          ...clientData,
          _count: { galleries: count || 0 }
        }

        setClient(clientWithCount)

        // Set form data from client
        setFormData({
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone || ''
        })

      } catch (error) {
        console.error('Error loading client:', error)
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadClient()
    }
  }, [params.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
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
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error('Nazwa i email są wymagane')
      }

      // Check if client with this email already exists (excluding current client)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('photographer_id', session.user.id)
        .eq('email', formData.email.trim())
        .neq('id', params.id)
        .single()

      if (existingClient) {
        throw new Error('Klient z tym emailem już istnieje')
      }

      // Update client
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null
        })
        .eq('id', params.id)

      if (error) throw error

      router.push('/clients')
    } catch (error: any) {
      setError(error.message || 'Błąd podczas zapisywania klienta')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!client) return

    const confirmMessage = client._count?.galleries && client._count.galleries > 0
      ? `Czy na pewno chcesz usunąć klienta "${client.name}"? Ma on ${client._count.galleries} galerii, które również zostaną usunięte. Ta operacja jest nieodwracalna.`
      : `Czy na pewno chcesz usunąć klienta "${client.name}"? Ta operacja jest nieodwracalna.`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      router.push('/clients')
    } catch (error: any) {
      setError(error.message || 'Błąd podczas usuwania klienta')
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

  if (!client) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Klient nie znaleziony</h1>
        <Button asChild>
          <Link href="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do klientów
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
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edytuj klienta</h1>
          <p className="text-sm text-gray-500">
            {client.name} • {client._count?.galleries || 0} galerii
          </p>
        </div>
      </div>

      {/* Client Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">{client.name}</h3>
              <p className="text-sm text-blue-700">
                Klient od {formatDate(client.created_at)}
              </p>
              {client._count?.galleries && client._count.galleries > 0 && (
                <p className="text-sm text-blue-700">
                  {client._count.galleries} galerii utworzonych
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dane klienta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Imię i nazwisko *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jan@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+48 123 456 789"
                  className="pl-10"
                />
              </div>
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
                onClick={() => router.push('/clients')}
                disabled={isLoading}
              >
                Anuluj
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Szybkie akcje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/galleries/new?client=${client.id}`}>
              <User className="h-4 w-4 mr-2" />
              Stwórz nową galerię dla tego klienta
            </Link>
          </Button>
          
          {client._count?.galleries && client._count.galleries > 0 && (
            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
              Ten klient ma {client._count.galleries} galerii. Możesz je zobaczyć w sekcji galerii.
            </div>
          )}
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
              <h3 className="text-sm font-medium text-red-900">Usuń klienta</h3>
              <p className="text-sm text-red-700">
                Permanentnie usuń tego klienta
                {client._count?.galleries && client._count.galleries > 0 
                  ? ` i wszystkie jego ${client._count.galleries} galerii`
                  : ''
                }. Ta operacja jest nieodwracalna.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń klienta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
