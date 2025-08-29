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
