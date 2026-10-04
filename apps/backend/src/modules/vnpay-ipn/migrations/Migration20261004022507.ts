import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261004022507 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vnpay_ipn" drop constraint if exists "vnpay_ipn_txn_ref_transaction_no_unique";`);
    this.addSql(`create table if not exists "vnpay_ipn" ("id" text not null, "txn_ref" text not null, "transaction_no" text not null, "response_code" text not null, "amount_vnd" integer not null, "order_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vnpay_ipn_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vnpay_ipn_deleted_at" ON "vnpay_ipn" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vnpay_ipn_txn_ref_transaction_no_unique" ON "vnpay_ipn" ("txn_ref", "transaction_no") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vnpay_ipn" cascade;`);
  }

}
