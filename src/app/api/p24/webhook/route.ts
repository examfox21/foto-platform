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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('P24 Webhook received:', body)

    // Walidacja podpisu P24
    const expectedCrc = crypto
      .createHash('md5')
      .update(JSON.stringify(body) + P24_CRC_KEY)
      .digest('hex')

    if (body.sign !== expectedCrc) {
      console.error('Invalid P24 signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Znajdź zamówienie po session_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('p24_session_id', body.sessionId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', body.sessionId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Weryfikuj płatność w P24
    const verifyData = {
      merchantId: parseInt(P24_MERCHANT_ID),
      posId: parseInt(P24_POS_ID),
      sessionId: body.sessionId,
      amount: body.amount,
      currency: body.currency,
      orderId: body.orderId
    }

    const verifyCrc = crypto
      .createHash('md5')
      .update(JSON.stringify(verifyData) + P24_CRC_KEY)
      .digest('hex')

    const verifyResponse = await fetch(`${P24_URL}/transaction/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString('base64')}`
      },
      body: JSON.stringify({
        ...verifyData,
        sign: verifyCrc
      })
    })

    const verifyResult = await verifyResponse.json()

    if (verifyResponse.ok && verifyResult.data?.status === 'success') {
      // Płatność potwierdzona - zaktualizuj zamówienie
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          p24_order_id: body.orderId,
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id)

      console.log(`Payment confirmed for order ${order.id}`)

      // TODO: Wyślij email z linkami do pobrania
      // TODO: Powiadom fotografa o sprzedaży
      
      return NextResponse.json({ status: 'success' })
    } else {
      // Błąd weryfikacji
      console.error('Payment verification failed:', verifyResult)
      
      await supabase
        .from('orders')
        .update({
          status: 'failed'
        })
        .eq('id', order.id)

      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
