import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeModule1721100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id"                  uuid PRIMARY KEY,
        "employee_code"       varchar(50)  NOT NULL,
        "first_name"          varchar(100) NOT NULL,
        "last_name"           varchar(100) NOT NULL,
        "email"               varchar(255) NOT NULL,
        "department"          varchar(128) NOT NULL,
        "designation"         varchar(100) NOT NULL,
        "manager_id"          uuid,
        "office_location"     varchar(128) NOT NULL,
        "hire_date"           date         NOT NULL,
        "employment_status"   varchar(32)  NOT NULL DEFAULT 'active',
        "termination_date"    date,
        "user_id"             uuid,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz  NOT NULL DEFAULT now(),

        CONSTRAINT "uq_employees_employee_code" UNIQUE ("employee_code"),
        CONSTRAINT "uq_employees_email"         UNIQUE ("email"),
        CONSTRAINT "uq_employees_user_id"       UNIQUE ("user_id"),
        CONSTRAINT "fk_employees_manager"        FOREIGN KEY ("manager_id")
          REFERENCES "employees"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_employees_user"           FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX "ix_employees_department"        ON "employees" ("department")`);
    await queryRunner.query(`CREATE INDEX "ix_employees_office_location"   ON "employees" ("office_location")`);
    await queryRunner.query(`CREATE INDEX "ix_employees_employment_status" ON "employees" ("employment_status")`);
    await queryRunner.query(`CREATE INDEX "ix_employees_manager_id"        ON "employees" ("manager_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "employees"`);
  }
}
