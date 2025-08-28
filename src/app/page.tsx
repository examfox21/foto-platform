import Link from 'next/link'
import { Camera, Smartphone, Users, CreditCard, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">FotoPlatform</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-muted-foreground hover:text-foreground">
              Funkcje
            </Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground">
              Cennik
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Logowanie
            </Link>
            <Link 
              href="/register" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Rozpocznij za darmo
            </Link>
          </nav>
          <div className="md:hidden">
            <Link 
              href="/register" 
              className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm"
            >
              Zarejestruj się
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Platforma dla
            <span className="text-primary block">nowoczesnych fotografów</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Udostępniaj galerie, sprzedawaj zdjęcia i zarządzaj klientami. 
            Wszystko w jednej aplikacji zoptymalizowanej pod telefon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors w-full sm:w-auto"
            >
              Zacznij za darmo
            </Link>
            <Link 
              href="#demo"
              className="border-2 border-primary text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/10 transition-colors w-full sm:w-auto"
            >
              Zobacz demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Darmowy plan na zawsze • Bez opłat miesięcznych • Płać tylko za sukces
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Wszystko czego potrzebujesz
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Mobile-first</h3>
              <p className="text-gray-600">
                Zaprojektowane z myślą o telefonach. Twoi klienci będą zachwyceni łatwością użytkowania.
              </p>
            </div>
            <div className="text-center p-6">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Zarządzanie klientami</h3>
              <p className="text-gray-600">
                Wszystkie dane klientów, historia sesji i komunikacja w jednym miejscu.
              </p>
            </div>
            <div className="text-center p-6">
              <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Płatności BLIK i przelewy</h3>
              <p className="text-gray-600">
                Integracja z Przelewy24. Twoi klienci płacą wygodnie, a Ty otrzymujesz pieniądze szybko.
              </p>
            </div>
            <div className="text-center p-6">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Zabezpieczenia</h3>
              <p className="text-gray-600">
                Zaawansowane znaki wodne i szyfrowane przechowywanie chroni Twoje zdjęcia.
              </p>
            </div>
            <div className="text-center p-6">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Szybkie ładowanie</h3>
              <p className="text-gray-600">
                Optymalizacja obrazów i CDN zapewniają błyskawiczne ładowanie galerii.
              </p>
            </div>
            <div className="text-center p-6">
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Intuicyjny upload</h3>
              <p className="text-gray-600">
                Przeciągnij i upuść setki zdjęć. Automatyczne thumbnails i kompresja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Gotowy na start?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Dołącz do fotografów, którzy już zarabiają więcej dzięki naszej platformie.
          </p>
          <Link 
            href="/register"
            className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            Rozpocznij za darmo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Camera className="h-6 w-6" />
            <span className="text-lg font-bold">FotoPlatform</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 FotoPlatform. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  )
}
