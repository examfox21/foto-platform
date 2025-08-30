import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log('P24 Init Middleware:', request.method, request.url)
  return NextResponse.next()
}
