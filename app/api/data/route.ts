import { getD1 } from "../../../db";

type BreakItemInput = {
  productId?: number | null;
  productName?: string;
  quantityKg?: number;
  cost?: number;
};

const seedProducts = [
  "ACÉM BOVINO COM OSSO",
  "CHULETA BOVINA",
  "COSTELA BOVINA",
  "FILÉ DUPLO BOVINO FATIADO - BANDEJA",
  "LAGARTO BOVINO FRESCO BIFE FAMÍLIA - BANDEJA",
  "OSSO BUCO BOVINO CARNE FRESCA - BANDEJA",
  "PALETA BOVINA COM OSSO",
  "PEITO BOVINO COM OSSO",
];

const seedItems = [
  [1, seedProducts[0], 1.8, 46.55],
  [2, seedProducts[1], 2.6, 81.48],
  [3, seedProducts[2], 2.09, 49.55],
  [4, seedProducts[3], 4.8, 235.44],
  [5, seedProducts[4], 0.478, 17.74],
  [6, seedProducts[5], 1.6, 39.16],
  [7, seedProducts[6], 0.398, 10.29],
  [8, seedProducts[7], 6.2, 160.35],
] as const;

async function ensureDatabase() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'Bovina',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS break_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      requisition TEXT NOT NULL DEFAULT '',
      employee TEXT NOT NULL,
      total_kg REAL NOT NULL,
      total_cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS break_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (report_id) REFERENCES break_reports(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS time_offs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Semanal',
      status TEXT NOT NULL DEFAULT 'Solicitada',
      coverage TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS break_reports_date_idx ON break_reports(date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS break_items_report_idx ON break_items(report_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS time_offs_date_idx ON time_offs(date)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS total FROM products").first<{ total: number }>();
  if ((count?.total ?? 0) === 0) {
    await db.batch(
      seedProducts.map((name, index) =>
        db.prepare("INSERT INTO products (id, name, category, active) VALUES (?, ?, 'Bovina', 1)")
          .bind(index + 1, name),
      ),
    );
  }

  const reportCount = await db.prepare("SELECT COUNT(*) AS total FROM break_reports").first<{ total: number }>();
  if ((reportCount?.total ?? 0) === 0) {
    await db.prepare(
      "INSERT OR IGNORE INTO break_reports (id, date, requisition, employee, total_kg, total_cost) VALUES (1, ?, ?, ?, ?, ?)",
    ).bind("2026-06-25", "28076039", "Fernanda Almeida", 19.966, 640.56).run();
    await db.batch(
      seedItems.map(([productId, productName, quantityKg, cost]) =>
        db.prepare(
          "INSERT INTO break_items (report_id, product_id, product_name, quantity_kg, cost) VALUES (1, ?, ?, ?, ?)",
        ).bind(productId, productName, quantityKg, cost),
      ),
    );
  }
}

async function loadState() {
  const db = getD1();
  const [products, reports, items, timeOffs] = await Promise.all([
    db.prepare("SELECT id, name, category, active FROM products WHERE active = 1 ORDER BY name").all(),
    db.prepare(
      "SELECT id, date, requisition, employee, total_kg AS totalKg, total_cost AS totalCost, created_at AS createdAt FROM break_reports ORDER BY date DESC, id DESC",
    ).all(),
    db.prepare(
      "SELECT id, report_id AS reportId, product_id AS productId, product_name AS productName, quantity_kg AS quantityKg, cost FROM break_items ORDER BY id",
    ).all(),
    db.prepare(
      "SELECT id, employee, date, type, status, coverage, notes, created_at AS createdAt FROM time_offs ORDER BY date, id",
    ).all(),
  ]);

  const itemRows = items.results as Array<Record<string, unknown>>;
  const reportRows = (reports.results as Array<Record<string, unknown>>).map((report) => ({
    ...report,
    items: itemRows.filter((item) => item.reportId === report.id),
  }));

  return {
    products: products.results,
    reports: reportRows,
    timeOffs: timeOffs.results,
  };
}

export async function GET() {
  try {
    await ensureDatabase();
    return Response.json(await loadState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const db = getD1();

    if (action === "create_break") {
      const date = String(body.date ?? "").trim();
      const requisition = String(body.requisition ?? "").trim();
      const employee = String(body.employee ?? "").trim();
      const rawItems = Array.isArray(body.items) ? body.items as BreakItemInput[] : [];
      const items = rawItems
        .map((item) => ({
          productId: Number(item.productId) || null,
          productName: String(item.productName ?? "").trim(),
          quantityKg: Number(item.quantityKg) || 0,
          cost: Number(item.cost) || 0,
        }))
        .filter((item) => item.productName && item.quantityKg > 0);

      if (!date || !employee || items.length === 0) {
        return Response.json({ error: "Preencha data, funcionária e ao menos uma carne com peso." }, { status: 400 });
      }

      const totalKg = items.reduce((sum, item) => sum + item.quantityKg, 0);
      const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
      const report = await db.prepare(
        "INSERT INTO break_reports (date, requisition, employee, total_kg, total_cost) VALUES (?, ?, ?, ?, ?) RETURNING id",
      ).bind(date, requisition, employee, totalKg, totalCost).first<{ id: number }>();
      if (!report?.id) throw new Error("Não foi possível criar o lançamento.");

      await db.batch(
        items.map((item) =>
          db.prepare(
            "INSERT INTO break_items (report_id, product_id, product_name, quantity_kg, cost) VALUES (?, ?, ?, ?, ?)",
          ).bind(report.id, item.productId, item.productName, item.quantityKg, item.cost),
        ),
      );
    } else if (action === "delete_break") {
      const id = Number(body.id);
      if (!id) return Response.json({ error: "Lançamento inválido." }, { status: 400 });
      await db.batch([
        db.prepare("DELETE FROM break_items WHERE report_id = ?").bind(id),
        db.prepare("DELETE FROM break_reports WHERE id = ?").bind(id),
      ]);
    } else if (action === "create_timeoff") {
      const employee = String(body.employee ?? "").trim();
      const date = String(body.date ?? "").trim();
      const type = String(body.type ?? "Semanal").trim();
      const coverage = String(body.coverage ?? "").trim();
      const notes = String(body.notes ?? "").trim();
      if (!employee || !date) {
        return Response.json({ error: "Preencha funcionária e data da folga." }, { status: 400 });
      }
      await db.prepare(
        "INSERT INTO time_offs (employee, date, type, status, coverage, notes) VALUES (?, ?, ?, 'Solicitada', ?, ?)",
      ).bind(employee, date, type, coverage, notes).run();
    } else if (action === "move_timeoff") {
      const id = Number(body.id);
      const status = String(body.status ?? "");
      if (!id || !["Solicitada", "Confirmada", "Realizada"].includes(status)) {
        return Response.json({ error: "Movimentação inválida." }, { status: 400 });
      }
      await db.prepare("UPDATE time_offs SET status = ? WHERE id = ?").bind(status, id).run();
    } else if (action === "delete_timeoff") {
      const id = Number(body.id);
      if (!id) return Response.json({ error: "Folga inválida." }, { status: 400 });
      await db.prepare("DELETE FROM time_offs WHERE id = ?").bind(id).run();
    } else if (action === "create_product") {
      const name = String(body.name ?? "").trim().toUpperCase();
      if (!name) return Response.json({ error: "Informe o nome da carne." }, { status: 400 });
      await db.prepare(
        "INSERT OR IGNORE INTO products (name, category, active) VALUES (?, 'Bovina', 1)",
      ).bind(name).run();
    } else {
      return Response.json({ error: "Ação não reconhecida." }, { status: 400 });
    }

    return Response.json(await loadState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar.";
    return Response.json({ error: message }, { status: 500 });
  }
}
