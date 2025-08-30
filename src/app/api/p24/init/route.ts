import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

// P24 Configuration
const P24_CONFIG = {
  merchantId: parseInt(process.env.P24_MERCHANT_ID!),
  posId: parseInt(process.env.P24_POS_ID!),
  apiKey: process.env.P24_API_KEY!,
  crcKey: process.env.P24_CRC_KEY!,
  sandbox: process.env.P24_SANDBOX === 'true',
  baseUrl: process.env.P24_SANDBOX === 'true' 
    ? 'https://sandbox.przelewy24.pl' 
    : 'https://secure.przelewy24.pl'
}

function calculateP24Sign(params: Record<string, any>): string {
  const jsonString = JSON.stringify(params, null, 0)
  return createHash('sha384').update(jsonString, 'utf8').digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== P24 Init API Start ===')
    
    const body = await request.json()
    const { gallery_id } = body
    
    if (!gallery_id) {
      return NextResponse.json(
        { error: 'Gallery ID is required' },
        { status: 400 }
      )
    }
    
    // Load gallery data with photographer_id included
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select(`
        id,
        title,
        package_photos_count,
        additional_photo_price,
        client_id,
        photographer_id,
        clients!inner(
          id,
          name,
          email
        )
      `)
      .eq('id', gallery_id)
      .single()
    
    if (galleryError || !gallery) {
      console.error('Gallery error:', galleryError)
      return NextResponse.json(
        { error: 'Gallery not found' },
        { status: 404 }
      )
    }
    
    // Transform nested client data
    const clientData = Array.isArray(gallery.clients) 
      ? gallery.clients[0] 
      : gallery.clients
    
    if (!clientData) {
      return NextResponse.json(
        { error: 'No client found for gallery' },
        { status: 400 }
      )
    }
    
    // Load client selections
    const { data: selections, error: selectionsError } = await supabase
      .from('client_selections')
      .select('photo_id, selected_for_package, is_additional_purchase')
      .eq('gallery_id', gallery_id)
      .eq('client_id', gallery.client_id)
    
    if (selectionsError) {
      console.error('Selections error:', selectionsError)
      return NextResponse.json(
        { error: 'Failed to load selections' },
        { status: 500 }
      )
    }
    
    // Calculate amount
    const additionalSelections = (selections || []).filter(s => s.is_additional_purchase).length
    const totalAmount = additionalSelections * (gallery.additional_photo_price * 100) // Convert to grosze
    
    if (totalAmount === 0) {
      return NextResponse.json(
        { error: 'No chargeable items selected' },
        { status: 400 }
      )
    }
    
    // Generate unique session ID
    const sessionId = `gallery_${gallery_id}_${Date.now()}`
    
    // Prepare P24 transaction data
    const transactionData = {
      merchantId: P24_CONFIG.merchantId,
      posId: P24_CONFIG.posId,
      sessionId: sessionId,
      amount: totalAmount,
      currency: 'PLN',
      description: `Zdjęcia z galerii: ${gallery.title}`,
      email: clientData.email,
      client: clientData.name,
      country: 'PL',
      language: 'pl',
      urlReturn: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foto-platform.vercel.app'}/gallery/${gallery_id}/success`,
      urlStatus: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foto-platform.vercel.app'}/api/p24/callback`,
      timeLimit: 30,
      channel: 16,
      waitForResult: false,
      regulationAccept: false
    }
    
    // Calculate sign
    const signData = {
      sessionId: transactionData.sessionId,
      merchantId: transactionData.merchantId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      crc: P24_CONFIG.crcKey
    }
    
    const sign = calculateP24Sign(signData)
    const payload = { ...transactionData, sign }
    
    // Create Basic Auth credentials
    const credentials = Buffer.from(`${P24_CONFIG.posId}:${P24_CONFIG.apiKey}`).toString('base64')
    
    // Register transaction with P24
    const p24Url = `${P24_CONFIG.baseUrl}/api/v1/transaction/register`
    console.log('Calling P24 API:', p24Url)
    
    const response = await fetch(p24Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await response.text()
    console.log('P24 response:', response.status, responseText)
    
    if (!response.ok) {
      throw new Error(`P24 API error: ${response.status} - ${responseText}`)
    }
    
    const p24Response = JSON.parse(responseText)
    
    if (!p24Response.data?.token) {
      throw new Error('No token received from P24')
    }
    
    // Store order in database - now photographer_id is available
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        gallery_id: gallery_id,
        client_id: gallery.client_id,
        photographer_id: gallery.photographer_id,
        total_amount: totalAmount / 100,
        status: 'pending',
        p24_session_id: sessionId
      })
    
    if (orderError) {
      console.error('Order creation error:', orderError)
    }
    
    const paymentUrl = `${P24_CONFIG.baseUrl}/trnRequest/${p24Response.data.token}`
    
    console.log('=== P24 Init API Success ===')
    console.log('Payment URL:', paymentUrl)
    
    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      sessionId,
      amount: totalAmount,
      token: p24Response.data.token
    })
    
  } catch (error) {
    console.error('P24 Init API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
