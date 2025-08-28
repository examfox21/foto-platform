'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MoreVertical,
  Edit,
  Trash2,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  created_at: string
  updated_at: string
  _count?: {
    galleries: number
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        setUser(session.user)

        const { data: clientsData, error } = await supabase
          .from('clients')
          .select(`
            id,
            name,
            email,
            phone,
            created_at,
            updated_at
          `)
          .eq('photographer_id', session.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Get gallery count for each client
        const clientsWithCounts = await Promise.all(
          (clientsData || []).map(async (client) => {
            const { count } = await supabase
              .from('galleries')
              .select('*', { count: 'exact', head: true })
              .eq('client_id', client.id)

            return {
              ...client,
              _count: { galleries: count || 0 }
            }
          })
        )

        setClients(clientsWithCounts)
      } catch (error) {
        console.error('Error loading clients:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego klienta? Wszystkie jego galerie również zostaną usunięte.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error

      setClients(clients.filter(c => c.id !== clientId))
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Błąd podczas usuwania klienta')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
          <p className="mt-1 text-sm text-gray-500">
            Zarządzaj swoimi klientami i ich danymi kontaktowymi
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nowy klient
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Szukaj klientów..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {client.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {client._count?.galleries || 0} galerii
                      </CardDescription>
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-3">
                    Dodany: {formatDate(client.created_at)}
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/galleries/new?client=${client.id}`}>
                      Nowa galeria
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link href={`/clients/${client.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClient(client.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {searchTerm ? (
            <div>
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak wyników
              </h3>
              <p className="mt-2 text-gray-500">
                Nie znaleziono klientów dla frazy "{searchTerm}"
              </p>
            </div>
          ) : (
            <div>
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak klientów
              </h3>
              <p className="mt-2 text-gray-500">
                Dodaj swojego pierwszego klienta, żeby móc tworzyć galerie
              </p>
              <Button className="mt-4" asChild>
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj klienta
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
