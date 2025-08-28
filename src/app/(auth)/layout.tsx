import Link from 'next/link'
import { Camera } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <Camera className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gray-900">FotoPlatform</span>
          </Link>
        </div>
        
        {/* Auth Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {children}
          </div>
          
          {/* Back to home */}
          <div className="text-center mt-6">
            <Link 
              href="/" 
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              ← Powrót do strony głównej
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
