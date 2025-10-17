import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { DeliveryPersonStatus } from '@prisma/client';

/**
 * Hash par défaut pour le mot de passe "password"
 * Utilisé lors de la création d'un nouveau livreur
 */
const DEFAULT_PASSWORD_HASH = '$2b$10$UMDs6h9vT82XQhwRKeVsau5FFuiWwsfyyvYS4KwH2HOPS9PNecuuK';

export interface CreateDeliveryPersonInput {
  storeId: string;
  name: string;
  phone: string;
  email: string;
  password?: string; // Optionnel, par défaut "password"
  avatar?: string;
  vehicle?: string;
  plateNumber?: string;
}

/**
 * Crée un nouveau livreur avec mot de passe par défaut "password"
 */
export async function createDeliveryPerson(input: CreateDeliveryPersonInput) {
  // Hash le mot de passe si fourni, sinon utiliser le hash par défaut
  const passwordHash = input.password 
    ? await bcrypt.hash(input.password, 10)
    : DEFAULT_PASSWORD_HASH;

  const deliveryPerson = await prisma.deliveryPerson.create({
    data: {
      storeId: input.storeId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      password: passwordHash,
      avatar: input.avatar,
      vehicle: input.vehicle,
      plateNumber: input.plateNumber,
      status: DeliveryPersonStatus.AVAILABLE,
      isActive: true,
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return deliveryPerson;
}

/**
 * Met à jour le mot de passe d'un livreur
 */
export async function updateDeliveryPersonPassword(
  deliveryPersonId: string,
  newPassword: string
) {
  const passwordHash = await bcrypt.hash(newPassword, 10);

  return await prisma.deliveryPerson.update({
    where: { id: deliveryPersonId },
    data: { password: passwordHash },
  });
}

/**
 * Vérifie si un livreur peut se connecter (actif)
 */
export async function canDeliveryPersonLogin(deliveryPersonId: string): Promise<boolean> {
  const deliveryPerson = await prisma.deliveryPerson.findUnique({
    where: { id: deliveryPersonId },
    select: { isActive: true },
  });

  return deliveryPerson?.isActive ?? false;
}

/**
 * Désactive un livreur (empêche la connexion)
 */
export async function deactivateDeliveryPerson(deliveryPersonId: string) {
  return await prisma.deliveryPerson.update({
    where: { id: deliveryPersonId },
    data: { isActive: false },
  });
}

/**
 * Active un livreur (permet la connexion)
 */
export async function activateDeliveryPerson(deliveryPersonId: string) {
  return await prisma.deliveryPerson.update({
    where: { id: deliveryPersonId },
    data: { isActive: true },
  });
}
