# 🗄️ Modèle de Données — Chez Nous

> **Projet :** Chez Nous  
> **Fichier :** `docs/DATA_MODEL.md`  
> **Type :** Spécification Base de Données Relational, RLS & Schémas JSON  
> **Portée :** Utilisateurs, Foyers, Rôles (Propriétaire/Locataire), Tâches, Dépenses et Éditeur Spatial  
> **Dernière mise à jour :** Juillet 2026  

---

## 📐 1. Diagramme Entité-Relation (ERD)

```mermaid
erDiagram
    USERS ||--o{ HOUSEHOLD_MEMBERS : "appartient à (0..N)"
    HOUSEHOLDS ||--|{ HOUSEHOLD_MEMBERS : "possède (1..N)"
    HOUSEHOLDS ||--o| FLOOR_PLANS : "possède (0..1)"
    HOUSEHOLDS ||--o{ TASKS : "contient (0..N)"
    HOUSEHOLDS ||--o{ EXPENSES : "contient (0..N)"
    
    USERS ||--o{ TASKS : "assigné à"
    USERS ||--o{ EXPENSES : "payé par"

    USERS {
        uuid id PK
        string email UK
        string display_name
        string avatar_url
        timestamp created_at
    }

    HOUSEHOLDS {
        uuid id PK
        string name "Nom cosmétique"
        string invite_code UK "Code unique ex: K9B-2X1"
        uuid created_by FK
        timestamp created_at
    }

    HOUSEHOLD_MEMBERS {
        uuid id PK
        uuid household_id FK
        uuid user_id FK
        enum role "PROPRIETAIRE | LOCATAIRE"
        timestamp joined_at
    }

    FLOOR_PLANS {
        uuid id PK
        uuid household_id FK, UK
        jsonb layout_data "Modèle 2D/3D (Single Source of Truth)"
        integer version
        timestamp updated_at
    }

    TASKS {
        uuid id PK
        uuid household_id FK
        uuid assigned_to FK
        string title
        enum status "TODO | IN_PROGRESS | DONE"
        string room_id "Référence interne au JSON FloorPlan"
        timestamp due_date
        timestamp created_at
    }

    EXPENSES {
        uuid id PK
        uuid household_id FK
        uuid paid_by FK
        string title
        decimal amount
        string category
        timestamp created_at
    }
```

---

## 🗂️ 2. Dictionnaire des Tables Relationnelles

### 👤 Table `users`
Stocke les comptes utilisateurs de la plateforme.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identifiant unique de l'utilisateur. |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | Adresse email de connexion. |
| `display_name` | `VARCHAR(100)` | `NOT NULL` | Nom d'affichage (ex: "Alex", "Admin"). |
| `avatar_url` | `TEXT` | `NULLABLE` | Lien vers l'image de profil. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Date d'inscription. |

> **Pas de colonne `password_hash` ici** *(corrigé — incohérence trouvée avec §6, qui l'affirmait déjà)* : Supabase Auth gère l'authentification dans `auth.users`, jamais dupliquée dans `public.users`.

---

### 🏠 Table `households`
Représente un foyer/logement.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identifiant unique et immuable du foyer. |
| `name` | `VARCHAR(100)` | `NOT NULL` | Nom cosmétique (non unique). Ex: "Appartement Paris 11". |
| `invite_code` | `VARCHAR(10)` | `UNIQUE`, `NOT NULL` | Code court unique généré à la création (ex: `K9B-2X1`). |
| `created_by` | `UUID` | `FOREIGN KEY (users.id)` | Utilisateur créateur initial du foyer. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Date de création du foyer. |

---

### 👥 Table `household_members` (Table de Jonction)
Gère le rattachement N-N entre les utilisateurs et les foyers, ainsi que les niveaux de droits.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Clé primaire de la relation. |
| `household_id` | `UUID` | `FOREIGN KEY (households.id) ON DELETE CASCADE` | Foyer concerné. |
| `user_id` | `UUID` | `FOREIGN KEY (users.id) ON DELETE CASCADE` | Utilisateur membre. |
| `role` | `VARCHAR(20)` | `NOT NULL`, Default `'LOCATAIRE'` | Rôle : **`PROPRIETAIRE`** (Créateur/Admin plan) ou **`LOCATAIRE`** (Membre). |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Date d'arrivée dans le foyer. |

> **Contrainte d'unicité :** `UNIQUE(household_id, user_id)` (un utilisateur ne peut pas figurer 2 fois dans le même foyer).

---

### 📐 Table `floor_plans`
Stocke la donnée spatiale du logement pour le moteur 2D/3D.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identifiant du plan. |
| `household_id` | `UUID` | `UNIQUE`, `FOREIGN KEY (households.id) ON DELETE CASCADE` | 1 seul plan actif par foyer. |
| `layout_data` | `JSONB` | `NOT NULL` | Structure JSON complète du plan (voir section 5). |
| `version` | `INTEGER` | `NOT NULL`, Default `1` | Incrément de version pour sync optimistic lock. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Horodatage de dernière modification. |

---

### 📋 Table `tasks`
Gère les tâches ménagères et corvées du foyer.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identifiant de la tâche. |
| `household_id` | `UUID` | `FOREIGN KEY (households.id) ON DELETE CASCADE` | Foyer rattaché. |
| `assigned_to` | `UUID` | `NULLABLE`, `FOREIGN KEY (users.id)` | Membre responsable de la tâche. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Intitulé de la tâche. |
| `status` | `VARCHAR(20)` | `NOT NULL`, Default `'TODO'` | État : `TODO`, `IN_PROGRESS`, `DONE`. |
| `room_id` | `VARCHAR(50)` | `NULLABLE` | ID de la pièce associée (référence `room.id` du JSON plan). |
| `due_date` | `TIMESTAMPTZ` | `NULLABLE` | Échéance. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Date de création. |

---

### 💳 Table `expenses`
Gestion du budget partagé du foyer.

| Colonne | Type | Contraintes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identifiant de la dépense. |
| `household_id` | `UUID` | `FOREIGN KEY (households.id) ON DELETE CASCADE` | Foyer rattaché. |
| `paid_by` | `UUID` | `FOREIGN KEY (users.id)` | Payeur de la dépense. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Libellé (ex: "Courses Carrefour"). |
| `amount` | `NUMERIC(10,2)`| `NOT NULL` | Montant total TTC. |
| `category` | `VARCHAR(50)` | `NOT NULL`, Default `'GENERAL'` | Catégorie (Alimentation, Énergie, Loyer, etc.). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Date de saisie. |

---

## 🔐 3. Matrice de Droits & Sécurité (RLS - Row Level Security)

Toutes les requêtes en base de données sont soumises à la vérification de l'appartenance de l'utilisateur au `household_id` via la table `household_members`.

| Action / Ressource | `PROPRIETAIRE` | `LOCATAIRE` |
| :--- | :---: | :---: |
| **Consulter le plan 2D / 3D** | ✅ | ✅ |
| **Modifier le plan (Murs, pièces, meubles)** | ✅ | ❌ *(Lecture seule)* |
| **Créer / Cocher des Tâches** | ✅ | ✅ |
| **Ajouter / Consulter des Dépenses** | ✅ | ✅ |
| **Rédiger des notes spatiales** | ✅ | ✅ |
| **Générer / Partager le code d'invitation** | ✅ | ✅ |
| **Transférer la propriété du foyer** | ✅ | ❌ |
| **Expulser un membre** | ✅ | ❌ |
| **Supprimer le foyer** | ✅ | ❌ |

---

## 🔄 4. Logique de Départ d'un Foyer & Transfert de Propriété

Lorsqu'un utilisateur déclenche l'action "Quitter le foyer", l'application exécute l'algorithme suivant :

```text
[Utilisateur clique sur "Quitter le foyer"]
                   │
                   ▼
       { Est-il PROPRIETAIRE ? }
          │               │
        Non              Oui
          │               │
          ▼               ▼
 [Retrait immédiat]  { Nombre de membres dans le foyer ? }
                          │                          │
                        N = 1                      N > 1
                          │                          │
                          ▼                          ▼
               [Suppression définitive]   [Bloqué : Pop-up Obligatoire]
               - Foyer                    "Veuillez choisir le nouveau
               - Plan 2D/3D             Propriétaire parmi les Locataires"
               - Tâches & Dépenses                   │
                                                     ▼
                                          [Sélection du successeur]
                                          1. Successeur -> PROPRIETAIRE
                                          2. Ancien Proprio -> Retiré
```

---

## 🎨 5. Structure JSON `floor_plans.layout_data` (Single Source of Truth)

Ce document JSON stocke l'intégralité du plan 2D et permet la projection instantanée en 3D/Isometric Canvas via Three.js ou Pixi.js.

---

## 🧩 6. Extensions au-delà de ce schéma (conservées côté implémentation)

Ajoutées lors de la mise en place technique du schéma ci-dessus — présentes
dans `backend/supabase/migrations/`, absentes des sections précédentes.
Documentées ici plutôt que supprimées silencieusement ; à valider/rejeter
explicitement plutôt qu'à laisser diverger sans trace.

* **Table `occupants`** (humains ou animaux, distincts des comptes `users`) :
  un occupant humain peut exister sans compte (`claimed_by_user_id NULL`),
  puis être "réclamé" par un compte. Un animal ne peut jamais être réclamé.
  Permet d'assigner une tâche à un animal, ou à un humain du foyer qui n'a
  pas (encore) de compte.
* **`tasks.assigned_to_occupant_id`** : en plus de `tasks.assigned_to`
  (compte utilisateur), une tâche peut être assignée à un occupant non-
  utilisateur (ex. "Nourrir le chat").
* **`tasks.description`** et **`tasks.recurrence_days`** : texte libre et
  récurrence en jours (tâches ménagères répétitives).
* **`users`** : pas de colonne `password_hash` — Supabase Auth gère le mot
  de passe dans `auth.users`, jamais dupliqué dans `public.users` (le
  dupliquer serait un risque de sécurité sans bénéfice). `display_name` et
  `avatar_url` conservés du schéma d'origine.