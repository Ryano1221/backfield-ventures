"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { DeskBot } from "@/lib/os/bot-desk";
import { buildTower, type Floor, type TowerBot } from "@/lib/os/tower";
import type { Interaction } from "@/lib/os/types";

/**
 * The bot office as a building: one floor per team, bots at desks, a standup
 * at the whiteboard, folders walking down the hall, idle bots at the coffee
 * bar, and green flags at the lift for anything that needs Ryan. Every bot is
 * a button that opens its sheet.
 */
export function OfficeTower({ bots, interactions, now, onOpenBot }: { bots: DeskBot[]; interactions: Interaction[]; now: number; onOpenBot: (id: string) => void }) {
  const floors = useMemo(() => buildTower(bots, interactions, now), [bots, interactions, now]);
  const [paused, setPaused] = useState(false);
  if (!floors.length) return null;
  const top = floors[0]?.key;

  return (
    <section className="tower" data-paused={paused ? "1" : "0"} aria-label="Office building">
      <div className="tower-bar">
        <nav className="tower-floors" aria-label="Floors">
          {floors.map((floor) => (
            <a key={floor.key} href={`#floor-${floor.key}`}>
              <b>{floor.level}F</b> {floor.label}
              {floor.counts.needs ? <i className="tower-dot" aria-label={`${floor.counts.needs} need you`} /> : null}
            </a>
          ))}
        </nav>
        <button type="button" className="tower-play" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>
      {floors.map((floor) => (
        <FloorView key={floor.key} floor={floor} top={floor.key === top} onOpenBot={onOpenBot} />
      ))}
      <p className="tower-key">
        <span>
          <i className="k-desk" /> At desk
        </span>
        <span>
          <i className="k-flag" /> Needs you
        </span>
        <span>
          <i className="k-cup" /> Idle
        </span>
        <span>
          <i className="k-zz" /> Paused
        </span>
        <span>
          <i className="k-alert" /> Problem
        </span>
      </p>
    </section>
  );
}

function FloorView({ floor, top, onOpenBot }: { floor: Floor; top: boolean; onOpenBot: (id: string) => void }) {
  const standup = floor.bots.filter((bot) => bot.spot === "standup");
  const coffee = floor.bots.filter((bot) => bot.spot === "coffee");
  const flags = floor.bots.filter((bot) => bot.spot === "ryan");
  // Idle bots hot-desk: they sit at the coffee bar and give up their desk, so
  // a quiet floor reads as quiet instead of a row of empty chairs. Bots at the
  // standup or the lift keep their desk, since they are coming back to it.
  const deskBots = floor.bots.filter((bot) => bot.spot !== "coffee");
  return (
    <article className="floor" id={`floor-${floor.key}`} aria-labelledby={`floor-h-${floor.key}`}>
      <header className="floor-head">
        <h2 id={`floor-h-${floor.key}`}>
          <span className="floor-num">{floor.level}F</span> {floor.label}
        </h2>
        <p>
          {floor.counts.working} working
          {floor.counts.needs ? ` · ${floor.counts.needs} need you` : ""}
          {floor.counts.idle ? ` · ${floor.counts.idle} idle` : ""}
          {floor.counts.paused ? ` · ${floor.counts.paused} paused` : ""}
        </p>
      </header>
      <div className={`floor-room${standup.length ? "" : " no-huddle"}`}>
        {standup.length ? (
          <div className="room huddle" aria-label="Standup room">
            <div className="board">
              <span>STANDUP</span>
              <i />
              <i />
              <i />
            </div>
            <div className="room-bots">
              {standup.map((bot) => (
                <BotButton key={bot.id} bot={bot} onOpenBot={onOpenBot} />
              ))}
            </div>
          </div>
        ) : null}
        {deskBots.length ? null : <p className="desks-quiet">Quiet floor. Everyone is at the coffee bar.</p>}
        <ol className="desks" aria-label="Desks" hidden={!deskBots.length}>
          {deskBots.map((bot) => (
            <li key={bot.id} className={`desk${bot.spot === "desk" || bot.spot === "asleep" ? " is-in" : " is-away"}`}>
              <div className={`monitor m-${bot.screen}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              {bot.spot === "desk" || bot.spot === "asleep" ? (
                <BotButton bot={bot} onOpenBot={onOpenBot} />
              ) : (
                <button type="button" className="chair" onClick={() => onOpenBot(bot.id)} aria-label={`${bot.name}'s desk, ${awayLabel(bot)}`}>
                  <span>{awayLabel(bot)}</span>
                </button>
              )}
              <span className="plate">{bot.short}</span>
            </li>
          ))}
        </ol>
        <div className="room lounge" aria-label="Coffee bar and lift">
          <div className={`coffee${coffee.length > 4 ? " is-crowded" : ""}`}>
            <span>COFFEE{coffee.length ? ` · ${coffee.length}` : ""}</span>
            <div className="room-bots">
              {coffee.map((bot) => (
                <BotButton key={bot.id} bot={bot} onOpenBot={onOpenBot} />
              ))}
            </div>
          </div>
          <div className={`lift${top ? " is-ryan" : ""}`}>
            <span>{top ? "RYAN" : `LIFT ${floor.level}`}</span>
            <div className="room-bots">
              {flags.map((bot) => (
                <BotButton key={bot.id} bot={bot} onOpenBot={onOpenBot} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {floor.walks.length ? (
        <div className="hall" aria-hidden="true">
          {floor.walks.map((walk, index) => (
            <span className={`walker w-${walk.kind}`} key={walk.key} style={{ "--i": index } as CSSProperties}>
              <Head screen="bars" />
              <em>{walk.title}</em>
            </span>
          ))}
        </div>
      ) : null}
      <ul className="floor-log">
        {floor.log.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

function awayLabel(bot: TowerBot): string {
  if (bot.spot === "standup") return "at standup";
  if (bot.spot === "coffee") return "at coffee";
  if (bot.spot === "ryan") return "at the lift";
  return "away";
}

function BotButton({ bot, onOpenBot }: { bot: TowerBot; onOpenBot: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`tbot s-${bot.spot}${bot.lead ? " is-lead" : ""}${bot.screen === "alert" ? " is-alert" : ""}`}
      onClick={() => onOpenBot(bot.id)}
      aria-label={`${bot.name}, ${bot.statusLabel}${bot.line ? `. ${bot.line}` : ""}. Open.`}
      title={bot.line ? `${bot.name}: ${bot.line}` : bot.name}
    >
      <Head screen={bot.screen} asleep={bot.spot === "asleep"} />
      <span className="tbot-n">{bot.number}</span>
      {bot.spot === "ryan" ? <span className="tbot-flag" aria-hidden="true" /> : null}
      {bot.spot === "asleep" ? (
        <span className="tbot-zz" aria-hidden="true">
          z
        </span>
      ) : null}
      {bot.spot === "standup" || bot.spot === "coffee" || bot.spot === "ryan" ? <span className="tbot-name">{bot.short}</span> : null}
    </button>
  );
}

function Head({ screen, asleep = false }: { screen: TowerBot["screen"]; asleep?: boolean }) {
  return (
    <svg className="tbot-head" viewBox="0 0 32 32" aria-hidden="true">
      <line x1="16" y1="2" x2="16" y2="7" />
      <circle cx="16" cy="2.5" r="1.6" />
      <rect x="4" y="7" width="24" height="19" rx="6" />
      {asleep ? (
        <>
          <line x1="10" y1="16" x2="14" y2="16" />
          <line x1="18" y1="16" x2="22" y2="16" />
        </>
      ) : screen === "alert" ? (
        <>
          <line x1="10" y1="13" x2="14" y2="17" />
          <line x1="14" y1="13" x2="10" y2="17" />
          <line x1="18" y1="13" x2="22" y2="17" />
          <line x1="22" y1="13" x2="18" y2="17" />
        </>
      ) : (
        <>
          <rect className="eye" x="10" y="13" width="3.5" height="4.5" rx="1.5" />
          <rect className="eye" x="18.5" y="13" width="3.5" height="4.5" rx="1.5" />
        </>
      )}
      <path d="M12 21.5 Q16 23.5 20 21.5" />
    </svg>
  );
}
