'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function PaymentSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = params.code as string
  const status = searchParams.get('payment')

  if (status !== 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Płatność anulowana</h1>
            <p className="text-gray-600 mb-6">
              Transakcja została anulowana lub wystąpił błąd.
            </p>
            <Link 
              href={`/gallery/${code}`}
              className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
            >
              Wróć do galerii
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Płatność zakończona sukcesem!</h1>
          <p className="text-gray-600 mb-6">
            Dziękujemy za zamówienie. Twoje zdjęcia są już dostępne do pobrania.
          </p>
          <Link 
            href={`/gallery/${code}`}
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
          >
            Przejdź do galerii
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
