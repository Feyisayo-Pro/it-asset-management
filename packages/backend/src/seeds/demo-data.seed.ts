import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { dataSourceOptions } from '../config/data-source';

const ROLE_IDS = {
  SUPER_ADMIN: '11111111-0000-0000-0000-000000000001',
  STORES_OFFICER: '11111111-0000-0000-0000-000000000002',
  IT_REP: '11111111-0000-0000-0000-000000000003',
  PEOPLE_CULTURE: '11111111-0000-0000-0000-000000000004',
  EMPLOYEE: '11111111-0000-0000-0000-000000000005',
};

async function seed() {
  const ds = new DataSource({ ...dataSourceOptions } as any);
  await ds.initialize();
  const qr = ds.createQueryRunner();

  try {
    const password = await argon2.hash('Password123!');

    // Create demo users (one per role)
    const users = [
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'stores@demo.com', first: 'James', last: 'Okonkwo', role: ROLE_IDS.STORES_OFFICER },
      { id: 'aaaaaaaa-0000-0000-0000-000000000002', email: 'itrep@demo.com', first: 'Funke', last: 'Adeyemi', role: ROLE_IDS.IT_REP },
      { id: 'aaaaaaaa-0000-0000-0000-000000000003', email: 'pc@demo.com', first: 'Chioma', last: 'Nwosu', role: ROLE_IDS.PEOPLE_CULTURE },
      { id: 'aaaaaaaa-0000-0000-0000-000000000004', email: 'employee1@demo.com', first: 'Tunde', last: 'Bakare', role: ROLE_IDS.EMPLOYEE },
      { id: 'aaaaaaaa-0000-0000-0000-000000000005', email: 'employee2@demo.com', first: 'Aisha', last: 'Mohammed', role: ROLE_IDS.EMPLOYEE },
    ];

    for (const u of users) {
      await qr.query(
        `INSERT INTO users (id, email, password_hash, role_id, first_name, last_name, is_active, must_change_password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, password, u.role, u.first, u.last],
      );
    }
    console.log('✓ Created 5 demo users');

    // Create demo employees
    const employees = [
      { id: 'bbbbbbbb-0000-0000-0000-000000000001', code: 'EMP001', first: 'Tunde', last: 'Bakare', email: 'employee1@demo.com', dept: 'Engineering', desig: 'Software Engineer', office: 'Lagos HQ', userId: 'aaaaaaaa-0000-0000-0000-000000000004' },
      { id: 'bbbbbbbb-0000-0000-0000-000000000002', code: 'EMP002', first: 'Aisha', last: 'Mohammed', email: 'employee2@demo.com', dept: 'Marketing', desig: 'Marketing Manager', office: 'Lagos HQ', userId: 'aaaaaaaa-0000-0000-0000-000000000005' },
      { id: 'bbbbbbbb-0000-0000-0000-000000000003', code: 'EMP003', first: 'Emeka', last: 'Obi', email: 'emeka.obi@company.com', dept: 'Finance', desig: 'Financial Analyst', office: 'Abuja Branch', userId: null },
      { id: 'bbbbbbbb-0000-0000-0000-000000000004', code: 'EMP004', first: 'Kemi', last: 'Adeola', email: 'kemi.adeola@company.com', dept: 'Engineering', desig: 'Product Designer', office: 'Lagos HQ', userId: null },
      { id: 'bbbbbbbb-0000-0000-0000-000000000005', code: 'EMP005', first: 'Yusuf', last: 'Ibrahim', email: 'yusuf.ibrahim@company.com', dept: 'Operations', desig: 'Operations Lead', office: 'Port Harcourt', userId: null },
      { id: 'bbbbbbbb-0000-0000-0000-000000000006', code: 'EMP006', first: 'Grace', last: 'Okoro', email: 'grace.okoro@company.com', dept: 'HR', desig: 'HR Coordinator', office: 'Lagos HQ', userId: null },
      { id: 'bbbbbbbb-0000-0000-0000-000000000007', code: 'EMP007', first: 'Daniel', last: 'Eze', email: 'daniel.eze@company.com', dept: 'Engineering', desig: 'DevOps Engineer', office: 'Lagos HQ', userId: null },
      { id: 'bbbbbbbb-0000-0000-0000-000000000008', code: 'EMP008', first: 'Fatima', last: 'Bello', email: 'fatima.bello@company.com', dept: 'Sales', desig: 'Account Executive', office: 'Abuja Branch', userId: null },
    ];

    for (const e of employees) {
      await qr.query(
        `INSERT INTO employees (id, employee_code, first_name, last_name, email, department, designation, office_location, hire_date, employment_status, user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '2024-01-15', 'Active', $9, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [e.id, e.code, e.first, e.last, e.email, e.dept, e.desig, e.office, e.userId],
      );
    }
    console.log('✓ Created 8 demo employees');

    // Create demo vendors
    const vendors = [
      { id: 'cccccccc-0000-0000-0000-000000000001', name: 'TechServe Solutions', contact: 'John Doe', email: 'sales@techserve.ng', phone: '+234-801-234-5678', address: '15 Lekki Phase 1, Lagos' },
      { id: 'cccccccc-0000-0000-0000-000000000002', name: 'DigiParts Nigeria', contact: 'Ada Chen', email: 'info@digiparts.ng', phone: '+234-802-345-6789', address: '22 Garki Area 1, Abuja' },
      { id: 'cccccccc-0000-0000-0000-000000000003', name: 'CloudNet Africa', contact: 'Samuel Owusu', email: 'procurement@cloudnet.africa', phone: '+234-803-456-7890', address: '8 Victoria Island, Lagos' },
    ];

    for (const v of vendors) {
      await qr.query(
        `INSERT INTO vendors (id, name, contact_person, email, phone, address, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [v.id, v.name, v.contact, v.email, v.phone, v.address],
      );
    }
    console.log('✓ Created 3 demo vendors');

    // Create demo assets
    const assets = [
      { id: 'dddddddd-0000-0000-0000-000000000001', tag: 'LAP-2024-001', type: 'Laptop', brand: 'Dell', model: 'Latitude 5540', serial: 'DL5540-A1B2C3', status: 'Assigned', assignee: 'bbbbbbbb-0000-0000-0000-000000000001' },
      { id: 'dddddddd-0000-0000-0000-000000000002', tag: 'LAP-2024-002', type: 'Laptop', brand: 'HP', model: 'EliteBook 840 G10', serial: 'HP840G-D4E5F6', status: 'Assigned', assignee: 'bbbbbbbb-0000-0000-0000-000000000002' },
      { id: 'dddddddd-0000-0000-0000-000000000003', tag: 'LAP-2024-003', type: 'Laptop', brand: 'Lenovo', model: 'ThinkPad T14s', serial: 'LN14S-G7H8I9', status: 'In Stock', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000004', tag: 'MON-2024-001', type: 'Monitor', brand: 'Dell', model: 'P2422H', serial: 'DLMON-J1K2L3', status: 'In Stock', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000005', tag: 'MON-2024-002', type: 'Monitor', brand: 'Samsung', model: 'S24R350', serial: 'SSMON-M4N5O6', status: 'Assigned', assignee: 'bbbbbbbb-0000-0000-0000-000000000003' },
      { id: 'dddddddd-0000-0000-0000-000000000006', tag: 'PHN-2024-001', type: 'Phone', brand: 'Apple', model: 'iPhone 15', serial: 'APIPH-P7Q8R9', status: 'In Stock', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000007', tag: 'LAP-2024-004', type: 'Laptop', brand: 'Dell', model: 'Latitude 7440', serial: 'DL7440-S1T2U3', status: 'Under Repair', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000008', tag: 'TAB-2024-001', type: 'Tablet', brand: 'Apple', model: 'iPad Pro 12.9', serial: 'APTAB-V4W5X6', status: 'In Stock', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000009', tag: 'LAP-2024-005', type: 'Laptop', brand: 'HP', model: 'ProBook 450 G10', serial: 'HP450-Y7Z8A9', status: 'Disposed', assignee: null },
      { id: 'dddddddd-0000-0000-0000-000000000010', tag: 'DSK-2024-001', type: 'Desktop', brand: 'Lenovo', model: 'ThinkCentre M70q', serial: 'LNDES-B1C2D3', status: 'In Stock', assignee: null },
    ];

    for (const a of assets) {
      await qr.query(
        `INSERT INTO assets (id, asset_tag, device_type, brand, model, serial_number, status, current_holder_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.tag, a.type, a.brand, a.model, a.serial, a.status, a.assignee],
      );
    }
    console.log('✓ Created 10 demo assets');

    // Create demo master data
    const departments = ['Engineering', 'Marketing', 'Finance', 'HR', 'Operations', 'Sales', 'Legal'];
    const offices = ['Lagos HQ', 'Abuja Branch', 'Port Harcourt', 'Ibadan Office'];
    const deviceTypes = ['Laptop', 'Monitor', 'Phone', 'Tablet', 'Desktop', 'Printer', 'Router'];
    const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Microsoft', 'Cisco'];

    for (const d of departments) {
      await qr.query(
        `INSERT INTO master_data_departments (id, name, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, true, now(), now())
         ON CONFLICT DO NOTHING`, [d],
      );
    }
    for (const o of offices) {
      await qr.query(
        `INSERT INTO master_data_offices (id, name, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, true, now(), now())
         ON CONFLICT DO NOTHING`, [o],
      );
    }
    for (const t of deviceTypes) {
      await qr.query(
        `INSERT INTO master_data_device_types (id, name, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, true, now(), now())
         ON CONFLICT DO NOTHING`, [t],
      );
    }
    for (const b of brands) {
      await qr.query(
        `INSERT INTO master_data_brands (id, name, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, true, now(), now())
         ON CONFLICT DO NOTHING`, [b],
      );
    }
    console.log('✓ Created master data (departments, offices, device types, brands)');

    // Create demo acquisition
    await qr.query(
      `INSERT INTO acquisitions (id, vendor_id, invoice_number, purchase_date, warranty_months, unit_cost_cents, currency, quantity, notes, created_by, created_at, updated_at)
       VALUES
         ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'INV-2024-001', '2024-03-15', 36, 125000, 'USD', 5, 'Dell laptop batch Q1 2024', (SELECT id FROM users WHERE email='admin@iam-platform.com' LIMIT 1), now(), now()),
         ('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 'INV-2024-002', '2024-04-20', 24, 35000, 'USD', 10, 'Monitor procurement', (SELECT id FROM users WHERE email='admin@iam-platform.com' LIMIT 1), now(), now())
       ON CONFLICT (id) DO NOTHING`,
    );
    console.log('✓ Created 2 demo acquisitions');

    console.log('\n🎉 Demo data seeded successfully!\n');
    console.log('Demo login credentials (all passwords: Password123!):');
    console.log('  Super Admin:     admin@iam-platform.com / SecureAdmin2026x');
    console.log('  Stores Officer:  stores@demo.com');
    console.log('  IT Rep:          itrep@demo.com');
    console.log('  People & Culture: pc@demo.com');
    console.log('  Employee:        employee1@demo.com');
    console.log('  Employee:        employee2@demo.com');

  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seed();
