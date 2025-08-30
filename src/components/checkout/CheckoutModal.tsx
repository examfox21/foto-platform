'use client'

import { useState } from 'react'
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  gallery: {
    id: string
    title: string
    client_id: string
    photographers: {
      name: string
      business_name: string | null
    }
  }
  selections: {
    packageSelections: number
    additionalSelections: number
    totalCost: number
    selectedPhotos: string[]
  }
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  gallery, 
  selections 
}: CheckoutModalProps) {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  if (!isOpen) return null

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!clientName.trim()) {
      newErrors.name = 'Imię i nazwisko jest wymagane'
    }
    
    if (!clientEmail.trim()) {
      newErrors.email = 'Adres email jest wymagany'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      newErrors.email = 'Nieprawidłowy format email'
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Numer telefonu jest wymagany'
    } else if (!/^(\+48)?[\s-]?[0-9]{9}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Nieprawidłowy numer telefonu'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePayment = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    
    const paymentData = {
      gallery_id: gallery.id,
      client_id: gallery.client_id,
      selected_photos: selections.selectedPhotos,
      client_email: clientEmail,
      client_name: clientName
    }
    
    console.log('=== PAYMENT DEBUG ===')
    console.log('Gallery ID:', gallery.id)
    console.log('Client ID:', gallery.client_id)
    console.log('Selected photos:', selections.selectedPhotos)
    console.log('Total cost:', selections.totalCost)
    console.log('Payment data being sent:', paymentData)
    
    try {
      console.log('Making API call to /api/p24/init...')
      console.log('Current URL:', window.location.origin)
console.log('API endpoint:', '/api/p24/init')
console.log('Full URL:', window.location.origin + '/api/p24/init')
      const response = await fetch('/api/p24/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response body:', errorText)
        alert(`Błąd API: ${response.status} - ${response.statusText}`)
        return
      }

      const data = await response.json()
      console.log('Response data:', data)

      if (data.success && data.payment_url) {
        console.log('Payment initialization successful, redirecting to:', data.payment_url)
        window.location.href = data.payment_url
      } else {
        console.error('API returned success: false:', data)
        alert(`Błąd: ${data.error}`)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Wystąpił błąd podczas inicjalizacji płatności')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Finalizacja zamówienia</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Podsumowanie zamówienia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Galeria:</span>
                <span className="font-medium">{gallery.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fotograf:</span>
                <span>{gallery.photographers.business_name || gallery.photographers.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Zdjęcia w pakiecie:</span>
                <span>{selections.packageSelections} (gratis)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Dodatkowe zdjęcia:</span>
                <span>{selections.additionalSelections}</span>
              </div>
              <div className="border-t pt-2 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Do zapłaty:</span>
                  <span>{selections.totalCost.toFixed(2)} zł</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Details Form */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold">Dane kontaktowe</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imię i nazwisko *
              </label>
              <Input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jan Kowalski"
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres email *
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="jan@example.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Link do pobrania zdjęć zostanie wysłany na ten email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numer telefonu *
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+48 123 456 789"
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3 flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
              Bezpieczna płatność przez Przelewy24
            </h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                Karta
              </div>
              <div className="flex items-center">
                <Smartphone className="h-4 w-4 mr-1" />
                BLIK
              </div>
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                Przelew
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="text-xs text-gray-500 mb-6">
            Klikając "Przejdź do płatności" akceptujesz regulamin serwisu oraz 
            politykę prywatności. Po zweryfikowaniu płatności otrzymasz email 
            z linkami do pobrania wysokiej jakości zdjęć.
          </div>

          {/* Payment Button */}
          <Button 
            onClick={handlePayment}
            disabled={isLoading || selections.totalCost <= 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Inicjalizacja płatności...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Przejdź do płatności ({selections.totalCost.toFixed(2)} zł)
              </>
            )}
          </Button>

          {selections.totalCost <= 0 && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Wszystkie zdjęcia są w pakiecie - brak dodatkowych opłat
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
