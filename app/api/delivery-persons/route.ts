import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"

// GET - Récupérer tous les livreurs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    // Date du jour (début et fin)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: storeId ? { storeId } : undefined,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryZones: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            storeOrders: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Ajouter les statistiques du jour et le stock pour chaque livreur
    const deliveryPersonsWithStats = await Promise.all(
      deliveryPersons.map(async (person) => {
        // Commandes du jour
        const todayOrders = await prisma.storeOrder.findMany({
          where: {
            deliveryPersonId: person.id,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          select: {
            status: true,
            total: true,
          },
        })

        // Statistiques du jour
        const deliveredToday = todayOrders.filter(o => o.status === "DELIVERED").length
        const deliveringToday = todayOrders.filter(o => o.status === "DELIVERING").length
        const pendingToday = todayOrders.filter(o => 
          ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
        ).length

        const todayRevenue = todayOrders
          .filter(o => o.status === "DELIVERED")
          .reduce((sum, order) => sum + order.total, 0)

        // Stock du livreur
        const stock = await prisma.deliveryPersonStock.findMany({
          where: {
            deliveryPersonId: person.id,
          },
          include: {
            product: {
              select: {
                prixVente: true,
              },
            },
            variant: {
              select: {
                prixVente: true,
              },
            },
          },
        })

        // Calculer le résumé du stock
        const totalItems = stock.reduce((sum, item) => sum + item.quantity, 0)
        const totalValue = stock.reduce((sum, item) => {
          const price = item.variant?.prixVente || item.product.prixVente
          return sum + price * item.quantity
        }, 0)

        return {
          ...person,
          todayStats: {
            delivered: deliveredToday,
            delivering: deliveringToday,
            pending: pendingToday,
            revenue: todayRevenue,
          },
          stockSummary: {
            totalItems,
            totalValue,
            totalProducts: stock.length,
          },
        }
      })
    )

    return NextResponse.json(deliveryPersonsWithStats)
  } catch (error: any) {
    console.error("Error fetching delivery persons:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau livreur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !hasPermission(user, "stores.manage")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      storeId,
      name,
      phone,
      email,
      avatar,
      vehicle,
      plateNumber,
      status,
    } = body

    // Validation
    if (!storeId || !name || !phone || !email) {
      return NextResponse.json(
        { error: "Données invalides. Le nom, le téléphone et l'email sont requis." },
        { status: 400 }
      )
    }

    // Vérifier si l'email ou le téléphone existe déjà pour un livreur
    const existingDeliveryPersonByEmail = await prisma.deliveryPerson.findUnique({
      where: { email },
    })

    if (existingDeliveryPersonByEmail) {
      return NextResponse.json(
        { error: "Un livreur avec cet email existe déjà." },
        { status: 400 }
      )
    }

    const existingDeliveryPersonByPhone = await prisma.deliveryPerson.findUnique({
      where: { phone },
    })

    if (existingDeliveryPersonByPhone) {
      return NextResponse.json(
        { error: "Un livreur avec ce numéro de téléphone existe déjà." },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà pour un utilisateur
    let existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Hasher le mot de passe par défaut "innotech"
    const hashedPassword = await bcrypt.hash("innotech", 12)

    let createdUser = null
    let userAlreadyExisted = false

    if (existingUser) {
      // L'utilisateur existe déjà, on va l'utiliser
      userAlreadyExisted = true
      createdUser = existingUser

      // Vérifier si l'utilisateur a déjà le rôle Livreur
      const hasDeliveryRole = existingUser.userRoles.some(ur => 
        ["Livreur", "Delivery", "Courier"].includes(ur.role.name)
      )

      // Si l'utilisateur n'a pas le rôle Livreur, l'ajouter
      if (!hasDeliveryRole) {
        const deliveryRole = await prisma.role.findFirst({
          where: {
            name: {
              in: ["Livreur", "Delivery", "Courier"],
            },
          },
        })

        if (deliveryRole) {
          await prisma.userRole.create({
            data: {
              userId: existingUser.id,
              roleId: deliveryRole.id,
            },
          })
        }
      }
    } else {
      // L'utilisateur n'existe pas, on le crée
      const nameParts = name.split(" ")
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(" ") || ""

      // Chercher le rôle "Livreur" ou "Utilisateur"
      let deliveryRole = await prisma.role.findFirst({
        where: {
          name: {
            in: ["Livreur", "Delivery", "Courier"],
          },
        },
      })

      // Si aucun rôle livreur n'existe, utiliser le rôle "Utilisateur"
      if (!deliveryRole) {
        deliveryRole = await prisma.role.findFirst({
          where: { name: "Utilisateur" },
        })
      }

      // Créer l'utilisateur
      createdUser = await prisma.user.create({
        data: {
          email,
          name,
          firstName,
          lastName,
          password: hashedPassword,
          status: "ACTIVE",
        },
      })

      // Assigner le rôle si trouvé
      if (deliveryRole) {
        await prisma.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: deliveryRole.id,
          },
        })
      }
    }

    // Créer le livreur avec le même mot de passe hashé
    const deliveryPerson = await prisma.deliveryPerson.create({
      data: {
        storeId,
        name,
        phone,
        email,
        password: hashedPassword,
        avatar,
        vehicle,
        plateNumber,
        status: status || "AVAILABLE",
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryZones: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json({
      deliveryPerson,
      userCreated: !userAlreadyExisted,
      userAlreadyExisted,
      userEmail: createdUser.email,
      defaultPassword: userAlreadyExisted ? null : "innotech",
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating delivery person:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
