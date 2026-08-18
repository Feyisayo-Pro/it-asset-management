import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Workflow Engine schema.
 *
 * - workflow_definitions: named, versioned workflows (key + version).
 * - workflow_stages: nodes of the graph.
 * - workflow_transitions_config: edges of the graph (allowed from→to
 *   with the role, validation, and side-effects that fire).
 * - workflow_instances: a single execution of a definition against a
 *   subject entity (subject_type + subject_id).
 * - workflow_instance_transitions: append-only audit of every actual
 *   transition taken on an instance.
 *
 * This schema is deliberately domain-agnostic — Allocation, Return,
 * Assessment routing, etc. all instantiate WorkflowInstances against
 * their own subjects without adding tables.
 */
export class AddWorkflowEngine1720400000000 implements MigrationInterface {
  name = 'AddWorkflowEngine1720400000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "workflow_definitions" (
        "id" uuid PRIMARY KEY,
        "key" varchar(64) NOT NULL,
        "version" int NOT NULL DEFAULT 1,
        "name" varchar(128) NOT NULL,
        "description" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "initial_state" varchar(64) NOT NULL,
        "final_states" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_workflow_definitions_key_version" UNIQUE ("key", "version")
      )
    `);

    await qr.query(`
      CREATE TABLE "workflow_stages" (
        "id" uuid PRIMARY KEY,
        "definition_id" uuid NOT NULL REFERENCES "workflow_definitions"("id") ON DELETE CASCADE,
        "state" varchar(64) NOT NULL,
        "label" varchar(128) NOT NULL,
        "required_roles" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "sla_minutes" int,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "uq_workflow_stages_state" UNIQUE ("definition_id", "state")
      )
    `);

    await qr.query(`
      CREATE TABLE "workflow_transitions_config" (
        "id" uuid PRIMARY KEY,
        "definition_id" uuid NOT NULL REFERENCES "workflow_definitions"("id") ON DELETE CASCADE,
        "from_state" varchar(64) NOT NULL,
        "to_state" varchar(64) NOT NULL,
        "action_name" varchar(64) NOT NULL,
        "required_roles" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "requires_signature" boolean NOT NULL DEFAULT false,
        "requires_evidence" boolean NOT NULL DEFAULT false,
        "requires_comment" boolean NOT NULL DEFAULT false,
        "notification_recipients" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "audit_action" varchar(128) NOT NULL,
        CONSTRAINT "uq_workflow_transitions_config" UNIQUE ("definition_id", "from_state", "action_name")
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_workflow_transitions_config_def" ON "workflow_transitions_config" ("definition_id", "from_state")`,
    );

    await qr.query(`
      CREATE TABLE "workflow_instances" (
        "id" uuid PRIMARY KEY,
        "definition_id" uuid NOT NULL REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT,
        "subject_type" varchar(64) NOT NULL,
        "subject_id" varchar(64) NOT NULL,
        "current_state" varchar(64) NOT NULL,
        "started_by_user_id" uuid,
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "current_stage_entered_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "bypassed" boolean NOT NULL DEFAULT false,
        "bypassed_by_user_id" uuid,
        "bypass_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_workflow_instances_subject" UNIQUE ("subject_type", "subject_id")
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_workflow_instances_state" ON "workflow_instances" ("definition_id", "current_state")`,
    );

    await qr.query(`
      CREATE TABLE "workflow_instance_transitions" (
        "id" uuid PRIMARY KEY,
        "instance_id" uuid NOT NULL REFERENCES "workflow_instances"("id") ON DELETE CASCADE,
        "from_state" varchar(64) NOT NULL,
        "to_state" varchar(64) NOT NULL,
        "action_name" varchar(64) NOT NULL,
        "actor_user_id" uuid,
        "occurred_at" timestamptz NOT NULL DEFAULT now(),
        "signature_name" varchar(255),
        "signature_ip" varchar(64),
        "evidence_file_ids" jsonb,
        "comment" text
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_workflow_transitions_instance" ON "workflow_instance_transitions" ("instance_id", "occurred_at")`,
    );

    // Workflow permissions.
    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-00000000000c', 'workflow:read', 'Read workflow definitions and instances'),
        ('22222222-0000-0000-0000-00000000000d', 'workflow:configure', 'Create/edit workflow definitions'),
        ('22222222-0000-0000-0000-00000000000e', 'workflow:transition', 'Transition a workflow instance'),
        ('22222222-0000-0000-0000-00000000000f', 'workflow:bypass', 'Bypass / expedite a workflow instance')`,
    );
    // Grant read + configure + bypass to SUPER_ADMIN; every other role
    // gets read + transition (they can act on instances if their role
    // matches the stage requirement).
    const perms = [
      '22222222-0000-0000-0000-00000000000c',
      '22222222-0000-0000-0000-00000000000d',
      '22222222-0000-0000-0000-00000000000e',
      '22222222-0000-0000-0000-00000000000f',
    ];
    for (const pid of perms) {
      await qr.query(
        `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES
          ('11111111-0000-0000-0000-000000000001', $1)
         ON CONFLICT DO NOTHING`,
        [pid],
      );
    }
    const readAndTransition = [
      '22222222-0000-0000-0000-00000000000c',
      '22222222-0000-0000-0000-00000000000e',
    ];
    const otherRoles = [
      '11111111-0000-0000-0000-000000000002', // STORES_OFFICER
      '11111111-0000-0000-0000-000000000003', // IT_REP
      '11111111-0000-0000-0000-000000000004', // PEOPLE_CULTURE
      '11111111-0000-0000-0000-000000000005', // EMPLOYEE
    ];
    for (const rid of otherRoles) {
      for (const pid of readAndTransition) {
        await qr.query(
          `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [rid, pid],
        );
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const perms = [
      '22222222-0000-0000-0000-00000000000c',
      '22222222-0000-0000-0000-00000000000d',
      '22222222-0000-0000-0000-00000000000e',
      '22222222-0000-0000-0000-00000000000f',
    ];
    for (const pid of perms) {
      await qr.query(`DELETE FROM "role_permissions" WHERE "permission_id" = $1`, [pid]);
      await qr.query(`DELETE FROM "permissions" WHERE "id" = $1`, [pid]);
    }
    await qr.query(`DROP TABLE IF EXISTS "workflow_instance_transitions"`);
    await qr.query(`DROP TABLE IF EXISTS "workflow_instances"`);
    await qr.query(`DROP TABLE IF EXISTS "workflow_transitions_config"`);
    await qr.query(`DROP TABLE IF EXISTS "workflow_stages"`);
    await qr.query(`DROP TABLE IF EXISTS "workflow_definitions"`);
  }
}
