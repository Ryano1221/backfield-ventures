"use client";

import { useMemo, useState } from "react";
import type { BotView, TeamGroup } from "@/lib/os/metrics";

type Filter = "all" | "working" | "ryan" | "failed" | "idle" | "paused";

export function BotsBoard({ teams }: { teams: TeamGroup[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const total = teams.reduce((sum, team) => sum + team.bots.length, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams
      .map((team) => ({
        ...team,
        bots: team.bots.filter((bot) => matches(bot, filter, q)),
      }))
      .filter((team) => team.bots.length > 0);
  }, [teams, filter, query]);

  if (total === 0) return <p className="os-missing">No bots in this snapshot.</p>;

  return (
    <div>
      <div className="os-tools">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search bots"
          aria-label="Search bots"
          autoComplete="off"
        />
        {(
          [
            ["all", "All"],
            ["working", "Working"],
            ["ryan", "Needs Ryan"],
            ["failed", "Failed"],
            ["idle", "Idle"],
            ["paused", "Paused"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="os-btn"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="os-missing">No bots match.</p> : null}
      <div className="os-teams">
        {visible.map((team) => (
          <section key={team.team} className="os-team">
            <h3>
              {team.team}
              <span>{team.bots.length}</span>
            </h3>
            <div className="os-bot-grid">
              {team.bots.map((bot) => {
                const id = `${team.team}:${bot.name}`;
                const isOpen = open === id;
                return (
                  <button
                    type="button"
                    className={isOpen ? "os-bot is-open" : "os-bot"}
                    key={id}
                    onClick={() => setOpen(isOpen ? null : id)}
                    aria-expanded={isOpen}
                  >
                    <span className="os-bot-tags">
                      <span className={chipClass(bot)}>{bot.status}</span>
                      {bot.failed && bot.status.toLowerCase() !== "failed" ? (
                        <span className="os-chip os-chip-failed">Failing</span>
                      ) : null}
                    </span>
                    <h4>{bot.name}</h4>
                    <p>
                      {[bot.role, bot.last].filter(Boolean).join(" · ")}
                      {bot.usage ? ` · ${bot.usage}` : ""}
                    </p>
                    {bot.registry && bot.registry !== "active" ? <p>{bot.registry}</p> : null}
                    {isOpen ? (
                      <p className="os-result">{bot.result || "No latest result."}</p>
                    ) : (
                      <p className="os-note">{bot.scope}</p>
                    )}
                    {isOpen && bot.source ? <p className="os-note">{bot.source}</p> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function matches(bot: BotView, filter: Filter, query: string): boolean {
  const status = bot.status.toLowerCase();
  if (filter === "working" && status !== "working") return false;
  if (filter === "ryan" && status !== "needs ryan") return false;
  if (filter === "failed" && !bot.failed) return false;
  if (filter === "idle" && status !== "idle") return false;
  if (filter === "paused" && status !== "paused") return false;
  if (!query) return true;
  return [bot.name, bot.team, bot.role, bot.scope, bot.result].join(" ").toLowerCase().includes(query);
}

function chipClass(bot: BotView): string {
  const status = bot.status.toLowerCase();
  if (bot.failed || status.includes("fail")) return "os-chip os-chip-failed";
  if (status === "working") return "os-chip os-chip-working";
  if (status === "needs ryan") return "os-chip os-chip-ryan";
  if (status === "paused") return "os-chip os-chip-paused";
  return "os-chip os-chip-idle";
}
