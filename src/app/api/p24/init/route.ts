import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { P24, Order, Currency, Country, Language, Encoding } from '@ingameltd/node-przelewy24'

const merchantId = parseInt(process.env.P24_MERCHANT_ID!)
const posId = process.env.P24_POS_ID!
const apiKey = process.env.P24_API_KEY!
const crcKey = process.env.P24_CRC_KEY!
const sandbox = process.env.P24_SANDBOX === 'true'

// Initialize P24 with credentials
const p24 = new P24(merchantId, posId, apiKey, crcKey, { sandbox })

interface PaymentRequest {
  gallery_id: string
  client_id: string
  selected_photos: string[]
  client_email: string
  client_name: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== P24 API INIT ===')
    
    const body: PaymentRequest = await request.json()
    console.log('Request body:', body)
    
    // Walidacja danych wejściowych
    if (!body.gallery_id || !body.client_id || !body.selected_photos?.length) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych danych' },
        { status: 400 }
      )
    }

    // Pobierz dane galerii
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select(`
        *,
        photographers(name, email, business_name)
      `)
      .eq('id', body.gallery_id)
      .single()

    if (galleryError || !gallery) {
      console.error('Gallery error:', galleryError)
      return NextResponse.json(
        { error: 'Nie znaleziono galerii' },
        { status: 404 }
      )
    }

    console.log('Gallery found:', gallery.title)

    // Pobierz wybrane zdjęcia
    const { data: selections, error: selectionsError } = await supabase
      .from('client_selections')
      .select('*, photos(filename)')
      .eq('gallery_id', body.gallery_id)
      .eq('client_id', body.client_id)
      .in('photo_id', body.selected_photos)

    console.log('Selections query result:', { selections, selectionsError })

    if (selectionsError) {
      console.error('Selections error:', selectionsError)
      return NextResponse.json(
        { error: 'Błąd podczas pobierania wybranych zdjęć' },
        { status: 500 }
      )
    }

    if (!selections?.length) {
      console.error('No selections found for:', {
        gallery_id: body.gallery_id,
        client_id: body.client_id,
        photo_ids: body.selected_photos
      })
      return NextResponse.json(
        { error: 'Nie znaleziono wybranych zdjęć' },
        { status: 404 }
      )
    }

    // Oblicz kwoty
    const packageSelections = selections.filter(s => s.selected_for_package)
    const additionalSelections = selections.filter(s => s.is_additional_purchase)
    const additionalCost = additionalSelections.length * gallery.additional_photo_price
    
    console.log('Payment calculation:', {
      packageSelections: packageSelections.length,
      additionalSelections: additionalSelections.length,
      additionalCost,
      pricePerPhoto: gallery.additional_photo_price
    })
    
    if (additionalCost <= 0) {
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
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Błąd podczas tworzenia zamówienia' },
        { status: 500 }
      )
    }

    console.log('Order created:', order.id)

    // Przygotuj zamówienie P24
    const sessionId = `ORDER_${order.id}_${Date.now()}`
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id=${sessionId}`
    const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/p24/webhook`
    const description = `Galeria: ${gallery.title} - ${additionalSelections.length} dodatkowych zdjęć`

    const p24Order: Order = {
      sessionId,
      amount: Math.round(additionalCost * 100), // P24 expects amount in grosze
      currency: Currency.PLN,
      description,
      email: body.client_email,
      country: Country.Poland,
      language: Language.PL,
      urlReturn: returnUrl,
      urlStatus: statusUrl,
      timeLimit: 15,
      encoding: Encoding.UTF8,
      channel: "0" // All payment methods
    }

    console.log('Creating P24 transaction:', p24Order)

    // Utwórz transakcję P24
    const transactionResult = await p24.createTransaction(p24Order)
    console.log('P24 transaction result:', transactionResult)

    if (!transactionResult.link) {
      return NextResponse.json(
        { error: 'Błąd podczas tworzenia transakcji P24' },
        { status: 500 }
      )
    }

    // Zapisz dane transakcji
    await supabase
      .from('orders')
      .update({
        p24_session_id: sessionId,
        p24_token: transactionResult.token || null
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      payment_url: transactionResult.link,
      session_id: sessionId,
      order_id: order.id,
      amount: additionalCost,
      additional_photos: additionalSelections.length
    })

  } catch (error: any) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera podczas inicjalizacji płatności', details: error.message },
      { status: 500 }
    )
  }
}
