-- Script SQL pour ajouter rapidement les permissions orders

-- Créer les permissions
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'orders.view', 'Voir les commandes clients', 'orders', 'view', NOW(), NOW()),
  (gen_random_uuid(), 'orders.create', 'Créer des commandes clients', 'orders', 'create', NOW(), NOW()),
  (gen_random_uuid(), 'orders.edit', 'Modifier les commandes clients', 'orders', 'edit', NOW(), NOW()),
  (gen_random_uuid(), 'orders.delete', 'Supprimer les commandes clients', 'orders', 'delete', NOW(), NOW()),
  (gen_random_uuid(), 'orders.validate', 'Valider les commandes clients', 'orders', 'validate', NOW(), NOW()),
  (gen_random_uuid(), 'orders.cancel', 'Annuler les commandes clients', 'orders', 'cancel', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Attribuer toutes les permissions orders au rôle Super Admin
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
  AND p.module = 'orders'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribuer les permissions orders au rôle Admin (sans delete)
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.module = 'orders'
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribuer les permissions orders au rôle Manager (sans delete)
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.module = 'orders'
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribuer les permissions orders au rôle Commercial (view, create, edit)
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Commercial'
  AND p.module = 'orders'
  AND p.action IN ('view', 'create', 'edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Vérification
SELECT 
  r.name AS role,
  COUNT(p.id) AS permissions_count,
  STRING_AGG(p.name, ', ') AS permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE p.module = 'orders'
GROUP BY r.name
ORDER BY r.name;
