import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

// P24 Configuration
const P24_CONFIG = {
  merchantId: parseInt(process.env.P24_MERCHANT_ID!),
  posId: parseInt(process.env.P24_POS_ID!),
  crcKey: process.env.P24_CRC_KEY!,
  sandbox: process.env.P24_SANDBOX === 'true',
  baseUrl: process.env.P24_SANDBOX === 'true' 
    ? 'https://sandbox.przelewy24.pl/api/v1' 
    : 'https://secure.przelewy24.pl/api/v1'
}

// P24 API Functions
function calculateP24Sign(params: Record<string, any>): string {
  const jsonString = JSON.stringify(params, null, 0)
    .replace(/\//g, '/')
    .replace(/\u00a0/g, ' ')
  
  return createHash('sha384').update(jsonString, 'utf8').digest('hex')
}

async function registerP24Transaction(transactionData: any) {
  const signData = {
    sessionId: transactionData.sessionId,
    merchantId: transactionData.merchantId,
    amount: transactionData.amount,
    currency: transactionData.currency,
    crc: P24_CONFIG.crcKey
  }
  
  const sign = calculateP24Sign(signData)
  
  const payload = {
    ...transactionData,
    sign
  }
  
  const credentials = Buffer.from(`${P24_CONFIG.posId}:${P24_CONFIG.crcKey}`).toString('base64')
  
  const response = await fetch(`${P24_CONFIG.baseUrl}/transaction/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`P24 API error: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

interface PaymentRequest {
  gallery_id: string
}

interface GalleryData {
  id: string
  title: string
  package_photos_count: number
  additional_photo_price: number
  clients: {
    name: string
    email: string
  } | null
}

interface SelectionData {
  photo_id: string
  selected_for_package: boolean
  is_additional_purchase: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== P24 Init API Start ===')
    
    // Environment variables check
    const requiredVars = ['P24_MERCHANT_ID', 'P24_POS_ID', 'P24_CRC_KEY']
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        console.error(`Missing environment variable: ${varName}`)
        return NextResponse.json(
          { error: `Missing ${varName}` },
          { status: 500 }
        )
      }
    }
    
    const body: PaymentRequest = await request.json()
    const { gallery_id } = body
    
    if (!gallery_id) {
      return NextResponse.json(
        { error: 'Gallery ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Loading gallery:', gallery_id)
    
    // Load gallery data
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select(`
        id,
        title,
        package_photos_count,
        additional_photo_price,
        clients!inner(name, email)
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
    
    const galleryData = gallery as unknown as GalleryData
    console.log('Gallery loaded:', galleryData.title)
    
    if (!galleryData.clients) {
      console.error('No client associated with gallery')
      return NextResponse.json(
        { error: 'No client found for gallery' },
        { status: 400 }
      )
    }
    
    console.log('Loading selections for gallery...')
    
    // Load client selections
    const { data: selections, error: selectionsError } = await supabase
      .from('client_selections')
      .select('photo_id, selected_for_package, is_additional_purchase')
      .eq('gallery_id', gallery_id)
    
    if (selectionsError) {
      console.error('Selections error:', selectionsError)
      return NextResponse.json(
        { error: 'Failed to load selections' },
        { status: 500 }
      )
    }
    
    const selectionsData = (selections || []) as SelectionData[]
    console.log(`Found ${selectionsData.length} selections`)
    
    // Calculate amount
    const packageSelections = selectionsData.filter(s => s.selected_for_package).length
    const additionalSelections = selectionsData.filter(s => s.is_additional_purchase).length
    
    // Package is free, only additional photos cost money
    const packageAmount = 0 // Free package
    const additionalAmount = additionalSelections * (galleryData.additional_photo_price * 100) // Convert to grosze
    const totalAmount = packageAmount + additionalAmount
    
    console.log('Amount calculation:', {
      packageSelections,
      additionalSelections,
      additionalPhotoPrice: galleryData.additional_photo_price,
      totalAmount
    })
    
    if (totalAmount === 0) {
      return NextResponse.json(
        { error: 'No chargeable items selected' },
        { status: 400 }
      )
    }
    
    // Generate unique session ID
    const sessionId = `gallery_${gallery_id}_${Date.now()}`
    
    console.log('Creating P24 transaction...')
    
    // Prepare P24 transaction data
    const transactionData = {
      merchantId: P24_CONFIG.merchantId,
      posId: P24_CONFIG.posId,
      sessionId: sessionId,
      amount: totalAmount,
      currency: 'PLN',
      description: `Zdjęcia z galerii: ${galleryData.title}`,
      email: galleryData.clients.email,
      client: galleryData.clients.name,
      country: 'PL',
      language: 'pl',
      urlReturn: `${process.env.NEXT_PUBLIC_APP_URL}/gallery/${gallery_id}?payment=success`,
      urlStatus: `${process.env.NEXT_PUBLIC_APP_URL}/api/p24/callback`,
      timeLimit: 30, // 30 minutes
      channel: 16, // All 24/7 methods
      waitForResult: false,
      regulationAccept: false
    }
    
    const p24Response = await registerP24Transaction(transactionData)
    
    if (!p24Response.data?.token) {
      console.error('P24 response error:', p24Response)
      return NextResponse.json(
        { error: 'Failed to create P24 transaction' },
        { status: 500 }
      )
    }
    
    console.log('P24 transaction created successfully')
    
    // Store transaction in database
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        gallery_id: gallery_id,
        client_id: galleryData.clients.email, // Using email as client reference
        photographer_id: gallery_id, // This should be extracted from gallery
        total_amount: totalAmount / 100, // Convert back to PLN
        status: 'pending',
        p24_session_id: sessionId
      })
    
    if (orderError) {
      console.error('Order creation error:', orderError)
      // Continue anyway, P24 transaction is created
    }
    
    const paymentUrl = `https://secure.przelewy24.pl/trnRequest/${p24Response.data.token}`
    
    console.log('=== P24 Init API Success ===')
    
    return NextResponse.json({
      success: true,
      paymentUrl,
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
