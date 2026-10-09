import { useState } from "react";
import { formatTime } from "../game/core/caseGen";
import { CodexData } from "../game/core/codex";
import {
    CREATURES,
    CreatureId,
    START_MINUTES,
    TRAITS,
    WITNESSES,
} from "../game/core/data";
import { CAREERS, PERKS } from "../game/core/perks";
import { Finish, store } from "../game/core/store";
import {
    Action,
    canDo,
    foundTraits,
    Phase,
    PHASE_NAMES,
    PHASES,
    placeLabel,
    possibleCreatures,
    remaining,
    RunState,
    timeCost,
    witnessOfClue,
} from "../game/core/run";

const clock = (run: RunState) => formatTime(START_MINUTES + run.clock);

const CATEGORY_NAMES = {
    tool: "เครื่องมือ",
    technique: "เทคนิคสอบปากคำ",
    skill: "ทักษะ",
};

// ---------------------------------------------------------------- HUD

export function Hud({ run }: { run: RunState }) {
    const left = remaining(run);
    const pct = run.phaseBudget ? Math.max(0, left / run.phaseBudget) : 0;
    const sanityPct = run.sanity / run.maxSanity;
    return (
        <header className="hud">
            <ol className="phases">
                {PHASES.map((p, i) => (
                    <li
                        key={p}
                        className={
                            p === run.phase
                                ? "now"
                                : PHASES.indexOf(run.phase) > i
                                  ? "past"
                                  : ""
                        }
                    >
                        <span className="num">{i + 1}</span>
                        {PHASE_NAMES[p]}
                    </li>
                ))}
            </ol>
            <div className="meters">
                <div className="meter" title="เวลาที่เหลือในเฟสนี้">
                    <span className="label">เวลา {clock(run)} น.</span>
                    {run.phase !== "accuse" && (
                        <>
                            <div className="bar">
                                <i
                                    style={{ width: `${pct * 100}%` }}
                                    className={pct < 0.25 ? "low" : ""}
                                />
                            </div>
                            <span className="value">เหลือ {left} นาที</span>
                        </>
                    )}
                </div>
                <div className="meter" title="สติ (Sanity)">
                    <span className="label">สติ</span>
                    <div className="bar sanity">
                        <i
                            style={{ width: `${sanityPct * 100}%` }}
                            className={sanityPct < 0.3 ? "low" : ""}
                        />
                    </div>
                    <span className="value">{run.sanity}</span>
                </div>
                {run.step === "play" && run.phase !== "accuse" && (
                    <button className="btn ghost" onClick={store.endPhase}>
                        จบเฟสนี้ →
                    </button>
                )}
            </div>
        </header>
    );
}

// ---------------------------------------------------------------- notebook

export function Notebook({ run }: { run: RunState }) {
    const byPhase = PHASES.map((p) => ({
        phase: p,
        notes: run.notes.filter((n) => n.phase === p),
    })).filter((g) => g.notes.length);
    return (
        <aside className="notebook">
            <div className="nb-head">
                <h2>สมุดบันทึก</h2>
                <span className="muted">
                    {CAREERS[run.career].name} · คดี #
                    {run.seed.toString(16).toUpperCase()}
                </span>
            </div>
            {run.perks.length > 0 && (
                <div className="perk-row">
                    {run.perks.map((id) => (
                        <span key={id} className="chip" title={PERKS[id].text}>
                            {PERKS[id].name}
                        </span>
                    ))}
                </div>
            )}
            <div className="nb-scroll">
                {!byPhase.length && (
                    <p className="muted">
                        ยังไม่มีบันทึก คลิกจุดที่น่าสงสัยในฉากเพื่อสืบสวน
                        แต่ละการกระทำกินเวลา
                    </p>
                )}
                {[...byPhase].reverse().map((g) => (
                    <section key={g.phase}>
                        <h3>{PHASE_NAMES[g.phase]}</h3>
                        {[...g.notes].reverse().map((n) => (
                            <article
                                key={n.id}
                                className={`note ${n.eerie ? "eerie" : ""}`}
                            >
                                <div className="src">
                                    {n.source}
                                    {n.trait && (
                                        <span className="tag">
                                            {TRAITS[n.trait].name}
                                        </span>
                                    )}
                                </div>
                                <p>{n.text}</p>
                            </article>
                        ))}
                    </section>
                ))}
            </div>
        </aside>
    );
}

export function MessageBar({ run }: { run: RunState }) {
    if (!run.lastMessage || run.step !== "play") return null;
    return (
        <div className="message" key={run.notes.length}>
            {run.lastMessage}
        </div>
    );
}

// ---------------------------------------------------------------- briefing

const BRIEFINGS: Record<
    Phase,
    (run: RunState) => { title: string; body: string; hint: string }
> = {
    scene: (run) => ({
        title: "เฟส 1 · ที่เกิดเหตุ",
        body: `เที่ยงคืน หมอกควันจากปล่องโรงหลอมกลืนถนนทั้งสาย ตำรวจเรียกคุณมาที่ห้องเช่าชั้นสองซึ่งพบศพของ${run.file.victimName} พวกเขาพึมพำกันว่า "อีกแล้ว"`,
        hint: `คุณมีเวลา ${run.phaseBudget} นาทีก่อนรถเก็บศพจะมาถึง คลิกจุดต่างๆ ในห้องเพื่อตรวจ เลือกให้ดี เพราะตรวจได้ไม่ครบทุกจุด`,
    }),
    clues: (run) => ({
        title: "เฟส 2 · เก็บเบาะแส",
        body: "ร่องรอยของมันไม่ได้จบแค่ในห้อง เมืองเบรนมัวร์ยามดึกเต็มไปด้วยตรอกที่ตะเกียงแก๊สส่องไม่ถึง",
        hint: `มีเวลา ${run.phaseBudget} นาที เลือกสถานที่บนแผนที่ที่จะไป ที่หอสมุดยังค้นตำราเพื่อเติม Codex ได้ด้วย`,
    }),
    witness: (run) => ({
        title: "เฟส 3 · สืบพยาน",
        body: "ก่อนฟ้าสาง ตำรวจต้อนพยานและผู้ต้องสงสัยสี่คนมาที่สถานี ทุกคนเหนื่อย หวาดกลัว และอย่างน้อยหนึ่งคนกำลังโกหก",
        hint: `มีเวลา ${run.phaseBudget} นาที คุยกับพยาน สังเกตผู้ต้องสงสัย ถามข้อแก้ตัว แล้วตรวจสอบว่าจริงหรือไม่`,
    }),
    accuse: () => ({
        title: "เฟส 4 · หาคนร้าย",
        body: "ฟ้าเริ่มสาง ไม่มีเวลาเหลือแล้ว คุณต้องตัดสินว่ามันคืออะไร และซ่อนอยู่ในร่างของใคร",
        hint: "เลือกประเภทสิ่งลี้ลับและผู้ต้องสงสัย ตอบถูกแค่ประเภทก็ยังได้คะแนนบางส่วน",
    }),
};

export function Briefing({ run }: { run: RunState }) {
    const b = BRIEFINGS[run.phase](run);
    return (
        <div className="overlay">
            <div className="card briefing">
                <div className="eyebrow">{clock(run)} น.</div>
                <h2>{b.title}</h2>
                <p className="lead">{b.body}</p>
                <p className="muted">{b.hint}</p>
                <button className="btn" onClick={store.begin}>
                    เริ่มสืบ
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- phase 2 side action

export function ResearchButton({ run }: { run: RunState }) {
    const action: Action = { type: "research" };
    const check = canDo(run, action);
    return (
        <div className="floating">
            <button
                className="btn ghost"
                disabled={!check.ok}
                onClick={() => store.act(action)}
                title="ค้นตำราโบราณเพื่อเติมความรู้ใน Codex"
            >
                📖 ค้นตำราที่หอสมุด · {timeCost(run, action)} นาที · เสียสติ
                {!check.ok && <span className="muted"> ({check.reason})</span>}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------- phase 3

function ActionButton({
    run,
    action,
    children,
}: {
    run: RunState;
    action: Action;
    children: string;
}) {
    const check = canDo(run, action);
    const cost = timeCost(run, action);
    return (
        <button
            className="btn small"
            disabled={!check.ok}
            onClick={() => store.act(action)}
            title={check.ok ? "" : check.reason}
        >
            {children}{" "}
            <span className="cost">{check.ok ? `${cost}′` : check.reason}</span>
        </button>
    );
}

export function WitnessPanel({ run }: { run: RunState }) {
    return (
        <div className="panel witness-panel">
            <section>
                <h3>พยาน</h3>
                <div className="witnesses">
                    {WITNESSES.map((w) => (
                        <div key={w.id} className="person">
                            <div className="silhouette" aria-hidden>
                                👤
                            </div>
                            <div className="who">
                                <b>{w.name}</b>
                                <span className="muted">{w.role}</span>
                            </div>
                            <ActionButton
                                run={run}
                                action={{ type: "witness", witness: w.id }}
                            >
                                สอบปากคำ
                            </ActionButton>
                        </div>
                    ))}
                </div>
            </section>
            <section>
                <h3>ผู้ต้องสงสัย</h3>
                <div className="suspects">
                    {run.file.suspects.map((s) => {
                        const p = run.suspects[s.id];
                        return (
                            <div
                                key={s.id}
                                className={`suspect ${run.cleared === s.id ? "cleared" : ""}`}
                            >
                                <div className="silhouette big" aria-hidden>
                                    🎩
                                </div>
                                <b>{s.name}</b>
                                <span className="muted">{s.occupation}</span>
                                {run.cleared === s.id && (
                                    <span className="tag ok">
                                        ตำรวจยืนยันว่าบริสุทธิ์
                                    </span>
                                )}
                                <ul className="facts">
                                    {p.observed && <li>พก{s.item}</li>}
                                    {p.observed && <li>{s.tell}</li>}
                                    {p.alibiAsked && (
                                        <li>อ้างว่าอยู่ที่{s.alibiPlace}</li>
                                    )}
                                    {p.verified && (
                                        <li
                                            className={
                                                s.alibiStatus === "confirmed"
                                                    ? "ok"
                                                    : s.alibiStatus === "lie"
                                                      ? "bad"
                                                      : ""
                                            }
                                        >
                                            {s.alibiStatus === "confirmed"
                                                ? "ข้อแก้ตัวมีพยานยืนยัน"
                                                : s.alibiStatus === "lie"
                                                  ? "ข้อแก้ตัวเป็นเท็จ"
                                                  : "ข้อแก้ตัวพิสูจน์ไม่ได้"}
                                        </li>
                                    )}
                                </ul>
                                <div className="actions">
                                    <ActionButton
                                        run={run}
                                        action={{
                                            type: "observe",
                                            suspect: s.id,
                                        }}
                                    >
                                        สังเกต
                                    </ActionButton>
                                    <ActionButton
                                        run={run}
                                        action={{
                                            type: "alibi",
                                            suspect: s.id,
                                        }}
                                    >
                                        ถามข้อแก้ตัว
                                    </ActionButton>
                                    {!p.verified && (
                                        <ActionButton
                                            run={run}
                                            action={{
                                                type: "verify",
                                                suspect: s.id,
                                            }}
                                        >
                                            ตรวจสอบ
                                        </ActionButton>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

// ---------------------------------------------------------------- phase 4

export function AccuseBoard({
    run,
    codex,
}: {
    run: RunState;
    codex: CodexData;
}) {
    const [creature, setCreature] = useState<CreatureId | null>(null);
    const [suspect, setSuspect] = useState<string | null>(null);
    const traits = foundTraits(run);
    const possible = run.perks.includes("deduction")
        ? possibleCreatures(run, codex)
        : null;
    const sightings = run.notes.filter((n) => n.clueId?.startsWith("sighting"));

    return (
        <div className="panel board">
            <section>
                <h3>หลักฐานลายเซ็นที่พบ</h3>
                <div className="perk-row">
                    {traits.length ? (
                        traits.map((t) => (
                            <span key={t} className="tag">
                                {TRAITS[t].name}
                            </span>
                        ))
                    ) : (
                        <span className="muted">
                            ไม่พบร่องรอยของสิ่งลี้ลับเลย
                        </span>
                    )}
                </div>
                {sightings.map((n) => (
                    <p key={n.id} className="quote">
                        {n.source}: {n.text}
                    </p>
                ))}
            </section>
            <section>
                <h3>1 · มันคืออะไร</h3>
                <div className="creatures">
                    {codex.unlockedCreatures.map((c) => {
                        const def = CREATURES[c];
                        const ruledOut = possible
                            ? !possible.includes(c)
                            : false;
                        return (
                            <button
                                key={c}
                                className={`creature ${creature === c ? "picked" : ""} ${ruledOut ? "ruled-out" : ""}`}
                                onClick={() => setCreature(c)}
                            >
                                <b>{def.name}</b>
                                <span className="muted">{def.blurb}</span>
                                <ul>
                                    {def.traits.map((t) =>
                                        codex.known[c].includes(t) ? (
                                            <li
                                                key={t}
                                                className={
                                                    traits.includes(t)
                                                        ? "hit"
                                                        : ""
                                                }
                                            >
                                                {traits.includes(t)
                                                    ? "✓ "
                                                    : "· "}
                                                {TRAITS[t].name}
                                            </li>
                                        ) : (
                                            <li key={t} className="unknown">
                                                · ???
                                            </li>
                                        ),
                                    )}
                                </ul>
                                <span className="ward">
                                    ผนึกด้วย: {def.ward}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>
            <section>
                <h3>2 · มันซ่อนอยู่ในร่างใคร</h3>
                <div className="suspects compact">
                    {run.file.suspects.map((s) => {
                        const p = run.suspects[s.id];
                        return (
                            <button
                                key={s.id}
                                className={`suspect ${suspect === s.id ? "picked" : ""} ${run.cleared === s.id ? "cleared" : ""}`}
                                onClick={() => setSuspect(s.id)}
                            >
                                <b>{s.name}</b>
                                <span className="muted">{s.occupation}</span>
                                <ul className="facts">
                                    {p.observed ? (
                                        <>
                                            <li>พก{s.item}</li>
                                            <li>{s.tell}</li>
                                        </>
                                    ) : (
                                        <li className="unknown">
                                            ยังไม่ได้สังเกต
                                        </li>
                                    )}
                                    {p.verified && (
                                        <li
                                            className={
                                                s.alibiStatus === "confirmed"
                                                    ? "ok"
                                                    : s.alibiStatus === "lie"
                                                      ? "bad"
                                                      : ""
                                            }
                                        >
                                            {s.alibiStatus === "confirmed"
                                                ? "ข้อแก้ตัวยืนยันแล้ว"
                                                : s.alibiStatus === "lie"
                                                  ? "ข้อแก้ตัวเป็นเท็จ"
                                                  : "ข้อแก้ตัวพิสูจน์ไม่ได้"}
                                        </li>
                                    )}
                                    {run.cleared === s.id && (
                                        <li className="ok">
                                            ตำรวจยืนยันว่าบริสุทธิ์
                                        </li>
                                    )}
                                </ul>
                            </button>
                        );
                    })}
                </div>
            </section>
            <div className="board-foot">
                <button
                    className="btn"
                    disabled={!creature || !suspect}
                    onClick={() =>
                        creature && suspect && store.accuse(creature, suspect)
                    }
                >
                    ชี้ตัวคนร้าย
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- draft

export function Draft({ run }: { run: RunState }) {
    const options = run.draft ?? [];
    return (
        <div className="overlay">
            <div className="card draft">
                <div className="eyebrow">จบเฟส {PHASE_NAMES[run.phase]}</div>
                <h2>เลือก 1 อย่างติดตัวไป</h2>
                <p className="muted">
                    ตัวเลือกเอนไปทางสาย{CAREERS[run.career].name}
                </p>
                <div className="options">
                    {options.map((id) => (
                        <button
                            key={id}
                            className="option"
                            onClick={() => store.pick(id)}
                        >
                            <span className="eyebrow">
                                {CATEGORY_NAMES[PERKS[id].category]}
                            </span>
                            <b>{PERKS[id].name}</b>
                            <span>{PERKS[id].text}</span>
                        </button>
                    ))}
                </div>
                <button className="btn ghost" onClick={() => store.pick(null)}>
                    ไม่เอาอะไร
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- reveal

const LAYERS = ["ผลลัพธ์", "ความจริง", "สิ่งที่พลาด", "เข้า Codex"];

export function Reveal({
    run,
    finish,
}: {
    run: RunState;
    finish: Finish | null;
}) {
    const [layer, setLayer] = useState(0);
    const o = run.outcome!;
    const file = run.file;
    const culprit = file.suspects.find((s) => s.id === file.culpritSuspect)!;
    const decoy = file.suspects.find((s) => s.id === file.decoySuspect)!;
    const missed = file.clues.filter(
        (c) =>
            (c.kind === "trait" || c.kind === "sighting") &&
            !run.found.includes(c.id),
    );
    const alibiChecked = run.suspects[culprit.id].verified;
    const wastedMinutes = run.wasted.reduce((sum, w) => sum + w.minutes, 0);

    return (
        <div className="overlay">
            <div className="card reveal">
                <ol className="layers">
                    {LAYERS.map((l, i) => (
                        <li
                            key={l}
                            className={
                                i === layer ? "now" : i < layer ? "past" : ""
                            }
                        >
                            {l}
                        </li>
                    ))}
                </ol>

                {layer === 0 && (
                    <div className="layer">
                        <div className={`grade g-${o.grade}`}>{o.grade}</div>
                        <h2>{o.title}</h2>
                        <p className="lead">{o.story}</p>
                        <p className="muted">
                            คะแนน {o.score} · ประเภท{" "}
                            {o.creatureRight ? "ถูก" : "ผิด"} · ตัวคนร้าย{" "}
                            {o.suspectRight ? "ถูก" : "ผิด"}
                        </p>
                    </div>
                )}

                {layer === 1 && (
                    <div className="layer">
                        <h2>
                            {CREATURES[file.culprit].name} ในร่างของ
                            {culprit.name}
                        </h2>
                        <p className="lead">
                            ราว {file.timeOfDeath} น. {culprit.name} (
                            {culprit.occupation}) ออกจาก{culprit.alibiPlace}
                            โดยไม่มีใครสังเกต ไปเคาะประตูห้องของ
                            {file.victimName} แล้วเดินออกมาในหมอกโดยสวม
                            {file.sightingItem}
                        </p>
                        <p>
                            ร่องรอยที่ทิ้งไว้:{" "}
                            {CREATURES[file.culprit].traits
                                .map((t) => TRAITS[t].name)
                                .join(" · ")}
                        </p>
                        <p className="muted">
                            ตัวเลือกใกล้เคียงคือ {CREATURES[file.decoy].name}{" "}
                            และ{decoy.name} ที่สวม{file.sightingItem}เหมือนกัน
                            แต่มีข้อแก้ตัวที่ยืนยันได้
                            สิ่งที่แยกสองคำตอบออกจากกันคือ{" "}
                            <b>
                                {file.keyTraits
                                    .map((t) => TRAITS[t].name)
                                    .join(" หรือ ")}
                            </b>
                        </p>
                    </div>
                )}

                {layer === 2 && (
                    <div className="layer">
                        <h2>สิ่งที่พลาดไป</h2>
                        {!missed.length && alibiChecked && (
                            <p className="lead">คุณไม่พลาดหลักฐานสำคัญเลย</p>
                        )}
                        <ul className="missed">
                            {missed.map((c) => (
                                <li
                                    key={c.id}
                                    className={
                                        c.trait &&
                                        file.keyTraits.includes(c.trait)
                                            ? "key"
                                            : ""
                                    }
                                >
                                    <b>
                                        {c.trait
                                            ? TRAITS[c.trait].name
                                            : "คำให้การผู้เห็นเหตุการณ์"}
                                    </b>
                                    {c.trait &&
                                        file.keyTraits.includes(c.trait) && (
                                            <span className="tag bad">
                                                หลักฐานชี้ขาด
                                            </span>
                                        )}
                                    <span className="muted">
                                        {" "}
                                        —{" "}
                                        {placeLabel(
                                            c.place,
                                            witnessOfClue(c.id),
                                        )}
                                    </span>
                                </li>
                            ))}
                            {!alibiChecked && (
                                <li className="key">
                                    <b>ข้อแก้ตัวของ{culprit.name}</b>
                                    <span className="muted">
                                        {" "}
                                        — ถ้าตรวจสอบจะพบว่าโกหก
                                    </span>
                                </li>
                            )}
                        </ul>
                        {run.wasted.length > 0 && (
                            <p className="muted">
                                ใช้เวลา {wastedMinutes} นาทีกับที่ที่ไม่มีอะไร:{" "}
                                {run.wasted.map((w) => w.label).join(", ")}
                            </p>
                        )}
                    </div>
                )}

                {layer === 3 && (
                    <div className="layer">
                        <h2>บันทึกเข้า Codex</h2>
                        <p className="muted">
                            ความรู้ไม่หายไปไหน แม้คดีจะล้มเหลว
                        </p>
                        <ul className="missed">
                            {(finish?.learned ?? []).map((l) => (
                                <li key={`${l.creature}-${l.trait}`}>
                                    📜 {CREATURES[l.creature].name}:{" "}
                                    <b>{TRAITS[l.trait].name}</b>
                                </li>
                            ))}
                            {(finish?.unlocks ?? []).map((u) => (
                                <li key={u} className="key">
                                    🔓 {u}
                                </li>
                            ))}
                            {!finish?.learned.length &&
                                !finish?.unlocks.length && (
                                    <li className="muted">
                                        ไม่มีความรู้ใหม่ในคดีนี้
                                    </li>
                                )}
                        </ul>
                    </div>
                )}

                <div className="row">
                    {layer < LAYERS.length - 1 ? (
                        <button
                            className="btn"
                            onClick={() => setLayer(layer + 1)}
                        >
                            ต่อไป: {LAYERS[layer + 1]}
                        </button>
                    ) : (
                        <>
                            <button
                                className="btn"
                                onClick={() => store.newRun(run.career)}
                            >
                                คดีใหม่
                            </button>
                            <button
                                className="btn ghost"
                                onClick={store.showCodex}
                            >
                                เปิด Codex
                            </button>
                            <button
                                className="btn ghost"
                                onClick={store.showTitle}
                            >
                                หน้าแรก
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
