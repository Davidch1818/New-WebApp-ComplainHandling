-- =============================================================================
-- UAM Schema DDL for bmas_web_db
-- Run once during initial deployment.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS uam;

-- 1. Users
CREATE TABLE uam.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255),
    full_name       VARCHAR(255) NOT NULL,
    department      VARCHAR(100),
    password_hash   VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    must_change_pwd BOOLEAN NOT NULL DEFAULT TRUE,
    pwd_changed_at  TIMESTAMPTZ,
    pwd_min_age_at  TIMESTAMPTZ,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_at       TIMESTAMPTZ,
    active_token_id VARCHAR(36),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_by      VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      VARCHAR(50),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_user_id ON uam.users(user_id);

-- 2. Password History
CREATE TABLE uam.password_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES uam.users(id),
    pwd_hash    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pwd_history_user ON uam.password_history(user_id);

-- 3. Roles
CREATE TABLE uam.roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by  VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  VARCHAR(50),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Permissions
CREATE TABLE uam.permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Role ↔ Permission (many-to-many)
CREATE TABLE uam.role_permissions (
    role_id       UUID NOT NULL REFERENCES uam.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES uam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 6. User ↔ Role (many-to-many)
CREATE TABLE uam.user_roles (
    user_id UUID NOT NULL REFERENCES uam.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES uam.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 7. Audit Log (immutable, append-only)
CREATE TABLE uam.audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id   VARCHAR(50),
    detail      JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_actor ON uam.audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON uam.audit_log(created_at);
