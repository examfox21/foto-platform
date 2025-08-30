'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const params = useParams()
  const code = params.code as string

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Płatność zakończona sukcesem!</h1>
        <p className="text-gray-600 mb-6">
          Dziękujemy za zamówienie. Twoje zdjęcia są już dostępne do pobrania.
        </p>
        <Link 
          href={`/gallery/${code}`}
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
        >
          Wróć do galerii
        </Link>
      </div>
    </div>
  )
}
