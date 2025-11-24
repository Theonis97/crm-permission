-- Script SQL pour ajouter les accès magasin à admin@example.com

-- 1. Créer les permissions de magasin si elles n'existent pas
INSERT INTO store_permissions (id, name, description, module, action, created_at) 
VALUES 
  (gen_random_uuid(), 'store.dashboard.view', 'Voir le tableau de bord', 'dashboard', 'view', NOW()),
  (gen_random_uuid(), 'store.products.view', 'Voir les produits', 'products', 'view', NOW()),
  (gen_random_uuid(), 'store.products.create', 'Créer des produits', 'products', 'create', NOW()),
  (gen_random_uuid(), 'store.products.edit', 'Modifier les produits', 'products', 'edit', NOW()),
  (gen_random_uuid(), 'store.products.delete', 'Supprimer les produits', 'products', 'delete', NOW()),
  (gen_random_uuid(), 'store.products.stock', 'Gérer le stock des produits', 'products', 'stock', NOW()),
  (gen_random_uuid(), 'store.orders.view', 'Voir les commandes', 'orders', 'view', NOW()),
  (gen_random_uuid(), 'store.orders.create', 'Créer des commandes', 'orders', 'create', NOW()),
  (gen_random_uuid(), 'store.orders.edit', 'Modifier les commandes', 'orders', 'edit', NOW()),
  (gen_random_uuid(), 'store.pos.access', 'Accéder au point de vente', 'pos', 'access', NOW()),
  (gen_random_uuid(), 'store.pos.sell', 'Effectuer des ventes', 'pos', 'sell', NOW()),
  (gen_random_uuid(), 'store.users.view', 'Voir les utilisateurs', 'users', 'view', NOW()),
  (gen_random_uuid(), 'store.users.invite', 'Inviter des utilisateurs', 'users', 'invite', NOW()),
  (gen_random_uuid(), 'store.users.roles', 'Gérer les rôles utilisateurs', 'users', 'roles', NOW()),
  (gen_random_uuid(), 'store.settings.edit', 'Modifier les paramètres', 'settings', 'edit', NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Pour chaque magasin, créer un rôle Super Admin et l'assigner à admin@example.com
DO $$
DECLARE
    store_record RECORD;
    admin_user_id TEXT;
    super_admin_role_id TEXT;
    permission_record RECORD;
BEGIN
    -- Récupérer l'ID de l'utilisateur admin
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Utilisateur admin@example.com non trouvé';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Utilisateur admin trouvé: %', admin_user_id;
    
    -- Pour chaque magasin
    FOR store_record IN SELECT id, name FROM stores LOOP
        RAISE NOTICE 'Traitement du magasin: % (ID: %)', store_record.name, store_record.id;
        
        -- Vérifier si le rôle Super Admin existe pour ce magasin
        SELECT id INTO super_admin_role_id 
        FROM store_roles 
        WHERE store_id = store_record.id AND name = 'Super Admin';
        
        -- Créer le rôle Super Admin s'il n'existe pas
        IF super_admin_role_id IS NULL THEN
            INSERT INTO store_roles (id, store_id, name, description, is_system, created_at)
            VALUES (gen_random_uuid(), store_record.id, 'Super Admin', 'Accès complet au magasin', true, NOW())
            RETURNING id INTO super_admin_role_id;
            
            RAISE NOTICE 'Rôle Super Admin créé: %', super_admin_role_id;
        ELSE
            RAISE NOTICE 'Rôle Super Admin existe déjà: %', super_admin_role_id;
        END IF;
        
        -- Assigner toutes les permissions de magasin au rôle Super Admin
        FOR permission_record IN SELECT id FROM store_permissions WHERE name LIKE 'store.%' LOOP
            INSERT INTO store_role_permissions (id, role_id, permission_id, created_at)
            VALUES (gen_random_uuid(), super_admin_role_id, permission_record.id, NOW())
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Permissions assignées au rôle Super Admin';
        
        -- Assigner le rôle Super Admin à l'utilisateur admin
        INSERT INTO store_user_roles (id, user_id, store_id, role_id, assigned_by, assigned_at)
        VALUES (gen_random_uuid(), admin_user_id, store_record.id, super_admin_role_id, admin_user_id, NOW())
        ON CONFLICT (user_id, store_id, role_id) DO NOTHING;
        
        RAISE NOTICE 'Rôle Super Admin assigné à admin@example.com pour le magasin %', store_record.name;
        
    END LOOP;
    
    RAISE NOTICE 'Accès magasin ajouté avec succès pour admin@example.com!';
END $$;
