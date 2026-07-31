"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";

export type PlannerTimeOff = {
  id: number;
  employee: string;
  date: string;
  type: string;
  status: "Solicitada" | "Confirmada" | "Realizada";
  coverage: string;
  notes: string;
};

type ViewMode = "day" | "week" | "month";

const dayTitle = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const shortWeekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveDate(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return isoDate(date);
}

function weekStart(value: string) {
  const date = parseDate(value);
  const distance = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + distance);
  return date;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(status: PlannerTimeOff["status"]) {
  if (status === "Solicitada") return "Pendente";
  if (status === "Confirmada") return "Confirmada";
  return "Realizada";
}

type TurnoKey = "open" | "mid" | "close" | "";
function turnoOf(item: PlannerTimeOff): TurnoKey {
  const text = `${item.notes ?? ""} ${item.type ?? ""}`.toLowerCase();
  if (text.includes("abertura")) return "open";
  if (text.includes("intermedi")) return "mid";
  if (text.includes("fecha")) return "close";
  return "";
}
const turnoLabels: Record<Exclude<TurnoKey, "">, string> = {
  open: "☀ Abertura",
  mid: "◑ Intermediário",
  close: "☾ Fechamento",
};

function TimeOffCard({
  item,
  onMove,
  onDelete,
  onRequestReschedule,
}: {
  item: PlannerTimeOff;
  onMove: (id: number, status: PlannerTimeOff["status"]) => void;
  onDelete: (id: number) => void;
  onRequestReschedule: (item: PlannerTimeOff) => void;
}) {
  const nextStatus =
    item.status === "Solicitada" ? "Confirmada" : item.status === "Confirmada" ? "Realizada" : null;
  const turno = turnoOf(item);
  const showNote = item.notes && !/turno/i.test(item.notes);
  const isLead = /vanusa/i.test(item.employee);

  return (
    <article
      className={`schedule-card${turno ? ` turno-${turno}` : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/timeoff-id", String(item.id));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <GripVertical className="drag-handle" aria-hidden="true" />
      <span className={`employee-avatar${turno ? ` turno-${turno}` : ""}`}>{initials(item.employee)}</span>
      <div className="schedule-card-main">
        <strong title={item.employee}>{item.employee}</strong>
        <span>{item.type}{item.coverage ? ` • Cobertura: ${item.coverage}` : ""}</span>
        {turno && <span className={`turno-chip turno-${turno}`}>{turnoLabels[turno]}</span>}
        {isLead && <span className="lead-badge">★ Encarregada</span>}
        {showNote && <small>{item.notes}</small>}
      </div>
      <div className="schedule-card-actions">
        <span className={`schedule-status ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
        <button type="button" className="schedule-date-action" onClick={() => onRequestReschedule(item)}>
          <CalendarDays size={13} aria-hidden="true" />
          <span>Alterar dia</span>
        </button>
        {nextStatus && (
          <button className="schedule-progress-action" type="button" onClick={() => onMove(item.id, nextStatus)}>
            {nextStatus === "Confirmada" ? "Confirmar" : "Concluir"}
          </button>
        )}
        <button type="button" className="schedule-delete" onClick={() => onDelete(item.id)} aria-label={`Excluir folga de ${item.employee}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function DayColumn({
  date,
  items,
  compact = false,
  onAdd,
  onMove,
  onDelete,
  onReschedule,
  onRequestReschedule,
}: {
  date: string;
  items: PlannerTimeOff[];
  compact?: boolean;
  onAdd: (date: string) => void;
  onMove: (id: number, status: PlannerTimeOff["status"]) => void;
  onDelete: (id: number) => void;
  onReschedule: (id: number, date: string) => void;
  onRequestReschedule: (item: PlannerTimeOff) => void;
}) {
  const parsed = parseDate(date);
  const isToday = date === isoDate(new Date());

  return (
    <section
      className={`day-column ${compact ? "compact-day" : ""} ${isToday ? "today-column" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = Number(event.dataTransfer.getData("text/timeoff-id"));
        if (id) onReschedule(id, date);
      }}
    >
      <header>
        <div>
          <span>{shortWeekday.format(parsed).replace(".", "")}</span>
          <strong>{parsed.getDate()}</strong>
        </div>
        <button type="button" onClick={() => onAdd(date)} aria-label={`Adicionar folga em ${dayTitle.format(parsed)}`}>
          <Plus size={15} />
        </button>
      </header>
      <div className="day-column-cards">
        {items.map((item) => (
          <TimeOffCard key={item.id} item={item} onMove={onMove} onDelete={onDelete} onRequestReschedule={onRequestReschedule} />
        ))}
        {!items.length && (
          <button type="button" className="day-empty" onClick={() => onAdd(date)}>
            <Plus size={14} /> Adicionar folga
          </button>
        )}
      </div>
    </section>
  );
}

export default function TimeOffPlanner({
  items,
  anchor,
  onAnchorChange,
  onAdd,
  onMove,
  onDelete,
  onReschedule,
}: {
  items: PlannerTimeOff[];
  anchor: string;
  onAnchorChange: (date: string) => void;
  onAdd: (date: string) => void;
  onMove: (id: number, status: PlannerTimeOff["status"]) => void;
  onDelete: (id: number) => void;
  onReschedule: (id: number, date: string) => void;
}) {
  const [view, setView] = useState<ViewMode>("week");
  const [rescheduleTarget, setRescheduleTarget] = useState<PlannerTimeOff | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const openReschedule = (item: PlannerTimeOff) => {
    setRescheduleTarget(item);
    setRescheduleDate(item.date);
  };
  const confirmReschedule = () => {
    if (rescheduleTarget && rescheduleDate && rescheduleDate !== rescheduleTarget.date) {
      onReschedule(rescheduleTarget.id, rescheduleDate);
    }
    setRescheduleTarget(null);
  };

  const weekDates = useMemo(() => {
    const start = weekStart(anchor);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return isoDate(date);
    });
  }, [anchor]);

  const monthDates = useMemo(() => {
    const base = parseDate(anchor);
    const first = new Date(base.getFullYear(), base.getMonth(), 1, 12);
    const gridStart = weekStart(isoDate(first));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return isoDate(date);
    });
  }, [anchor]);

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, PlannerTimeOff[]>();
    items.forEach((item) => grouped.set(item.date, [...(grouped.get(item.date) ?? []), item]));
    return grouped;
  }, [items]);

  const changePeriod = (direction: -1 | 1) => {
    if (view === "day") onAnchorChange(moveDate(anchor, direction));
    if (view === "week") onAnchorChange(moveDate(anchor, direction * 7));
    if (view === "month") {
      const date = parseDate(anchor);
      date.setMonth(date.getMonth() + direction, 1);
      onAnchorChange(isoDate(date));
    }
  };

  const periodTitle =
    view === "day"
      ? dayTitle.format(parseDate(anchor))
      : view === "week"
        ? `${parseDate(weekDates[0]).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${parseDate(weekDates[6]).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
        : monthTitle.format(parseDate(anchor));

  return (
    <div className="planner">
      <div className="planner-toolbar">
        <div className="view-switch" aria-label="Modo de visualização">
          <button className={view === "day" ? "active" : ""} onClick={() => setView("day")}>Dia</button>
          <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Semana</button>
          <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Mês</button>
        </div>
        <div className="period-navigation">
          <button onClick={() => changePeriod(-1)} aria-label="Período anterior"><ChevronLeft size={17} /></button>
          <button className="today-button" onClick={() => onAnchorChange(isoDate(new Date()))}>Hoje</button>
          <button onClick={() => changePeriod(1)} aria-label="Próximo período"><ChevronRight size={17} /></button>
          <strong>{periodTitle}</strong>
        </div>
        <button className="primary planner-add" onClick={() => onAdd(anchor)}><Plus size={16} /> Nova folga</button>
      </div>

      <div className="planner-summary">
        <CalendarDays size={18} />
        <div><strong>{items.filter((item) => item.date.startsWith(anchor.slice(0, 7))).length} folgas planejadas</strong><span>Arraste no computador ou use “Alterar dia” no celular.</span></div>
      </div>

      <div className="turno-legend" aria-label="Cores por turno">
        <span className="turno-open"><i />☀ Abertura</span>
        <span className="turno-mid"><i />◑ Intermediário</span>
        <span className="turno-close"><i />☾ Fechamento</span>
      </div>

      {view === "day" && (
        <div className="day-view">
          <DayColumn
            date={anchor}
            items={itemsByDate.get(anchor) ?? []}
            onAdd={onAdd}
            onMove={onMove}
            onDelete={onDelete}
            onReschedule={onReschedule}
            onRequestReschedule={openReschedule}
          />
          <aside>
            <span>Visão rápida da semana</span>
            {weekDates.map((date) => (
              <button key={date} className={date === anchor ? "active" : ""} onClick={() => onAnchorChange(date)}>
                <div><strong>{shortWeekday.format(parseDate(date)).replace(".", "")}</strong><small>{parseDate(date).getDate()}</small></div>
                <span>{itemsByDate.get(date)?.length ?? 0} folga(s)</span>
              </button>
            ))}
          </aside>
        </div>
      )}

      {view === "week" && (
        <div className="week-board">
          {weekDates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              items={itemsByDate.get(date) ?? []}
              compact
              onAdd={onAdd}
              onMove={onMove}
              onDelete={onDelete}
              onReschedule={onReschedule}
              onRequestReschedule={openReschedule}
            />
          ))}
        </div>
      )}

      {view === "month" && (
        <div className="month-board">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span className="month-weekday" key={day}>{day}</span>)}
          {monthDates.map((date) => {
            const dayItems = itemsByDate.get(date) ?? [];
            const outside = date.slice(0, 7) !== anchor.slice(0, 7);
            return (
              <section
                key={date}
                className={`month-day ${outside ? "outside" : ""} ${date === isoDate(new Date()) ? "today" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = Number(event.dataTransfer.getData("text/timeoff-id"));
                  if (id) onReschedule(id, date);
                }}
              >
                <button className="month-date" onClick={() => { onAnchorChange(date); setView("day"); }}>{parseDate(date).getDate()}</button>
                <div>
                  {dayItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      className={`month-event${turnoOf(item) ? ` turno-${turnoOf(item)}` : ""} ${item.status.toLowerCase()}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/timeoff-id", String(item.id))}
                      onClick={() => { onAnchorChange(date); setView("day"); }}
                    >
                      <span>{initials(item.employee)}</span>{item.employee}
                    </button>
                  ))}
                  {dayItems.length > 3 && <small>+ {dayItems.length - 3} folga(s)</small>}
                </div>
                <button className="month-add" onClick={() => onAdd(date)} aria-label={`Adicionar folga em ${date}`}><Plus size={13} /></button>
              </section>
            );
          })}
        </div>
      )}

      {rescheduleTarget && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setRescheduleTarget(null); }}
        >
          <div className="modal small-modal reschedule-modal">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Folga de {rescheduleTarget.employee}</span>
                <h2>Alterar o dia</h2>
                <p>Escolha a nova data desta folga.</p>
              </div>
              <button type="button" className="close" onClick={() => setRescheduleTarget(null)}>×</button>
            </div>
            <label className="standalone-label">
              Nova data da folga
              <input
                type="date"
                autoFocus
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setRescheduleTarget(null)}>Cancelar</button>
              <button type="button" className="primary" onClick={confirmReschedule}>Salvar novo dia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
