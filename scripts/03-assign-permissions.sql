-- Assign all permissions to Super Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Super Admin';

-- Assign most permissions to Admin (except user deletion and role management)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
AND p.name NOT IN ('users.delete', 'roles.create', 'roles.edit', 'roles.delete');

-- Assign commercial permissions to Manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
AND p.module IN ('contacts', 'products', 'quotes', 'invoices', 'tasks', 'opportunities', 'reports')
AND p.action != 'delete';

-- Assign basic commercial permissions to Commercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Commercial'
AND p.module IN ('contacts', 'products', 'quotes', 'tasks', 'opportunities')
AND p.action IN ('view', 'create', 'edit');

-- Assign read-only permissions to Utilisateur
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Utilisateur'
AND p.action = 'view';
