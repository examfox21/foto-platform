'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Save,
  Mail,
  Phone,
  Globe,
  Building,
  Bell,
  Shield,
  CreditCard,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface PhotographerProfile {
  id: string
  email: string
  name: string
  business_name: string | null
  phone: string | null
  website: string | null
  subscription_status: string
  created_at: string
}

interface UserStats {
  totalClients: number
  totalGalleries: number
  totalPhotos: number
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<PhotographerProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    website: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Load photographer profile
        const { data: profileData, error: profileError } = await supabase
          .from('photographers')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        setProfile(profileData)

        // Set form data
        setFormData({
          name: profileData.name || '',
          business_name: profileData.business_name || '',
          phone: profileData.phone || '',
          website: profileData.website || ''
        })

        // Load stats
        const [clientsResult, galleriesResult, photosResult] = await Promise.all([
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('photographer_id', session.user.id),
          
          supabase
            .from('galleries')
            .select('*', { count: 'exact', head: true })
            .eq('photographer_id', session.user.id),
            
          supabase
            .from('photos')
            .select('gallery_id, galleries!inner(photographer_id)', { count: 'exact', head: true })
            .eq('galleries.photographer_id', session.user.id)
        ])

        setStats({
          totalClients: clientsResult.count || 0,
          totalGalleries: galleriesResult.count || 0,
          totalPhotos: photosResult.count || 0
        })

      } catch (error) {
        console.error('Error loading profile:', error)
        setError('Błąd podczas ładowania profilu')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

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
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Nie jesteś zalogowany')
      }

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Imię i nazwisko są wymagane')
      }

      // Update profile
      const { error } = await supabase
        .from('photographers')
        .update({
          name: formData.name.trim(),
          business_name: formData.business_name.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null
        })
        .eq('id', session.user.id)

      if (error) throw error

      setSuccess('Profil został zaktualizowany')
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          name: formData.name.trim(),
          business_name: formData.business_name.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null
        })
      }

    } catch (error: any) {
      setError(error.message || 'Błąd podczas zapisywania profilu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmText = 'USUŃ KONTO'
    const userInput = prompt(
      `Czy na pewno chcesz usunąć swoje konto? Wszystkie dane zostaną permanentnie usunięte.\n\nWpisz "${confirmText}" aby potwierdzić:`
    )

    if (userInput !== confirmText) {
      return
    }

    try {
      setIsLoading(true)
      
      // Note: In production, you'd want to handle this more carefully
      // possibly with a background job to clean up all related data
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      router.push('/')
    } catch (error: any) {
      setError(error.message || 'Błąd podczas usuwania konta')
      setIsLoading(false)
    }
  }

  const getSubscriptionStatus = (status: string) => {
    switch (status) {
      case 'trial':
        return { text: 'Okres próbny', color: 'text-blue-600 bg-blue-100' }
      case 'active':
        return { text: 'Aktywna', color: 'text-green-600 bg-green-100' }
      case 'cancelled':
        return { text: 'Anulowana', color: 'text-red-600 bg-red-100' }
      default:
        return { text: status, color: 'text-gray-600 bg-gray-100' }
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!profile || !stats) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Błąd ładowania ustawień</h1>
        <Button onClick={() => router.push('/dashboard')}>
          Powrót do dashboard
        </Button>
      </div>
    )
  }

  const subscriptionInfo = getSubscriptionStatus(profile.subscription_status)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ustawienia konta</h1>
        <p className="mt-1 text-sm text-gray-500">
          Zarządzaj swoim profilem fotografa i ustawieniami konta
        </p>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <User className="mx-auto h-8 w-8 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{stats.totalClients}</p>
            <p className="text-sm text-gray-600">Klientów</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Globe className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.totalGalleries}</p>
            <p className="text-sm text-gray-600">Galerii</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{stats.totalPhotos}</p>
            <p className="text-sm text-gray-600">Zdjęć</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto h-8 w-8 text-orange-600 mb-2" />
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${subscriptionInfo.color}`}>
              {subscriptionInfo.text}
            </div>
            <p className="text-sm text-gray-600 mt-1">Subskrypcja</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profil fotografa</CardTitle>
          <CardDescription>
            Twoje podstawowe informacje widoczne dla klientów
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label htmlFor="business_name" className="text-sm font-medium text-gray-700">
                  Nazwa firmy
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="business_name"
                    name="business_name"
                    type="text"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="Studio Fotograficzne"
                    className="pl-10"
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

              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium text-gray-700">
                  Strona internetowa
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://mojastronafoto.pl"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={profile.email}
                  className="pl-10 bg-gray-50"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500">
                Email nie może być zmieniony. Skontaktuj się z obsługą jeśli potrzebujesz zmiany.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto"
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
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje o koncie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Data rejestracji</span>
            <span className="text-sm text-gray-900">{formatDate(profile.created_at)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Status subskrypcji</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscriptionInfo.color}`}>
              {subscriptionInfo.text}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">ID konta</span>
            <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {profile.id.slice(0, 8)}...
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Strefa niebezpieczna</CardTitle>
          <CardDescription className="text-red-700">
            Operacje nieodwracalne które permanentnie usuwają dane
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-900">Usuń konto</h3>
              <p className="text-sm text-red-700">
                Permanentnie usuń swoje konto i wszystkie dane. Ta operacja jest nieodwracalna.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń konto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
