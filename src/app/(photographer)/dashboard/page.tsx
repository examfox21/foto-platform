'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Eye, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Image,
  Calendar,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardStats {
  totalGalleries: number
  activeGalleries: number
  totalClients: number
  totalOrders: number
  totalRevenue: number
  pendingSelections: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentGalleries, setRecentGalleries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        setUser(session.user)

        // Load stats
        const [
          galleriesResult,
          clientsResult,
          ordersResult,
          recentGalleriesResult
        ] = await Promise.all([
          supabase
            .from('galleries')
            .select('status')
            .eq('photographer_id', session.user.id),
          
          supabase
            .from('clients')
            .select('id')
            .eq('photographer_id', session.user.id),
          
          supabase
            .from('orders')
            .select('total_amount, status')
            .eq('photographer_id', session.user.id),
            
          supabase
            .from('galleries')
            .select(`
              id,
              title,
              status,
              created_at,
              clients!inner(name, email)
            `)
            .eq('photographer_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ])

        // Calculate stats
        const galleries = galleriesResult.data || []
        const clients = clientsResult.data || []
        const orders = ordersResult.data || []

        const dashboardStats: DashboardStats = {
          totalGalleries: galleries.length,
          activeGalleries: galleries.filter(g => g.status === 'active').length,
          totalClients: clients.length,
          totalOrders: orders.length,
          totalRevenue: orders
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + Number(o.total_amount), 0),
          pendingSelections: galleries.filter(g => g.status === 'active').length
        }

        setStats(dashboardStats)
        setRecentGalleries(recentGalleriesResult.data || [])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Galerie',
      value: stats?.totalGalleries || 0,
      description: `${stats?.activeGalleries || 0} aktywnych`,
      icon: Image,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Klienci',
      value: stats?.totalClients || 0,
      description: 'Wszyscy klienci',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Przychody',
      value: formatCurrency(stats?.totalRevenue || 0),
      description: `${stats?.totalOrders || 0} zamówień`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Oczekujące',
      value: stats?.pendingSelections || 0,
      description: 'Wybory klientów',
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="p-6 space-y-6 -mt-6 lg:mt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Witaj ponownie! Oto podsumowanie Twojej działalności.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link href="/galleries/new">
              <Plus className="mr-2 h-4 w-4" />
              Nowa galeria
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Galleries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ostatnie galerie</CardTitle>
              <CardDescription>
                Twoje najnowsze galerie fotograficzne
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/galleries">
                Zobacz wszystkie
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentGalleries.length > 0 ? (
            <div className="space-y-4">
              {recentGalleries.map((gallery) => (
                <div key={gallery.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {gallery.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Klient: {gallery.clients?.name || 'Brak danych'} • {formatDate(gallery.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${gallery.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : gallery.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                      }
                    `}>
                      {gallery.status === 'active' ? 'Aktywna' : 
                       gallery.status === 'draft' ? 'Szkic' : 'Zakończona'}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/galleries/${gallery.id}`}>
                        Zobacz
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Image className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak galerii
              </h3>
              <p className="mt-2 text-gray-500">
                Stwórz swoją pierwszą galerię fotograficzną
              </p>
              <Button className="mt-4" asChild>
                <Link href="/galleries/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Stwórz galerię
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/galleries/new">
            <CardContent className="p-6 text-center">
              <Plus className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-medium">Nowa galeria</h3>
              <p className="mt-2 text-sm text-gray-500">
                Stwórz nową galerię dla klienta
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/clients/new">
            <CardContent className="p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-medium">Nowy klient</h3>
              <p className="mt-2 text-sm text-gray-500">
                Dodaj nowego klienta do bazy
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/settings">
            <CardContent className="p-6 text-center">
              <TrendingUp className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-medium">Ustawienia</h3>
              <p className="mt-2 text-sm text-gray-500">
                Skonfiguruj swoje konto
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  )
}
