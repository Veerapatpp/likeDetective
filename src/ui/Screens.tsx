import { useState } from "react";
import { CodexData } from "../game/core/codex";
import {
    CREATURES,
    CREATURE_IDS,
    EPIC_FRAGMENTS,
    TRAITS,
} from "../game/core/data";
import { CAREERS, CAREER_IDS, CareerId } from "../game/core/perks";
import { store } from "../game/core/store";

export function Title({ codex }: { codex: CodexData }) {
    const [career, setCareer] = useState<CareerId>("inspector");
    const [seed, setSeed] = useState("");
    const start = () => {
        const parsed = parseInt(seed.trim(), 16);
        store.newRun(
            career,
            Number.isFinite(parsed) ? parsed >>> 0 : undefined,
        );
    };
    return (
        <div className="overlay title">
            <div className="title-block">
                <div className="eyebrow">เมืองเบรนมัวร์ · ปีแห่งไอน้ำ</div>
                <h1>เงาในหมอกควัน</h1>
                <p className="lead">
                    คดีใหม่ทุกคืน ไม่มีการต่อสู้ มีแค่เบาะแส เวลาที่เหลือน้อยลง
                    และสติที่ค่อยๆ หายไป
                </p>
            </div>
            <div className="card start">
                <h3>เลือกสายอาชีพ</h3>
                <div className="careers">
                    {CAREER_IDS.map((id) => (
                        <button
                            key={id}
                            className={`option ${career === id ? "picked" : ""}`}
                            onClick={() => setCareer(id)}
                        >
                            <b>{CAREERS[id].name}</b>
                            <span className="muted">{CAREERS[id].blurb}</span>
                            <span className="ward">{CAREERS[id].bonus}</span>
                        </button>
                    ))}
                </div>
                <div className="row">
                    <button className="btn" onClick={start}>
                        เริ่มคดี
                    </button>
                    <button className="btn ghost" onClick={store.showCodex}>
                        Codex ({codex.runs} คดี)
                    </button>
                    <input
                        className="seed"
                        placeholder="seed (ไม่บังคับ)"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                    />
                </div>
                <p className="muted small">
                    มหากาพย์: ชิ้นส่วนลายเซ็นฆาตกรต่อเนื่อง{" "}
                    {codex.epic.fragments.length}/3
                    {codex.epic.killerAdvantage > 0 &&
                        ` · ฆาตกรได้เปรียบ +${codex.epic.killerAdvantage}`}
                </p>
            </div>
        </div>
    );
}

export function CodexView({ codex }: { codex: CodexData }) {
    const [confirmReset, setConfirmReset] = useState(false);
    return (
        <div className="overlay">
            <div className="card codex">
                <div className="row spread">
                    <h2>Codex</h2>
                    <button className="btn ghost" onClick={store.showTitle}>
                        ← กลับ
                    </button>
                </div>
                <p className="muted">
                    กฎและลายเซ็นของสิ่งลี้ลับที่คุณรู้
                    เรียนรู้เพิ่มได้จากการไขคดี ค้นตำรา หรือแม้แต่คดีที่ล้มเหลว
                    · ไขแล้ว {codex.solved}/{codex.runs} คดี
                </p>
                <div className="creatures">
                    {CREATURE_IDS.map((c) => {
                        const unlocked = codex.unlockedCreatures.includes(c);
                        const def = CREATURES[c];
                        return (
                            <div
                                key={c}
                                className={`creature ${unlocked ? "" : "locked"}`}
                            >
                                <b>{unlocked ? def.name : "???"}</b>
                                <span className="muted">
                                    {unlocked
                                        ? def.blurb
                                        : "ไขคดีให้จบสักคดีเพื่อปลดล็อก"}
                                </span>
                                {unlocked && (
                                    <ul>
                                        {def.traits.map((t) =>
                                            codex.known[c].includes(t) ? (
                                                <li key={t} className="hit">
                                                    {TRAITS[t].name}
                                                </li>
                                            ) : (
                                                <li key={t} className="unknown">
                                                    ???
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                                {unlocked && (
                                    <span className="ward">
                                        ผนึกด้วย: {def.ward}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <h3>มหากาพย์: ช่างกลไร้หน้า</h3>
                <ul className="missed">
                    {EPIC_FRAGMENTS.map((f, i) => (
                        <li key={f}>
                            {codex.epic.fragments.includes(i) ? (
                                `🗝 ${f}`
                            ) : (
                                <span className="muted">
                                    ชิ้นส่วนที่ {i + 1} — ยังไม่พบ
                                    (ค้นโต๊ะของเหยื่อ)
                                </span>
                            )}
                        </li>
                    ))}
                    <li className="muted">
                        {codex.epic.fragments.length >= 3
                            ? "คดีปิดฉากพร้อมแล้ว... แต่ยังไม่อยู่ใน demo นี้"
                            : "รวบรวมครบ 3 ชิ้นเพื่อเปิดคดีปิดฉาก"}
                    </li>
                </ul>
                {codex.history.length > 0 && (
                    <>
                        <h3>คดีล่าสุด</h3>
                        <ul className="history">
                            {codex.history.map((h, i) => (
                                <li key={i}>
                                    <span className={`grade-sm g-${h.grade}`}>
                                        {h.grade}
                                    </span>{" "}
                                    #{h.seed.toString(16).toUpperCase()} ·{" "}
                                    {CREATURES[h.creature].name} · {h.score}{" "}
                                    คะแนน
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <div className="row">
                    {confirmReset ? (
                        <>
                            <span className="muted">ลบความคืบหน้าทั้งหมด?</span>
                            <button
                                className="btn danger"
                                onClick={() => {
                                    store.resetCodex();
                                    setConfirmReset(false);
                                }}
                            >
                                ยืนยันลบ
                            </button>
                            <button
                                className="btn ghost"
                                onClick={() => setConfirmReset(false)}
                            >
                                ยกเลิก
                            </button>
                        </>
                    ) : (
                        <button
                            className="btn ghost small"
                            onClick={() => setConfirmReset(true)}
                        >
                            รีเซ็ต Codex
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
