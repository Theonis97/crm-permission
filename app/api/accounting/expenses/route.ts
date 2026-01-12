import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/auth-helpers"

// GET /api/accounting/expenses - Liste des dépenses
export async function GET(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const canView = await hasPermission(session.user.id, "accounting.expenses.view")
    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
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

    if (storeId === "null") {
      where.storeId = null
    } else if (storeId) {
      where.storeId = storeId
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

    const canCreate = await hasPermission(session.user.id, "accounting.expenses.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

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
      isRecurring,
    } = body

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

    const expense = await prisma.expense.create({
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
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        isRecurring: isRecurring || false,
        status: "PENDING",
        paidAmount: 0,
        remainingAmount: amount,
        createdById: session.user.id,
      },
      include: {
        store: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSES_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
