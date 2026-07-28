"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BreakDistributionChart, BreakTrendChart, ProductBars } from "./components/BreakCharts";
import TimeOffPlanner from "./components/TimeOffPlanner";
import { supabase } from "./lib/supabase";

type Product = { id: number; name: string; category: string; active: number };
type BreakItem = {
  id: number;
  reportId: number;
  productId: number | null;
  productName: string;
  quantityKg: number;
  cost: number;
};
type BreakReport = {
  id: number;
  date: string;
  requisition: string;
  employee: string;
  totalKg: number;
  totalCost: number;
  createdAt: string;
  items: BreakItem[];
};
type TimeOff = {
  id: number;
  employee: string;
  date: string;
  type: string;
  status: "Solicitada" | "Confirmada" | "Realizada";
  coverage: string;
  notes: string;
};
type AppData = { products: Product[]; reports: BreakReport[]; timeOffs: TimeOff[] };
type Tab = "dashboard" | "quebras" | "analises" | "folgas" | "cadastros";
type DraftItem = { key: number; productId: number; productName: string; quantityKg: number; cost: number };

const employeeName = "Vanusa Alves de Oliveira";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const weight = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const weekDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
function safeDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string) {
  return dateLabel.format(safeDate(value)).replace(".", "");
}

function monthName(value: string) {
  const [year, month] = value.split("-").map(Number);
  return monthLabel.format(new Date(year, month - 1, 1));
}

function shortProduct(value: string) {
  return value
    .replace(" BOVINO", "")
    .replace(" BOVINA", "")
    .replace(" CARNE FRESCA", "")
    .replace(" FATIADO", "")
    .replace(" - BANDEJA", "");
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>✓</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginDraft, setLoginDraft] = useState({ username: "vanusa.alves", password: "" });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [month, setMonth] = useState("2026-06");
  const [timeOffAnchor, setTimeOffAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [breakModal, setBreakModal] = useState(false);
  const [timeOffModal, setTimeOffModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [breakDate, setBreakDate] = useState(new Date().toISOString().slice(0, 10));
  const [requisition, setRequisition] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    { key: 1, productId: 0, productName: "", quantityKg: 0, cost: 0 },
  ]);
  const [timeOffDraft, setTimeOffDraft] = useState({
    employee: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Semanal",
    coverage: "",
    notes: "",
  });
  const [newProduct, setNewProduct] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResult, reportsResult, itemsResult, timeOffsResult] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("name"),
        supabase.from("break_reports").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("break_items").select("*").order("id"),
        supabase.from("time_offs").select("*").order("date").order("employee"),
      ]);
      const queryError = productsResult.error || reportsResult.error || itemsResult.error || timeOffsResult.error;
      if (queryError) throw queryError;

      const items = (itemsResult.data ?? []).map((item) => ({
        id: item.id,
        reportId: item.report_id,
        productId: item.product_id,
        productName: item.product_name,
        quantityKg: Number(item.quantity_kg),
        cost: Number(item.cost),
      }));
      const result: AppData = {
        products: (productsResult.data ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          active: product.active ? 1 : 0,
        })),
        reports: (reportsResult.data ?? []).map((report) => ({
          id: report.id,
          date: report.date,
          requisition: report.requisition,
          employee: report.employee,
          totalKg: Number(report.total_kg),
          totalCost: Number(report.total_cost),
          createdAt: report.created_at,
          items: items.filter((item) => item.reportId === report.id),
        })),
        timeOffs: (timeOffsResult.data ?? []).map((item) => ({
          id: item.id,
          employee: item.employee,
          date: item.date,
          type: item.type,
          status: item.status,
          coverage: item.coverage,
          notes: item.notes,
        })),
      };
      setData(result);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      setAuthenticated(Boolean(sessionData.session));
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!authenticated) {
      return;
    }
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [authReady, authenticated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const postAction = async (payload: Record<string, unknown>, message: string) => {
    setSaving(true);
    try {
      const action = String(payload.action);
      if (action === "create_break") {
        const items = payload.items as DraftItem[];
        const totalKg = items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
        const totalCost = items.reduce((sum, item) => sum + Number(item.cost), 0);
        const { data: report, error: reportError } = await supabase
          .from("break_reports")
          .insert({
            date: payload.date,
            requisition: payload.requisition,
            employee: payload.employee,
            total_kg: totalKg,
            total_cost: totalCost,
          })
          .select("id")
          .single();
        if (reportError) throw reportError;
        const { error: itemsError } = await supabase.from("break_items").insert(
          items.map((item) => ({
            report_id: report.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity_kg: Number(item.quantityKg),
            cost: Number(item.cost),
          })),
        );
        if (itemsError) {
          await supabase.from("break_reports").delete().eq("id", report.id);
          throw itemsError;
        }
      } else if (action === "delete_break") {
        const { error: actionError } = await supabase.from("break_reports").delete().eq("id", payload.id);
        if (actionError) throw actionError;
      } else if (action === "create_timeoff") {
        const { error: actionError } = await supabase.from("time_offs").insert({
          employee: payload.employee,
          date: payload.date,
          type: payload.type,
          status: "Solicitada",
          coverage: payload.coverage,
          notes: payload.notes,
        });
        if (actionError) throw actionError;
      } else if (action === "move_timeoff") {
        const { error: actionError } = await supabase.from("time_offs").update({ status: payload.status }).eq("id", payload.id);
        if (actionError) throw actionError;
      } else if (action === "reschedule_timeoff") {
        const { error: actionError } = await supabase.from("time_offs").update({ date: payload.date }).eq("id", payload.id);
        if (actionError) throw actionError;
      } else if (action === "delete_timeoff") {
        const { error: actionError } = await supabase.from("time_offs").delete().eq("id", payload.id);
        if (actionError) throw actionError;
      } else if (action === "create_product") {
        const { error: actionError } = await supabase.from("products").insert({ name: payload.name, category: "Bovina" });
        if (actionError) throw actionError;
      }
      await loadData();
      setToast(message);
      setError("");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const monthReports = useMemo(
    () => (data?.reports ?? []).filter((report) => report.date.startsWith(month)),
    [data, month],
  );

  const productSummary = useMemo(() => {
    const summary = new Map<string, { kg: number; cost: number; days: Set<string> }>();
    monthReports.forEach((report) => {
      report.items.forEach((item) => {
        const current = summary.get(item.productName) ?? { kg: 0, cost: 0, days: new Set<string>() };
        current.kg += Number(item.quantityKg);
        current.cost += Number(item.cost);
        current.days.add(report.date);
        summary.set(item.productName, current);
      });
    });
    return [...summary.entries()]
      .map(([name, values]) => ({ name, kg: values.kg, cost: values.cost, days: values.days.size }))
      .sort((a, b) => b.kg - a.kg);
  }, [monthReports]);

  const dailySummary = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const days = new Date(year, monthNumber, 0).getDate();
    const totals = new Map<string, number>();
    monthReports.forEach((report) => totals.set(report.date, (totals.get(report.date) ?? 0) + Number(report.totalKg)));
    return Array.from({ length: days }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return { label: day, value: totals.get(`${month}-${day}`) ?? 0 };
    });
  }, [month, monthReports]);

  const totalKg = monthReports.reduce((sum, report) => sum + Number(report.totalKg), 0);
  const totalCost = monthReports.reduce((sum, report) => sum + Number(report.totalCost), 0);
  const activeDays = new Set(monthReports.map((report) => report.date)).size;
  const worstDay = [...new Map(
    monthReports.map((report) => [
      report.date,
      monthReports.filter((entry) => entry.date === report.date).reduce((sum, entry) => sum + Number(entry.totalKg), 0),
    ]),
  ).entries()].sort((a, b) => b[1] - a[1])[0];

  const addDraftItem = () => {
    setDraftItems((current) => [
      ...current,
      { key: Date.now(), productId: 0, productName: "", quantityKg: 0, cost: 0 },
    ]);
  };

  const updateDraftItem = (key: number, field: keyof DraftItem, value: string | number) => {
    setDraftItems((current) => current.map((item) => {
      if (item.key !== key) return item;
      if (field === "productId") {
        const product = data?.products.find((entry) => entry.id === Number(value));
        return { ...item, productId: Number(value), productName: product?.name ?? "" };
      }
      return { ...item, [field]: value };
    }));
  };

  const submitBreak = async (event: FormEvent) => {
    event.preventDefault();
    const success = await postAction({
      action: "create_break",
      date: breakDate,
      requisition,
      employee: employeeName,
      items: draftItems,
    }, "Quebra registrada e dashboard atualizado.");
    if (success) {
      setBreakModal(false);
      setRequisition("");
      setDraftItems([{ key: Date.now(), productId: 0, productName: "", quantityKg: 0, cost: 0 }]);
      setMonth(breakDate.slice(0, 7));
    }
  };

  const submitTimeOff = async (event: FormEvent) => {
    event.preventDefault();
    const success = await postAction({
      action: "create_timeoff",
      ...timeOffDraft,
    }, "Folga adicionada ao quadro.");
    if (success) {
      setTimeOffModal(false);
      setTimeOffAnchor(timeOffDraft.date);
      setTimeOffDraft((current) => ({ ...current, employee: "", coverage: "", notes: "" }));
    }
  };

  const openTimeOffModal = (date = timeOffAnchor) => {
    setTimeOffDraft((current) => ({ ...current, date }));
    setTimeOffModal(true);
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const email = loginDraft.username.includes("@")
        ? loginDraft.username
        : `${loginDraft.username.trim().toLowerCase()}@cortecerto.app`;
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: loginDraft.password,
      });
      if (loginError) throw new Error("Usuário ou senha incorretos.");
      setLoginDraft((current) => ({ ...current, password: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setData(null);
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    const success = await postAction({ action: "create_product", name: newProduct }, "Carne adicionada ao cadastro.");
    if (success) {
      setNewProduct("");
      setProductModal(false);
    }
  };

  const navItems: Array<{ id: Tab; icon: string; label: string }> = [
    { id: "dashboard", icon: "▦", label: "Visão geral" },
    { id: "quebras", icon: "◫", label: "Quebras diárias" },
    { id: "analises", icon: "↗", label: "Análises mensais" },
    { id: "folgas", icon: "□", label: "Folgas" },
    { id: "cadastros", icon: "☷", label: "Carnes" },
  ];

  const goTo = (next: Tab) => {
    setTab(next);
    setNavOpen(false);
  };

  if (!authReady) {
    return <div className="login-loading"><div className="loader" /><span>Preparando o CorteCerto…</span></div>;
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-brand-panel">
          <div className="login-brand"><span>CC</span><strong>CorteCerto</strong></div>
          <div>
            <p className="eyebrow">Fort Atacadista • Barreiros</p>
            <h1>O controle do açougue, em um só lugar.</h1>
            <p>Quebras diárias, gráficos mensais e escala de folgas organizada para a equipe.</p>
          </div>
          <div className="login-feature-grid">
            <div><strong>Quebras</strong><span>Peso por carne e por período</span></div>
            <div><strong>Folgas</strong><span>Visão diária, semanal e mensal</span></div>
          </div>
        </section>
        <section className="login-form-panel">
          <form onSubmit={submitLogin}>
            <span className="employee-avatar login-avatar">VA</span>
            <p className="eyebrow">Acesso da encarregada</p>
            <h2>Olá, Vanusa</h2>
            <p>Entre para acessar os dados do açougue de Barreiros.</p>
            {error && <div className="login-error">{error}</div>}
            <label>Usuário<input required autoComplete="username" value={loginDraft.username} onChange={(event) => setLoginDraft({ ...loginDraft, username: event.target.value })} /></label>
            <label>Senha<input required type="password" autoComplete="current-password" value={loginDraft.password} onChange={(event) => setLoginDraft({ ...loginDraft, password: event.target.value })} placeholder="Digite sua senha" /></label>
            <button className="primary" disabled={saving}>{saving ? "Entrando…" : "Entrar no sistema"}</button>
            <small>Acesso exclusivo da gestão do açougue.</small>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">CC</div>
          <div><strong>CorteCerto</strong><small>Controle do açougue</small></div>
        </div>
        <nav aria-label="Navegação principal">
          {navItems.map((item) => (
            <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => goTo(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="store-card">
          <span className="store-icon">F</span>
          <div><strong>Fort Atacadista</strong><small>Barreiros • Açougue</small></div>
        </div>
        <div className="profile">
          <span>VA</span>
          <div><strong>Vanusa Alves</strong><small>Encarregada do açougue</small></div>
          <button onClick={logout} title="Sair do sistema">Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setNavOpen((value) => !value)} aria-label="Abrir menu">☰</button>
          <div className="mobile-brand">CorteCerto</div>
          <div className="topbar-actions">
            <span className="sync-status"><i /> Dados salvos</span>
            <button className="primary compact" onClick={() => setBreakModal(true)}>＋ Lançar quebra</button>
          </div>
        </header>

        <div className="page">
          {error && <div className="error-banner"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}
          {loading && !data ? (
            <div className="loading-screen"><div className="loader" /><p>Organizando os dados do açougue…</p></div>
          ) : (
            <>
              {tab === "dashboard" && (
                <>
                  <div className="page-heading">
                    <div><p className="eyebrow">Olá, Vanusa</p><h1>Visão geral do açougue</h1><p>Acompanhe as quebras e a equipe sem precisar contar folha por folha.</p></div>
                    <label className="month-picker">Período
                      <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                    </label>
                  </div>

                  <div className="quick-action">
                    <div className="quick-icon">＋</div>
                    <div><strong>Terminou de conferir a folha de hoje?</strong><span>Registre todas as carnes de uma vez. O sistema soma o dia e o mês automaticamente.</span></div>
                    <button className="primary" onClick={() => setBreakModal(true)}>Registrar folha</button>
                  </div>

                  <div className="kpi-grid">
                    <article className="kpi-card accent">
                      <span className="kpi-label">Quebra no mês</span>
                      <strong>{weight.format(totalKg)} <small>kg</small></strong>
                      <p>{activeDays} {activeDays === 1 ? "dia registrado" : "dias registrados"}</p>
                    </article>
                    <article className="kpi-card">
                      <span className="kpi-label">Custo estimado</span>
                      <strong>{currency.format(totalCost)}</strong>
                      <p>Somatório das folhas lançadas</p>
                    </article>
                    <article className="kpi-card">
                      <span className="kpi-label">Carne com maior quebra</span>
                      <strong className="text-value">{productSummary[0] ? shortProduct(productSummary[0].name) : "Sem dados"}</strong>
                      <p>{productSummary[0] ? `${weight.format(productSummary[0].kg)} kg no mês` : "Lance a primeira folha"}</p>
                    </article>
                    <article className="kpi-card">
                      <span className="kpi-label">Dia com maior quebra</span>
                      <strong className="date-value">{worstDay ? formatDate(worstDay[0]) : "Sem dados"}</strong>
                      <p>{worstDay ? `${weight.format(worstDay[1])} kg nesse dia` : "Nenhum lançamento"}</p>
                    </article>
                  </div>

                  <div className="dashboard-grid">
                    <article className="panel trend-panel">
                      <div className="panel-heading"><div><h2>Quebra por dia</h2><p>{monthName(month)} • em quilogramas</p></div><span className="legend"><i /> Peso total</span></div>
                      <BreakTrendChart data={dailySummary} />
                    </article>
                    <article className="panel ranking-panel">
                      <div className="panel-heading"><div><h2>Quebra por carne</h2><p>Maiores volumes do mês</p></div><button className="link-button" onClick={() => setTab("analises")}>Ver análise</button></div>
                      <BreakDistributionChart data={productSummary.map((item) => ({ name: shortProduct(item.name), kg: item.kg }))} />
                    </article>
                  </div>

                  <article className="panel recent-panel">
                    <div className="panel-heading"><div><h2>Últimas folhas lançadas</h2><p>Conferência rápida dos registros</p></div><button className="secondary" onClick={() => setTab("quebras")}>Ver histórico</button></div>
                    <div className="recent-table">
                      {monthReports.slice(0, 5).map((report) => (
                        <div className="recent-row" key={report.id}>
                          <span className="date-badge"><strong>{report.date.slice(8, 10)}</strong><small>{weekDay.format(safeDate(report.date)).replace(".", "")}</small></span>
                          <div className="recent-main"><strong>Requisição {report.requisition || "sem número"}</strong><span>{report.items.length} carnes • {report.employee}</span></div>
                          <strong className="recent-weight">{weight.format(report.totalKg)} kg</strong>
                          <span className="status-pill done">Conferido</span>
                        </div>
                      ))}
                      {!monthReports.length && <EmptyState title="Ainda não há folhas neste mês" text="Use “Registrar folha” para começar." />}
                    </div>
                  </article>
                </>
              )}

              {tab === "quebras" && (
                <>
                  <div className="page-heading">
                    <div><p className="eyebrow">Controle diário</p><h1>Quebras de carnes</h1><p>Uma folha vira um lançamento com todas as carnes separadas.</p></div>
                    <button className="primary" onClick={() => setBreakModal(true)}>＋ Nova folha</button>
                  </div>
                  <div className="toolbar">
                    <label>Filtrar por mês<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
                    <div className="toolbar-summary"><strong>{weight.format(totalKg)} kg</strong><span>em {monthName(month)}</span></div>
                  </div>
                  <div className="report-list">
                    {monthReports.map((report) => (
                      <article className="report-card" key={report.id}>
                        <div className="report-top">
                          <div><span className="report-date">{formatDate(report.date)}</span><h2>Requisição {report.requisition || "sem número"}</h2><p>{report.employee}</p></div>
                          <div className="report-total"><strong>{weight.format(report.totalKg)} kg</strong><span>{currency.format(report.totalCost)}</span></div>
                        </div>
                        <div className="item-table">
                          <div className="item-head"><span>Carne</span><span>Peso</span><span>Custo</span></div>
                          {report.items.map((item) => (
                            <div className="item-row" key={item.id}><strong>{item.productName}</strong><span>{weight.format(item.quantityKg)} kg</span><span>{currency.format(item.cost)}</span></div>
                          ))}
                        </div>
                        <div className="report-actions"><span className="status-pill done">✓ Conferido</span><button className="danger-link" onClick={() => void postAction({ action: "delete_break", id: report.id }, "Lançamento excluído.")}>Excluir</button></div>
                      </article>
                    ))}
                    {!monthReports.length && <EmptyState title="Nenhuma folha lançada" text="Registre a folha do dia e as carnes serão somadas automaticamente." />}
                  </div>
                </>
              )}

              {tab === "analises" && (
                <>
                  <div className="page-heading">
                    <div><p className="eyebrow">Fechamento automático</p><h1>Análise mensal por carne</h1><p>Veja quanto cada produto acumulou em peso e custo.</p></div>
                    <label className="month-picker">Período<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
                  </div>
                  <div className="analysis-hero">
                    <div><span>Total do mês</span><strong>{weight.format(totalKg)} kg</strong><small>{currency.format(totalCost)} em perdas registradas</small></div>
                    <div><span>Média por dia lançado</span><strong>{weight.format(activeDays ? totalKg / activeDays : 0)} kg</strong><small>{activeDays} dias com registro</small></div>
                    <div><span>Produtos com quebra</span><strong>{productSummary.length}</strong><small>carnes diferentes</small></div>
                  </div>
                  <article className="panel analysis-panel">
                    <div className="panel-heading"><div><h2>Resultado por carne</h2><p>Ordenado do maior para o menor peso</p></div></div>
                    <div className="analysis-table">
                      <div className="analysis-head"><span>#</span><span>Carne / produto</span><span>Dias</span><span>Peso acumulado</span><span>Custo</span><span>Participação</span></div>
                      {productSummary.map((item, index) => (
                        <div className="analysis-row" key={item.name}>
                          <span>{index + 1}</span><strong>{item.name}</strong><span>{item.days}</span><span>{weight.format(item.kg)} kg</span><span>{currency.format(item.cost)}</span>
                          <div className="share"><i style={{ width: `${totalKg ? (item.kg / totalKg) * 100 : 0}%` }} /><small>{totalKg ? ((item.kg / totalKg) * 100).toFixed(1) : "0"}%</small></div>
                        </div>
                      ))}
                      {!productSummary.length && <EmptyState title="Sem dados para analisar" text="Escolha outro mês ou lance uma folha." />}
                    </div>
                  </article>
                  <article className="panel product-chart-panel">
                    <div className="panel-heading"><div><h2>Comparação visual por carne</h2><p>Passe o mouse sobre as barras para consultar o peso exato</p></div></div>
                    <ProductBars data={productSummary.map((item) => ({ name: shortProduct(item.name), kg: item.kg }))} />
                  </article>
                </>
              )}

              {tab === "folgas" && (
                <>
                  <div className="page-heading">
                    <div><p className="eyebrow">Escala da equipe</p><h1>Quadro de folgas</h1><p>Veja quem folga hoje, organize a semana e planeje o mês inteiro.</p></div>
                  </div>
                  <TimeOffPlanner
                    items={data?.timeOffs ?? []}
                    anchor={timeOffAnchor}
                    onAnchorChange={setTimeOffAnchor}
                    onAdd={openTimeOffModal}
                    onMove={(id, status) => void postAction({ action: "move_timeoff", id, status }, "Situação da folga atualizada.")}
                    onDelete={(id) => void postAction({ action: "delete_timeoff", id }, "Folga excluída.")}
                    onReschedule={(id, date) => void postAction({ action: "reschedule_timeoff", id, date }, "Folga movida para o novo dia.")}
                  />
                </>
              )}

              {tab === "cadastros" && (
                <>
                  <div className="page-heading">
                    <div><p className="eyebrow">Lista usada nos lançamentos</p><h1>Cadastro de carnes</h1><p>Adicione os nomes exatamente como aparecem nas folhas.</p></div>
                    <button className="primary" onClick={() => setProductModal(true)}>＋ Adicionar carne</button>
                  </div>
                  <article className="panel products-panel">
                    <div className="product-head"><span>Carne / produto</span><span>Categoria</span><span>Situação</span></div>
                    {(data?.products ?? []).map((product) => (
                      <div className="product-row" key={product.id}><strong>{product.name}</strong><span>{product.category}</span><span className="status-pill done">Ativa</span></div>
                    ))}
                  </article>
                  <div className="saas-note"><span>↗</span><div><strong>Estrutura pronta para crescer</strong><p>Os registros já ficam em banco de dados. A próxima evolução pode incluir login por loja, permissões, metas de quebra, comparação entre filiais e relatórios exportáveis.</p></div></div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {navOpen && <button className="nav-backdrop" onClick={() => setNavOpen(false)} aria-label="Fechar menu" />}
      {toast && <div className="toast">✓ {toast}</div>}

      {breakModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBreakModal(false)}>
          <form className="modal large-modal" onSubmit={submitBreak}>
            <div className="modal-header"><div><span className="eyebrow">Nova folha</span><h2>Registrar quebra do dia</h2><p>Adicione todas as carnes antes de salvar.</p></div><button type="button" className="close" onClick={() => setBreakModal(false)}>×</button></div>
            <div className="form-grid three">
              <label>Data da folha<input required type="date" value={breakDate} onChange={(event) => setBreakDate(event.target.value)} /></label>
              <label>Nº da requisição<input value={requisition} onChange={(event) => setRequisition(event.target.value)} placeholder="Ex.: 28076039" /></label>
              <label>Funcionário(a)<input value={employeeName} readOnly /></label>
            </div>
            <div className="items-editor">
              <div className="editor-head"><strong>Carnes da folha</strong><span>Informe o peso que aparece em “Quantidade”</span></div>
              {draftItems.map((item, index) => (
                <div className="draft-row" key={item.key}>
                  <span className="draft-number">{index + 1}</span>
                  <label>Carne<select required value={item.productId} onChange={(event) => updateDraftItem(item.key, "productId", Number(event.target.value))}><option value={0}>Selecione a carne</option>{(data?.products ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                  <label>Peso da quebra (kg)<input required min="0.001" step="0.001" type="number" inputMode="decimal" value={item.quantityKg || ""} onChange={(event) => updateDraftItem(item.key, "quantityKg", Number(event.target.value))} placeholder="0,000" /></label>
                  <label>Custo bruto (R$)<input min="0" step="0.01" type="number" inputMode="decimal" value={item.cost || ""} onChange={(event) => updateDraftItem(item.key, "cost", Number(event.target.value))} placeholder="Opcional" /></label>
                  <button type="button" className="remove-item" disabled={draftItems.length === 1} onClick={() => setDraftItems((current) => current.filter((entry) => entry.key !== item.key))}>×</button>
                </div>
              ))}
              <button type="button" className="add-item" onClick={addDraftItem}>＋ Adicionar outra carne</button>
            </div>
            <div className="modal-summary"><span>Total desta folha</span><strong>{weight.format(draftItems.reduce((sum, item) => sum + Number(item.quantityKg), 0))} kg</strong></div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setBreakModal(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar folha e atualizar painel"}</button></div>
          </form>
        </div>
      )}

      {timeOffModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTimeOffModal(false)}>
          <form className="modal" onSubmit={submitTimeOff}>
            <div className="modal-header"><div><span className="eyebrow">Quadro Kanban</span><h2>Solicitar nova folga</h2></div><button type="button" className="close" onClick={() => setTimeOffModal(false)}>×</button></div>
            <div className="form-grid">
              <label>Funcionário(a)<input required value={timeOffDraft.employee} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, employee: event.target.value })} placeholder="Nome de quem vai folgar" /></label>
              <label>Data da folga<input required type="date" value={timeOffDraft.date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, date: event.target.value })} /></label>
              <label>Tipo<select value={timeOffDraft.type} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, type: event.target.value })}><option>Semanal</option><option>Compensatória</option><option>Feriado</option><option>Férias</option></select></label>
              <label>Quem fará a cobertura?<input value={timeOffDraft.coverage} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, coverage: event.target.value })} placeholder="Nome da pessoa" /></label>
              <label className="full">Observação<textarea value={timeOffDraft.notes} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, notes: event.target.value })} placeholder="Informação importante sobre a folga" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setTimeOffModal(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? "Salvando…" : "Adicionar à escala"}</button></div>
          </form>
        </div>
      )}

      {productModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setProductModal(false)}>
          <form className="modal small-modal" onSubmit={submitProduct}>
            <div className="modal-header"><div><span className="eyebrow">Cadastro</span><h2>Adicionar carne</h2><p>Use o mesmo nome que aparece na folha.</p></div><button type="button" className="close" onClick={() => setProductModal(false)}>×</button></div>
            <label className="standalone-label">Nome da carne<input required autoFocus value={newProduct} onChange={(event) => setNewProduct(event.target.value)} placeholder="Ex.: PATINHO BOVINO KG" /></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setProductModal(false)}>Cancelar</button><button className="primary" disabled={saving}>Adicionar carne</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
