
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"

// GET /api/accounting/expenses - Liste des dépenses
export async function GET(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const storeIdParam = searchParams.get("storeId")
    
    // Vérification des permissions
    const hasGlobalView = await hasPermission(session.user.id, "accounting.expenses.view")
    
    let permittedStoreIds: string[] = []
    
    if (!hasGlobalView) {
      // Si pas de permission globale, récupérer les magasins autorisés
      const userStoreRoles = await prisma.storeUserRole.findMany({
        where: {
          userId: session.user.id,
          role: {
            storeRolePermissions: {
              some: {
                permission: {
                  name: "store.expenses.view"
                }
              }
            }
          }
        },
        select: { storeId: true }
      })
      
      permittedStoreIds = userStoreRoles.map(role => role.storeId)
      
      if (permittedStoreIds.length === 0) {
        return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
      }
    }

    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const isRecurring = searchParams.get("isRecurring")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Construire les filtres
    const where: any = {}

    // Filtrage par magasin
    if (hasGlobalView) {
      // Admin global
      if (storeIdParam === "null") {
        where.storeId = null
      } else if (storeIdParam) {
        where.storeId = storeIdParam
      }
    } else {
      // Utilisateur restreint aux magasins
      if (storeIdParam) {
        if (storeIdParam === "null") {
           return NextResponse.json({ error: "Accès refusé aux dépenses générales" }, { status: 403 })
        }
        // Vérifier si le magasin demandé est autorisé
        if (!permittedStoreIds.includes(storeIdParam)) {
          return NextResponse.json({ error: "Permission refusée pour ce magasin" }, { status: 403 })
        }
        where.storeId = storeIdParam
      } else {
        // Pas de magasin spécifié, on limite à tous les magasins autorisés
        where.storeId = { in: permittedStoreIds }
      }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (status) {
      where.status = status
    }

    if (isRecurring === "true") {
      where.isRecurring = true
    } else if (isRecurring === "false") {
      where.isRecurring = false
    }

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.dueDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true }
          },
          category: {
            select: { id: true, name: true, icon: true, color: true }
          },
          createdBy: {
            select: { id: true, name: true, firstName: true, lastName: true }
          },
          _count: {
            select: { payments: true }
          }
        },
        orderBy: { dueDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where })
    ])

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/accounting/expenses - Créer une dépense
export async function POST(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const {
      storeId,
      categoryId,
      title,
      description,
      amount,
      supplierName,
      supplierPhone,
      dueDate,
      periodicity,
      paymentDay,
      documentUrl,
      documentName,
      documents, // Nouveau: tableau de documents [{url, name, type?, size?, mimeType?}]
      isRecurring,
    } = body

    // Vérification des permissions
    if (storeId) {
      // Pour un magasin spécifique : permission magasin OU permission globale
      const canCreateStore = await hasStorePermission(session.user.id, storeId, "store.expenses.create")
      const canCreateGlobal = await hasPermission(session.user.id, "accounting.expenses.create")
      
      if (!canCreateStore && !canCreateGlobal) {
        return NextResponse.json({ error: "Permission refusée pour ce magasin" }, { status: 403 })
      }
    } else {
      // Pour une dépense générale : permission globale requise
      const canCreateGlobal = await hasPermission(session.user.id, "accounting.expenses.create")
      if (!canCreateGlobal) {
        return NextResponse.json({ error: "Permission refusée (Dépense générale)" }, { status: 403 })
      }
    }

    // Validations
    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "L'intitulé est requis" }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: "La catégorie est requise" }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Le montant doit être supérieur à 0" }, { status: 400 })
    }

    if (!dueDate) {
      return NextResponse.json({ error: "La date d'échéance est requise" }, { status: 400 })
    }

    // Vérifier que la catégorie existe
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 })
    }

    // Vérifier que le magasin existe si renseigné
    if (storeId) {
      const store = await prisma.store.findUnique({
        where: { id: storeId }
      })
      if (!store) {
        return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 })
      }
    }

    // Utiliser une transaction pour créer la dépense et les documents
    const expense = await prisma.$transaction(async (tx) => {
      // Créer la dépense
      const newExpense = await tx.expense.create({
        data: {
          storeId: storeId || null,
          categoryId,
          title: title.trim(),
          description: description?.trim() || null,
          amount,
          supplierName: supplierName?.trim() || null,
          supplierPhone: supplierPhone?.trim() || null,
          dueDate: new Date(dueDate),
          periodicity: periodicity || "ONCE",
          paymentDay: paymentDay || null,
          documentUrl: documentUrl || null, // Conservé pour rétrocompatibilité
          documentName: documentName || null,
          isRecurring: isRecurring || false,
          status: "PENDING",
          paidAmount: 0,
          remainingAmount: amount,
          createdById: session.user.id,
        },
      })

      // Créer les documents si fournis
      if (documents && Array.isArray(documents) && documents.length > 0) {
        await tx.expenseDocument.createMany({
          data: documents.map((doc: { url: string; name: string; type?: string; size?: number; mimeType?: string }) => ({
            expenseId: newExpense.id,
            url: doc.url,
            name: doc.name,
            type: doc.type || "other",
            size: doc.size || null,
            mimeType: doc.mimeType || null,
          }))
        })
      } else if (documentUrl) {
        // Rétrocompatibilité: si un seul document est fourni via documentUrl
        await tx.expenseDocument.create({
          data: {
            expenseId: newExpense.id,
            url: documentUrl,
            name: documentName || "Document",
            type: "invoice",
          }
        })
      }

      // Récupérer la dépense avec toutes les relations
      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          store: {
            select: { id: true, name: true }
          },
          category: {
            select: { id: true, name: true, icon: true, color: true }
          },
          createdBy: {
            select: { id: true, name: true }
          },
          documents: true
        }
      })
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSES_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
