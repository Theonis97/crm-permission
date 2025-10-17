import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation des champs requis
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email et mot de passe requis' 
        },
        { status: 400 }
      );
    }

    // Rechercher le livreur par email ou téléphone
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: {
        OR: [
          { email },
          { phone: email }, // Permettre la connexion avec le téléphone
        ],
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        phone: true,
        email: true,
        password: true, // Sélectionner explicitement le password
        avatar: true,
        vehicle: true,
        plateNumber: true,
        status: true,
        rating: true,
        totalDeliveries: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Identifiants invalides' 
        },
        { status: 401 }
      );
    }

    // Vérifier si le livreur est actif
    if (!deliveryPerson.isActive) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Compte désactivé. Contactez l\'administrateur.' 
        },
        { status: 403 }
      );
    }

    // Vérifier le mot de passe
    if (!deliveryPerson.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Compte non configuré pour la connexion par mot de passe' 
        },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, deliveryPerson.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Identifiants invalides' 
        },
        { status: 401 }
      );
    }

    // Préparer les données de payload
    const tokenPayload = {
      userId: deliveryPerson.id,
      email: deliveryPerson.email as string, // Email est maintenant obligatoire
      name: deliveryPerson.name,
      roles: ['driver'], // Le rôle est implicite pour DeliveryPerson
    };

    // Générer les tokens
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Log de connexion réussie
    console.log(`✅ Mobile login successful for driver: ${deliveryPerson.email}`);

    // Retourner les tokens et les infos utilisateur
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: deliveryPerson.id,
          email: deliveryPerson.email,
          phone: deliveryPerson.phone,
          name: deliveryPerson.name,
          firstName: null,
          lastName: null,
          avatar: deliveryPerson.avatar,
          storeId: deliveryPerson.storeId,
          storeName: deliveryPerson.store.name,
          vehicle: deliveryPerson.vehicle,
          status: deliveryPerson.status,
          rating: deliveryPerson.rating,
          totalDeliveries: deliveryPerson.totalDeliveries,
          roles: ['driver'],
        },
      },
    });
  } catch (error) {
    console.error('❌ Mobile login error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur serveur lors de la connexion' 
      },
      { status: 500 }
    );
  }
}
