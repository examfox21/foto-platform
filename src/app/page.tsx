import Link from 'next/link'
import { Camera, Smartphone, Users, CreditCard, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">FotoPlatform</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Funkcje
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Cennik
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Logowanie
            </Link>
            <Link 
              href="/register" 
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Rozpocznij za darmo
            </Link>
          </nav>
          <div className="md:hidden">
            <Link 
              href="/register" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Zarejestruj się
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Twoja fotografia, <span className="text-indigo-600">nasz sukces</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Zrewolucjonizuj swoją pracę dzięki platformie, która łączy zarządzanie klientami, sprzedaż zdjęć i intuicyjne galerie w jednym, mobilnym rozwiązaniu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-lg w-full sm:w-auto"
            >
              Rozpocznij za darmo
            </Link>
            <Link 
              href="#demo"
              className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition-all duration-300 w-full sm:w-auto"
            >
              Zobacz demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            Bezpłatny plan na zawsze • Bez ukrytych opłat • Rozwijaj biznes na swoich zasadach
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16">
            Narzędzia, które wspierają Twój sukces
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Smartphone className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Zoptymalizowane dla urządzeń mobilnych",
                description: "Intuicyjny interfejs zaprojektowany z myślą o smartfonach, zapewniający łatwy dostęp dla Ciebie i Twoich klientów."
              },
              {
                icon: <Users className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Efektywne zarządzanie klientami",
                description: "Centralizuj dane klientów, historię sesji i komunikację w jednym, uporządkowanym miejscu."
              },
              {
                icon: <CreditCard className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Wygodne płatności online",
                description: "Integracja z Przelewy24 umożliwia błyskawiczne i bezpieczne transakcje BLIK oraz przelewami."
              },
              {
                icon: <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Zaawansowane zabezpieczenia",
                description: "Twoje zdjęcia chronione są znakami wodnymi i szyfrowanym przechowywaniem w chmurze."
              },
              {
                icon: <Zap className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Błyskawiczne ładowanie galerii",
                description: "Optymalizacja obrazów i globalna sieć CDN zapewniają szybkie wczytywanie zdjęć."
              },
              {
                icon: <Camera className="h-12 w-12 text-indigo-600 mx-auto mb-4" />,
                title: "Intuicyjny upload zdjęć",
                description: "Przeciągnij i upuść zdjęcia, z automatyczną kompresją i generowaniem miniatur."
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                {feature.icon}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
            Co mówią nasi użytkownicy
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "FotoPlatform pozwoliła mi zaoszczędzić godziny na zarządzaniu klientami i zdjęciami. Polecam każdemu fotografowi!",
                author: "Anna Kowalska, Fotograf Ślubny"
              },
              {
                quote: "Integracja z płatnościami i mobilny interfejs to game-changer. Moi klienci uwielbiają prostotę!",
                author: "Piotr Nowak, Fotograf Portretowy"
              },
              {
                quote: "Szybkość ładowania galerii i zabezpieczenia zdjęć dały mi spokój ducha. Świetne narzędzie!",
                author: "Katarzyna Zielińska, Fotograf Krajobrazowy"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                <p className="text-indigo-600 font-semibold">{testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Przenieś swoją fotografię na wyższy poziom
          </h2>
          <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
            Dołącz do setek fotografów, którzy dzięki FotoPlatform zrewolucjonizowali swoje podejście do biznesu.
          </p>
          <Link 
            href="/register"
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg inline-block"
          >
            Rozpocznij za darmo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Camera className="h-6 w-6" />
                <span className="text-lg font-bold">FotoPlatform</span>
              </div>
              <p className="text-gray-400 text-sm">
                Innowacyjne narzędzie dla fotografów, które łączy prostotę, funkcjonalność i nowoczesny design.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Linki</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#features" className="hover:text-white">Funkcje</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Cennik</Link></li>
                <li><Link href="/login" className="hover:text-white">Logowanie</Link></li>
                <li><Link href="/register" className="hover:text-white">Zarejestruj się</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Kontakt</h3>
              <p className="text-gray-400 text-sm">
                Email: <a href="mailto:support@fotoplatform.pl" className="hover:text-white">support@fotoplatform.pl</a><br />
                Telefon: +48 123 456 789
              </p>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">
            © 2025 FotoPlatform. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  )
}
