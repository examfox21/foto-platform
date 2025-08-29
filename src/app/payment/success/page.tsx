'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Download, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface OrderDetails {
  id: string
  total_amount: number
  status: string
  created_at: string
  galleries: {
    title: string
    photographers: {
      name: string
      business_name: string | null
    }
  }
}

export default function PaymentSuccessPage() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!sessionId) {
        setError('Brak identyfikatora płatności')
        setLoading(false)
        return
      }

      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            galleries(
              title,
              photographers(name, business_name)
            )
          `)
          .eq('p24_session_id', sessionId)
          .single()

        if (orderError || !order) {
          setError('Nie znaleziono zamówienia')
          return
        }

        setOrderDetails(order)
      } catch (error) {
        console.error('Error loading order:', error)
        setError('Błąd podczas ładowania szczegółów zamówienia')
      } finally {
        setLoading(false)
      }
    }

    loadOrderDetails()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Sprawdzam status płatności...</p>
        </div>
      </div>
    )
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Problem z płatnością
            </h1>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Wróć
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = orderDetails.status === 'paid'
  const isPending = orderDetails.status === 'pending'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPaid ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            <CheckCircle className={`h-8 w-8 ${
              isPaid ? 'text-green-600' : 'text-yellow-600'
            }`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Płatność zakończona!' : 'Płatność w trakcie weryfikacji'}
          </h1>
          <p className="text-gray-600">
            {isPaid 
              ? 'Dziękujemy za zakup. Twoje zdjęcia są już dostępne do pobrania.'
              : 'Płatność jest weryfikowana. Otrzymasz email gdy będzie gotowa.'
            }
          </p>
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Szczegóły zamówienia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Numer zamówienia:</span>
              <span className="font-mono text-sm">#{orderDetails.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Galeria:</span>
              <span>{orderDetails.galleries.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fotograf:</span>
              <span>
                {orderDetails.galleries.photographers.business_name || 
                 orderDetails.galleries.photographers.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kwota:</span>
              <span className="font-bold">{orderDetails.total_amount.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isPaid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isPaid ? 'Opłacone' : 'W trakcie weryfikacji'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data:</span>
              <span>{new Date(orderDetails.created_at).toLocaleString('pl-PL')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Następne kroki</CardTitle>
          </CardHeader>
          <CardContent>
            {isPaid ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Sprawdź email</h4>
                    <p className="text-sm text-gray-600">
                      Link do pobrania zdjęć w wysokiej jakości został wysłany na Twój adres email.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Download className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Pobierz zdjęcia</h4>
                    <p className="text-sm text-gray-600">
                      Kliknij w link w emailu aby pobrać swoje zdjęcia. Link będzie aktywny przez 30 dni.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Weryfikacja w toku</h4>
                    <p className="text-sm text-gray-600">
                      Twoja płatność jest obecnie weryfikowana przez system Przelewy24.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Otrzymasz email</h4>
                    <p className="text-sm text-gray-600">
                      Gdy płatność zostanie potwierdzona, automatycznie otrzymasz email z linkami do pobrania.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="text-center space-y-4">
          {isPaid && (
            <Button size="lg" className="w-full sm:w-auto">
              <Mail className="h-4 w-4 mr-2" />
              Sprawdź email
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          <div>
            <Button 
              variant="outline" 
              onClick={() => window.close()}
              className="w-full sm:w-auto"
            >
              Zamknij
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Masz pytania? Skontaktuj się z fotografem:{' '}
            {orderDetails.galleries.photographers.name}
          </p>
        </div>
      </div>
    </div>
  )
}
