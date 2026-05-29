-- Supabase Database Schema for Duty Check Backend Admin Panel

-- Clean up existing conflicting tables to ensure type consistency (UUID)
DROP TABLE IF EXISTS user_assignments;
DROP TABLE IF EXISTS duty_points;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- 1. Create Admins Table
CREATE TABLE admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    login_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Users Table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    zipcode VARCHAR(20) NOT NULL,
    sai_connect_id VARCHAR(50) UNIQUE NOT NULL,
    photo_url TEXT,
    date_of_birth DATE NOT NULL,
    joining_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Duty Points Table
CREATE TABLE duty_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    main_point VARCHAR(150) UNIQUE NOT NULL,
    sub_points JSONB NOT NULL, -- Array of objects: [{"name": "...", "required_staff": 3}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create User Assignments Table
CREATE TABLE user_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duty_point_id UUID REFERENCES duty_points(id) ON DELETE CASCADE,
    assigned_sub_point VARCHAR(150) NOT NULL,
    sewa_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sewa_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sewa_state VARCHAR(100) NOT NULL DEFAULT 'Other',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, duty_point_id, assigned_sub_point, sewa_start_date, sewa_end_date) -- Avoid duplicate assignments per batch
);

-- Disable Row-Level Security (RLS) on all tables so backend can access them
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE duty_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments DISABLE ROW LEVEL SECURITY;

-- Seed Default Admin
-- Password hash here is bcrypt hash for 'admin@123'
-- ($2b$10$9GvS1H3sJ.oHl4M0u9E53ecR.cQ/Q2yD7z0.U67.VfA8D9fB2tMmq)
INSERT INTO admins (login_id, password_hash)
VALUES ('admin', '$2b$10$9GvS1H3sJ.oHl4M0u9E53ecR.cQ/Q2yD7z0.U67.VfA8D9fB2tMmq')
ON CONFLICT (login_id) 
DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 5. Create Sewa Periods Table
CREATE TABLE IF NOT EXISTS sewa_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(state, start_date, end_date)
);

ALTER TABLE sewa_periods DISABLE ROW LEVEL SECURITY;


