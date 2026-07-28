import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category").notNull().default("Bovina"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const breakReports = sqliteTable("break_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  requisition: text("requisition").notNull().default(""),
  employee: text("employee").notNull(),
  totalKg: real("total_kg").notNull(),
  totalCost: real("total_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const breakItems = sqliteTable("break_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull().references(() => breakReports.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  quantityKg: real("quantity_kg").notNull(),
  cost: real("cost").notNull().default(0),
});

export const timeOffs = sqliteTable("time_offs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employee: text("employee").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("Semanal"),
  status: text("status").notNull().default("Solicitada"),
  coverage: text("coverage").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  store: text("store").notNull(),
  username: text("username").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
