// เมนู action ภายในสถานที่ (แบบเกม Walk of Life)
// เปิดขึ้นมาเมื่อผู้เล่นเดินทางเข้าสถานที่ที่มีเมนู (ดู LOCATION_ACTIONS ใน data.ts)
// ผู้เล่นเลือกทำ action ได้ทีละอย่าง แต่ละอย่างกินเวลาของเฟส แล้วกดออกเพื่อกลับแผนที่

import { LOCATIONS, LocationId, locationMenu } from "../game/core/data";
import { store } from "../game/core/store";
import {
    Action,
    actionKey,
    canDo,
    hintedActions,
    remaining,
    RunState,
    timeCost,
} from "../game/core/run";

const EFFECT_TAGS = {
    search: "ค้นหา",
    hint: "สอบถาม",
    rest: "พักฟื้น",
};

export function LocationMenu({
    run,
    location,
}: {
    run: RunState;
    location: LocationId;
}) {
    const menu = locationMenu(location);
    if (!menu) return null;
    const hinted = hintedActions(run, location);
    // ผลของ action ล่าสุดในสถานที่นี้ แสดงในเมนูเลย ไม่ต้องหันไปดูสมุดบันทึก
    const last = run.notes[run.notes.length - 1];

    return (
        <div className="overlay">
            <div className="card loc-menu">
                <div className="row spread">
                    <div>
                        <div className="eyebrow">สถานที่</div>
                        <h2>{LOCATIONS[location].name}</h2>
                    </div>
                    <span className="muted">
                        เหลือเวลา {remaining(run)} นาที
                    </span>
                </div>
                <p className="muted">{menu.intro}</p>

                <div className="loc-actions">
                    {menu.actions.map((def) => {
                        const action: Action = {
                            type: "locAction",
                            location,
                            action: def.id,
                        };
                        const check = canDo(run, action);
                        const done = run.done.includes(actionKey(action));
                        return (
                            <button
                                key={def.id}
                                className={`loc-action ${done ? "done" : ""}`}
                                disabled={!check.ok}
                                onClick={() => store.act(action)}
                                title={check.ok ? "" : check.reason}
                            >
                                <span className="icon" aria-hidden>
                                    {def.icon}
                                </span>
                                <span className="body">
                                    <b>
                                        {def.label}
                                        {hinted.includes(def.id) && !done && (
                                            <span className="tag">
                                                มีคนแนะนำ
                                            </span>
                                        )}
                                    </b>
                                    <span className="muted">{def.desc}</span>
                                    <span className="meta">
                                        {EFFECT_TAGS[def.effect.kind]} ·{" "}
                                        {timeCost(run, action)} นาที
                                        {def.sanity > 0 && " · เสียสติ"}
                                        {def.effect.kind === "rest" &&
                                            ` · สติ +${def.effect.sanity}`}
                                    </span>
                                </span>
                                <span className="state">
                                    {done
                                        ? "✓ ทำแล้ว"
                                        : check.ok
                                          ? ""
                                          : check.reason}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {last && (
                    <div className="loc-result" key={last.id}>
                        <div className="src">{last.source}</div>
                        <p>{last.text}</p>
                    </div>
                )}

                <div className="row">
                    <button className="btn ghost" onClick={store.leaveLocation}>
                        ← กลับไปที่แผนที่
                    </button>
                </div>
            </div>
        </div>
    );
}
