// เทสต์เมนู action ในสถานที่ (เฟส 2)
import { describe, expect, it } from "vitest";
import { cluesAt } from "../src/game/core/caseGen";
import { CodexData, freshCodex } from "../src/game/core/codex";
import {
    LOCATION_ACTIONS,
    LocationId,
    Place,
    TRAITS,
    TraitId,
} from "../src/game/core/data";
import {
    Action,
    beginPhase,
    closeLocation,
    endPhase,
    hintedActions,
    openLocation,
    perform,
    pickPerk,
    RunState,
    startRun,
} from "../src/game/core/run";

const CEMETERY: LocationId = "cemetery";
const act = (action: string): Action => ({
    type: "locAction",
    location: CEMETERY,
    action,
});

/** เริ่มรันแล้วข้ามไปเฟส 2 (เก็บเบาะแส) โดยไม่เลือก perk */
const atCluesPhase = (seed: number) => {
    const codex = freshCodex();
    let run = beginPhase(startRun(seed, "inspector", codex));
    run = endPhase(run, codex);
    run = beginPhase(pickPerk(run, codex, null).run);
    expect(run.phase).toBe("clues");
    return { run, codex };
};

const step = (state: { run: RunState; codex: CodexData }, action: Action) =>
    perform(state.run, state.codex, action);

const cemeteryClues = (run: RunState) =>
    cluesAt(run.file, `loc:${CEMETERY}`).filter((c) => c.kind === "trait");

/** หา seed แรกที่คดีวาง/ไม่วางเบาะแสไว้ที่สุสาน */
const findSeed = (withClue: boolean) => {
    for (let seed = 1; seed < 5000; seed++) {
        const { run } = atCluesPhase(seed);
        if (cemeteryClues(run).length > 0 === withClue) return seed;
    }
    throw new Error("no seed found");
};

describe("location menus", () => {
    it("covers every clue that can be placed at a menu location", () => {
        for (const [location, menu] of Object.entries(LOCATION_ACTIONS)) {
            const place = `loc:${location}` as Place;
            const searchable = menu!.actions.flatMap((a) =>
                a.effect.kind === "search" ? a.effect.traits : [],
            );
            const placeable = (Object.keys(TRAITS) as TraitId[]).filter(
                (t) => TRAITS[t].clue[place],
            );
            expect(searchable.sort()).toEqual(
                expect.arrayContaining(placeable.sort()),
            );
        }
    });

    it("travel costs time once and opens the menu without revealing clues", () => {
        const state = atCluesPhase(findSeed(true));
        const before = state.run;

        // ทำ action ข้างในก่อนเดินทางไปไม่ได้
        expect(step(state, act("graves")).run).toBe(before);

        const { run } = step(state, { type: "visit", location: CEMETERY });
        expect(run.clock - before.clock).toBe(15);
        expect(run.openLocation).toBe(CEMETERY);
        expect(run.found).toEqual(before.found);
        expect(run.wasted).toEqual([]);

        // ออกแล้วกลับเข้าไปใหม่ไม่เสียเวลา
        const closed = closeLocation(run);
        expect(closed.openLocation).toBeNull();
        const reopened = openLocation(closed, CEMETERY);
        expect(reopened.openLocation).toBe(CEMETERY);
        expect(reopened.clock).toBe(run.clock);
    });

    it("the gravedigger points at the search that pays off", () => {
        const seed = findSeed(true);
        let state = atCluesPhase(seed);
        state = step(state, { type: "visit", location: CEMETERY });
        expect(hintedActions(state.run, CEMETERY)).toEqual([]);

        state = step(state, act("gravedigger"));
        const hinted = hintedActions(state.run, CEMETERY);
        expect(hinted.length).toBeGreaterThan(0);

        for (const id of hinted) state = step(state, act(id));
        for (const clue of cemeteryClues(state.run))
            expect(state.run.found).toContain(clue.id);

        // ทำซ้ำไม่ได้
        const again = step(state, act(hinted[0]));
        expect(again.run.clock).toBe(state.run.clock);
    });

    it("an empty search is recorded as wasted time", () => {
        let state = atCluesPhase(findSeed(false));
        state = step(state, { type: "visit", location: CEMETERY });
        state = step(state, act("gravedigger"));
        expect(hintedActions(state.run, CEMETERY)).toEqual([]);
        state = step(state, act("graves"));
        expect(state.run.wasted.map((w) => w.minutes)).toEqual([25]);
    });

    it("resting restores sanity up to the maximum", () => {
        let state = atCluesPhase(findSeed(true));
        state = step(state, { type: "visit", location: CEMETERY });
        const tired = { ...state.run, sanity: 50 };
        const rested = perform(tired, state.codex, act("chapel")).run;
        expect(rested.sanity).toBe(65);
        const full = perform(state.run, state.codex, act("chapel")).run;
        expect(full.sanity).toBe(state.run.maxSanity);
    });

    it("doing every action finds every cemetery clue across many seeds", () => {
        for (let seed = 1; seed <= 300; seed++) {
            let state = atCluesPhase(seed);
            state = step(state, { type: "visit", location: CEMETERY });
            for (const a of LOCATION_ACTIONS.cemetery!.actions)
                state = step(state, act(a.id));
            for (const clue of cemeteryClues(state.run))
                expect(state.run.found, `seed ${seed}`).toContain(clue.id);
        }
    });

    it("closes the menu when the phase ends", () => {
        const state = atCluesPhase(findSeed(true));
        const { run, codex } = step(state, {
            type: "visit",
            location: CEMETERY,
        });
        const next = pickPerk(endPhase(run, codex), codex, null).run;
        expect(next.phase).toBe("witness");
        expect(next.openLocation).toBeNull();
    });
});
