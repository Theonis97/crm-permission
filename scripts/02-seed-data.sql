-- Insert default roles
INSERT INTO public.roles (name, description, is_system) VALUES
('Super Admin', 'Accès complet à toutes les fonctionnalités', true),
('Admin', 'Accès administrateur avec quelques restrictions', true),
('Manager', 'Gestionnaire avec accès aux équipes', false),
('Commercial', 'Accès aux fonctionnalités commerciales', false),
('Utilisateur', 'Accès de base en lecture', false);

-- Insert permissions for different modules
INSERT INTO public.permissions (name, description, module, action) VALUES
-- Users management
('users.view', 'Voir les utilisateurs', 'users', 'view'),
('users.create', 'Créer des utilisateurs', 'users', 'create'),
('users.edit', 'Modifier les utilisateurs', 'users', 'edit'),
('users.delete', 'Supprimer les utilisateurs', 'users', 'delete'),

-- Roles management
('roles.view', 'Voir les rôles', 'roles', 'view'),
('roles.create', 'Créer des rôles', 'roles', 'create'),
('roles.edit', 'Modifier les rôles', 'roles', 'edit'),
('roles.delete', 'Supprimer les rôles', 'roles', 'delete'),
('roles.assign', 'Assigner des rôles', 'roles', 'assign'),

-- Contacts management
('contacts.view', 'Voir les contacts', 'contacts', 'view'),
('contacts.create', 'Créer des contacts', 'contacts', 'create'),
('contacts.edit', 'Modifier les contacts', 'contacts', 'edit'),
('contacts.delete', 'Supprimer les contacts', 'contacts', 'delete'),
('contacts.export', 'Exporter les contacts', 'contacts', 'export'),

-- Products management
('products.view', 'Voir les produits', 'products', 'view'),
('products.create', 'Créer des produits', 'products', 'create'),
('products.edit', 'Modifier les produits', 'products', 'edit'),
('products.delete', 'Supprimer les produits', 'products', 'delete'),

-- Quotes & Invoices
('quotes.view', 'Voir les devis', 'quotes', 'view'),
('quotes.create', 'Créer des devis', 'quotes', 'create'),
('quotes.edit', 'Modifier les devis', 'quotes', 'edit'),
('quotes.delete', 'Supprimer les devis', 'quotes', 'delete'),
('quotes.send', 'Envoyer des devis', 'quotes', 'send'),

('invoices.view', 'Voir les factures', 'invoices', 'view'),
('invoices.create', 'Créer des factures', 'invoices', 'create'),
('invoices.edit', 'Modifier les factures', 'invoices', 'edit'),
('invoices.delete', 'Supprimer les factures', 'invoices', 'delete'),
('invoices.send', 'Envoyer des factures', 'invoices', 'send'),

-- Tasks management
('tasks.view', 'Voir les tâches', 'tasks', 'view'),
('tasks.create', 'Créer des tâches', 'tasks', 'create'),
('tasks.edit', 'Modifier les tâches', 'tasks', 'edit'),
('tasks.delete', 'Supprimer les tâches', 'tasks', 'delete'),
('tasks.assign', 'Assigner des tâches', 'tasks', 'assign'),

-- Opportunities management
('opportunities.view', 'Voir les opportunités', 'opportunities', 'view'),
('opportunities.create', 'Créer des opportunités', 'opportunities', 'create'),
('opportunities.edit', 'Modifier les opportunités', 'opportunities', 'edit'),
('opportunities.delete', 'Supprimer les opportunités', 'opportunities', 'delete'),

-- Reports
('reports.view', 'Voir les rapports', 'reports', 'view'),
('reports.export', 'Exporter les rapports', 'reports', 'export');
