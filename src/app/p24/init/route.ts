import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

const P24_MERCHANT_ID = process.env.P24_MERCHANT_ID!
const P24_POS_ID = process.env.P24_POS_ID!
const P24_API_KEY = process.env.P24_API_KEY!
const P24_CRC_KEY = process.env.P24_CRC_KEY!
const P24_SANDBOX = process.env.P24_SANDBOX === 'true'

const P24_URL = P24_SANDBOX 
  ? 'https://sandbox.przelewy24.pl/api/v1'
  : 'https://secure.przelewy24.pl/api/v1'

interface PaymentRequest {
  gallery_id: string
  client_id: string
  selected_photos: string[]
  client_email: string
  client_name: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json()
    
    // Walidacja danych wejściowych
    if (!body.gallery_id || !body.client_id || !body.selected_photos?.length) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych danych' },
        { status: 400 }
      )
    }

    // Pobierz dane galerii i fotografa
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select(`
        *,
        photographers(name, email, business_name)
      `)
      .eq('id', body.gallery_id)
      .single()

    if (galleryError || !gallery) {
      return NextResponse.json(
        { error: 'Nie znaleziono galerii' },
        { status: 404 }
      )
    }

    // Pobierz wybrane zdjęcia
    const { data: selections, error: selectionsError } = await supabase
      .from('client_selections')
      .select('*, photos(filename)')
      .eq('gallery_id', body.gallery_id)
      .eq('client_id', body.client_id)
      .in('photo_id', body.selected_photos)

    if (selectionsError || !selections?.length) {
      return NextResponse.json(
        { error: 'Nie znaleziono wybranych zdjęć' },
        { status: 404 }
      )
    }

    // Oblicz kwoty
    const packageSelections = selections.filter(s => s.selected_for_package)
    const additionalSelections = selections.filter(s => s.is_additional_purchase)
    const additionalCost = additionalSelections.length * gallery.additional_photo_price
    
    // Całkowita kwota (w groszach dla P24)
    const totalAmount = Math.round(additionalCost * 100)
    
    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Brak dodatkowych zdjęć do płatności' },
        { status: 400 }
      )
    }

    // Stwórz zamówienie w bazie danych
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        gallery_id: body.gallery_id,
        client_id: body.client_id,
        photographer_id: gallery.photographer_id,
        total_amount: additionalCost,
        status: 'pending'
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Błąd podczas tworzenia zamówienia' },
        { status: 500 }
      )
    }

    // Przygotuj dane dla P24
    const sessionId = `ORDER_${order.id}_${Date.now()}`
    const urlReturn = `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id=${sessionId}`
    const urlStatus = `${process.env.NEXT_PUBLIC_APP_URL}/api/p24/webhook`

    // Opis zamówienia
    const description = `Galeria: ${gallery.title} - ${additionalSelections.length} dodatkowych zdjęć`

    // Dane do wysłania do P24
    const p24Data = {
      merchantId: parseInt(P24_MERCHANT_ID),
      posId: parseInt(P24_POS_ID),
      sessionId: sessionId,
      amount: totalAmount,
      currency: 'PLN',
      description: description,
      email: body.client_email,
      client: body.client_name,
      country: 'PL',
      language: 'pl',
      urlReturn: urlReturn,
      urlStatus: urlStatus,
      timeLimit: 15, // 15 minut na płatność
      channel: 0, // Wszystkie metody płatności
      waitForResult: false,
      regulationAccept: true,
      shipping: 0, // Brak kosztów dostawy - produkty cyfrowe
      transferLabel: `Zamówienie ${order.id}`
    }

    // Generuj CRC dla bezpieczeństwa
    const crcString = JSON.stringify(p24Data) + P24_CRC_KEY
    const crc = crypto.createHash('md5').update(crcString).digest('hex')

    // Wyślij request do P24
    const response = await fetch(`${P24_URL}/transaction/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString('base64')}`
      },
      body: JSON.stringify({
        ...p24Data,
        sign: crc
      })
    })

    const p24Response = await response.json()

    if (!response.ok || !p24Response.data?.token) {
      console.error('P24 Error:', p24Response)
      return NextResponse.json(
        { error: 'Błąd podczas inicjalizacji płatności' },
        { status: 500 }
      )
    }

    // Zapisz token płatności w zamówieniu
    await supabase
      .from('orders')
      .update({
        p24_session_id: sessionId,
        p24_token: p24Response.data.token
      })
      .eq('id', order.id)

    // Zwróć URL do przekierowania
    const paymentUrl = P24_SANDBOX
      ? `https://sandbox.przelewy24.pl/trnRequest/${p24Response.data.token}`
      : `https://secure.przelewy24.pl/trnRequest/${p24Response.data.token}`

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      session_id: sessionId,
      order_id: order.id,
      amount: additionalCost,
      additional_photos: additionalSelections.length
    })

  } catch (error) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera podczas inicjalizacji płatności' },
      { status: 500 }
    )
  }
}
