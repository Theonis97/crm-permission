import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { prisma } from './prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  status: string;
  storeId: string;
  storeName: string;
  avatar: string | null;
  vehicle: string | null;
  isActive: boolean;
}

/**
 * Vérifie l'authentification mobile et retourne l'utilisateur
 * À utiliser dans les route handlers Next.js
 */
export async function authenticateMobileUser(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    // Extraire le token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        user: null,
        error: 'Token d\'authentification manquant',
      };
    }

    // Vérifier le token
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'access') {
      return {
        user: null,
        error: 'Token invalide ou expiré',
      };
    }

    // Récupérer le livreur depuis la DB
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: payload.userId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deliveryPerson) {
      return {
        user: null,
        error: 'Livreur non trouvé',
      };
    }

    if (!deliveryPerson.isActive) {
      return {
        user: null,
        error: 'Compte désactivé',
      };
    }

    return {
      user: {
        id: deliveryPerson.id,
        email: deliveryPerson.email as string, // Email est maintenant obligatoire dans le schéma
        phone: deliveryPerson.phone,
        name: deliveryPerson.name,
        firstName: null,
        lastName: null,
        roles: ['driver'],
        status: deliveryPerson.status,
        storeId: deliveryPerson.storeId,
        storeName: deliveryPerson.store.name,
        avatar: deliveryPerson.avatar,
        vehicle: deliveryPerson.vehicle,
        isActive: deliveryPerson.isActive,
      },
      error: null,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      user: null,
      error: 'Erreur d\'authentification',
    };
  }
}

/**
 * Vérifie l'authentification mobile (wrapper pour compatibilité)
 * Retourne l'objet complet avec authenticated et user
 */
export async function verifyMobileAuth(
  request: NextRequest
): Promise<{ authenticated: boolean; user: AuthenticatedUser | null; error?: string }> {
  const { user, error } = await authenticateMobileUser(request);
  return {
    authenticated: user !== null,
    user,
    error: error || undefined,
  };
}

/**
 * Vérifie qu'un utilisateur a un rôle spécifique
 */
export function hasRole(user: AuthenticatedUser, roleName: string): boolean {
  return user.roles.some(role => role.toLowerCase() === roleName.toLowerCase());
}

/**
 * Vérifie qu'un utilisateur a au moins un des rôles spécifiés
 */
export function hasAnyRole(user: AuthenticatedUser, roleNames: string[]): boolean {
  return roleNames.some(roleName => hasRole(user, roleName));
}
