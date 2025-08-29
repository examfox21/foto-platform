import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('P24 Init API called')
    
    // Sprawdź env variables
    const envCheck = {
      MERCHANT_ID: !!process.env.P24_MERCHANT_ID,
      POS_ID: !!process.env.P24_POS_ID,
      API_KEY: !!process.env.P24_API_KEY,
      CRC_KEY: !!process.env.P24_CRC_KEY
    }
    
    console.log('Environment variables:', envCheck)
    
    const body = await request.json()
    console.log('Request body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'API route działa',
      env: envCheck
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
