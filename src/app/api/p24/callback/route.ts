import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('P24 Callback received:', body)

    const {
      merchantId,
      posId,
      sessionId,
      amount,
      originAmount,
      currency,
      orderId,
      methodId,
      statement,
      sign
    } = body

    // Verify signature
    const signData = {
      merchantId,
      posId,
      sessionId,
      amount,
      originAmount,
      currency,
      orderId,
      methodId,
      statement,
      crc: P24_CONFIG.crcKey
    }

    const expectedSign = createHash('sha384')
      .update(JSON.stringify(signData), 'utf8')
      .digest('hex')

    if (sign !== expectedSign) {
      console.error('Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Find order by session_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('p24_session_id', sessionId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', sessionId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify transaction with P24
    const verifyData = {
      merchantId: P24_CONFIG.merchantId,
      posId: P24_CONFIG.posId,
      sessionId: sessionId,
      amount: amount,
      currency: currency,
      orderId: orderId
    }

    const verifySignData = {
      sessionId: sessionId,
      orderId: orderId,
      amount: amount,
      currency: currency,
      crc: P24_CONFIG.crcKey
    }

    const verifySign = createHash('sha384')
      .update(JSON.stringify(verifySignData), 'utf8')
      .digest('hex')

    const credentials = Buffer.from(`${P24_CONFIG.posId}:${P24_CONFIG.apiKey}`).toString('base64')

    const verifyResponse = await fetch(`${P24_CONFIG.baseUrl}/api/v1/transaction/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({ ...verifyData, sign: verifySign })
    })

    const verifyResult = await verifyResponse.json()
    console.log('Verify result:', verifyResult)

    if (verifyResponse.ok && verifyResult.data?.status === 'success') {
      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          p24_order_id: orderId.toString(),
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id)

      console.log(`Payment confirmed for order ${order.id}`)
      return NextResponse.json({ status: 'OK' })
    } else {
      await supabase
        .from('orders')
        .update({ status: 'failed' })
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
