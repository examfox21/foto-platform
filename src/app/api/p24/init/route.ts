import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase'
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
    // Użyj service role client
  const supabase = createServiceSupabase()
  try {
    console.log('=== P24 Init API Start ===')
    console.log('Environment check:', {
      merchantId: P24_CONFIG.merchantId,
      posId: P24_CONFIG.posId,
      apiKeySet: !!P24_CONFIG.apiKey,
      crcKeySet: !!P24_CONFIG.crcKey,
      sandbox: P24_CONFIG.sandbox,
      baseUrl: P24_CONFIG.baseUrl
    })
    
    const body = await request.json()
    console.log('Request body:', body)
    
    const { gallery_id } = body
    
    if (!gallery_id) {
      console.log('No gallery_id provided')
      return NextResponse.json(
        { error: 'Gallery ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Loading gallery:', gallery_id)
    
    // Load gallery data without clients join
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select(`
        id,
        title,
        package_photos_count,
        additional_photo_price,
        client_id,
        photographer_id
      `)
      .eq('id', gallery_id)
      .single()
    
    console.log('Gallery query result:', {
      success: !galleryError,
      error: galleryError?.message,
      gallery: gallery
    })
    
    if (galleryError || !gallery) {
      console.error('Gallery error:', galleryError)
      return NextResponse.json(
        { error: 'Gallery not found' },
        { status: 404 }
      )
    }
    
    // Pobierz klienta osobno z maybeSingle
    console.log('Looking for client with ID:', gallery.client_id)
    
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', gallery.client_id)
      .maybeSingle()
    
    console.log('Client query raw result:', clientData)
    console.log('Client query error:', clientError)
    
    if (!clientData) {
      // Debug - sprawdź czy są jakiekolwiek klienci
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name')
        .limit(5)
      
      console.log('Sample clients in database:', allClients)
      console.log('No client found for ID:', gallery.client_id)
      
      return NextResponse.json(
        { error: 'No client found for gallery' },
        { status: 400 }
      )
    }
    
    console.log('Client found:', {
      id: clientData.id,
      name: clientData.name,
      email: clientData.email
    })
    
    console.log('Loading selections for gallery_id:', gallery_id, 'and client_id:', gallery.client_id)
    
    // Load client selections
    const { data: selections, error: selectionsError } = await supabase
      .from('client_selections')
      .select('photo_id, selected_for_package, is_additional_purchase')
      .eq('gallery_id', gallery_id)
      .eq('client_id', gallery.client_id)
    
    console.log('Selections query result:', {
      success: !selectionsError,
      error: selectionsError?.message,
      count: selections?.length || 0,
      selections: selections
    })
    
    if (selectionsError) {
      console.error('Selections error:', selectionsError)
      return NextResponse.json(
        { error: 'Failed to load selections' },
        { status: 500 }
      )
    }
    
    // Calculate amount
    const packageSelections = (selections || []).filter(s => s.selected_for_package)
    const additionalSelections = (selections || []).filter(s => s.is_additional_purchase)
    
    console.log('Selection breakdown:', {
      total: selections?.length || 0,
      package: packageSelections.length,
      additional: additionalSelections.length,
      packageSelections: packageSelections,
      additionalSelections: additionalSelections
    })
    
    const pricePerPhoto = Number(gallery.additional_photo_price) || 0
    const totalAmountPLN = additionalSelections.length * pricePerPhoto
    const totalAmount = Math.round(totalAmountPLN * 100) // Convert to grosze
    
    console.log('Price calculation:', {
      additional_photo_price_from_db: gallery.additional_photo_price,
      pricePerPhoto: pricePerPhoto,
      additionalSelectionsCount: additionalSelections.length,
      totalAmountPLN: totalAmountPLN,
      totalAmountGrosze: totalAmount
    })
    
    if (totalAmount === 0) {
      console.log('No chargeable items - total amount is 0')
      console.log('Debug: All selections are in package, no additional purchases')
      return NextResponse.json(
        { error: 'No chargeable items selected. All photos are included in the package.' },
        { status: 400 }
      )
    }
    
    // Generate unique session ID
    const sessionId = `gallery_${gallery_id}_${Date.now()}`
    console.log('Generated session ID:', sessionId)
    
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
    
    console.log('Transaction data prepared:', {
      sessionId: transactionData.sessionId,
      amount: transactionData.amount,
      email: transactionData.email,
      client: transactionData.client,
      description: transactionData.description
    })
    
    // Calculate sign
    const signData = {
      sessionId: transactionData.sessionId,
      merchantId: transactionData.merchantId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      crc: P24_CONFIG.crcKey
    }
    
    console.log('Sign data (without CRC):', {
      sessionId: signData.sessionId,
      merchantId: signData.merchantId,
      amount: signData.amount,
      currency: signData.currency
    })
    
    const sign = calculateP24Sign(signData)
    const payload = { ...transactionData, sign }
    
    console.log('Sign calculated:', sign.substring(0, 10) + '...')
    
    // Create Basic Auth credentials
    const credentials = Buffer.from('345336:29d4a3974b579addd2f18f29f7b83432').toString('base64')
    console.log('Test credentials:', credentials)
    console.log('Auth credentials prepared')
    
    // Register transaction with P24
    const p24Url = `https://sandbox.przelewy24.pl/api/v1/testAccess`
    console.log('Calling P24 API:', p24Url)
    console.log('P24 Request payload (without sign):', {
      ...transactionData,
      sign: 'HIDDEN'
    })
    
    const response = await fetch(p24Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await response.text()
    console.log('P24 response status:', response.status)
    console.log('P24 response body:', responseText)
    
    if (!response.ok) {
      console.error('P24 API error - status:', response.status)
      console.error('P24 API error - body:', responseText)
      throw new Error(`P24 API error: ${response.status} - ${responseText}`)
    }
    
    let p24Response
    try {
      p24Response = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse P24 response:', e)
      throw new Error('Invalid response from P24')
    }
    
    if (!p24Response.data?.token) {
      console.error('No token in P24 response:', p24Response)
      throw new Error('No token received from P24')
    }
    
    console.log('P24 token received:', p24Response.data.token)
    
    // Store order in database
    const orderData = {
      gallery_id: gallery_id,
      client_id: gallery.client_id,
      photographer_id: gallery.photographer_id,
      total_amount: totalAmountPLN,
      status: 'pending',
      p24_session_id: sessionId
    }
    
    console.log('Creating order in database:', orderData)
    
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle()
    
    if (orderError) {
      console.error('Order creation error:', orderError)
      // Continue anyway - P24 transaction is created
    } else {
      console.log('Order created successfully:', orderResult?.id)
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
    console.error('=== P24 Init API Error ===')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
