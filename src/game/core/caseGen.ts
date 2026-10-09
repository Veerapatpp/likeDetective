// Procedural case generation. Every case that leaves this module has been
// checked to be solvable: the full evidence points to exactly one creature
// and one suspect, and at least one placed clue separates the true answer
// from its closest look-alike.

import {
    ALIBI_PLACES,
    CREATURES,
    CreatureId,
    EPIC_FRAGMENTS,
    FIRST_NAMES,
    ITEMS,
    LAST_NAMES,
    MUNDANE_TELLS,
    OCCUPATIONS,
    Place,
    TRAITS,
    TraitId,
    VICTIM_FATES,
    WITNESSES,
} from "./data";
import { CodexData } from "./codex";
import { Rng } from "./rng";

export type ClueKind = "trait" | "time" | "victim" | "epic" | "sighting";

export interface Clue {
    id: string;
    place: Place;
    kind: ClueKind;
    text: string;
    trait?: TraitId;
}

export type AlibiStatus = "confirmed" | "lie" | "unverified";

export interface Suspect {
    id: string;
    name: string;
    occupation: string;
    item: string;
    tell: string;
    tellCreature?: CreatureId;
    alibiPlace: string;
    alibiStatus: AlibiStatus;
    alibiCheck: string;
}

export interface CaseFile {
    seed: number;
    victimName: string;
    victimJob: string;
    timeOfDeath: string;
    culprit: CreatureId;
    decoy: CreatureId;
    culpritSuspect: string;
    decoySuspect: string;
    sightingItem: string;
    clues: Clue[];
    suspects: Suspect[];
    witnessIds: string[];
    /** Placed traits that rule the decoy creature out. */
    keyTraits: TraitId[];
    epicFragment: number;
}

const fullName = (rng: Rng, used: Set<string>) => {
    for (;;) {
        const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
        if (!used.has(name)) {
            used.add(name);
            return name;
        }
    }
};

const shared = (a: CreatureId, b: CreatureId) =>
    CREATURES[a].traits.filter((t) => CREATURES[b].traits.includes(t)).length;

/** Creatures whose signature contains every given trait. */
export const consistentCreatures = (
    traits: TraitId[],
    pool: CreatureId[],
    signature: (c: CreatureId) => TraitId[] = (c) => CREATURES[c].traits,
) => pool.filter((c) => traits.every((t) => signature(c).includes(t)));

/** Suspects not ruled out by the sighting and by a confirmed alibi. */
export const consistentSuspects = (file: CaseFile) =>
    file.suspects.filter(
        (s) => s.item === file.sightingItem && s.alibiStatus !== "confirmed",
    );

const subsets = <T>(items: T[], size: number): T[][] => {
    if (size === 0) return [[]];
    if (items.length < size) return [];
    const [head, ...rest] = items;
    return [
        ...subsets(rest, size - 1).map((s) => [head, ...s]),
        ...subsets(rest, size),
    ];
};

export const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export interface ValidationResult {
    ok: boolean;
    problems: string[];
}

export const validateCase = (
    file: CaseFile,
    pool: CreatureId[],
): ValidationResult => {
    const problems: string[] = [];
    const placed = [
        ...new Set(
            file.clues.filter((c) => c.trait).map((c) => c.trait as TraitId),
        ),
    ];

    const creatures = consistentCreatures(placed, pool);
    if (creatures.length !== 1 || creatures[0] !== file.culprit)
        problems.push(`creature not unique: ${creatures.join(",")}`);

    if (
        !file.keyTraits.length ||
        file.keyTraits.some((t) => CREATURES[file.decoy].traits.includes(t))
    )
        problems.push("no clue separates culprit from decoy");

    const suspects = consistentSuspects(file);
    if (suspects.length !== 1 || suspects[0].id !== file.culpritSuspect)
        problems.push(
            `suspect not unique: ${suspects.map((s) => s.id).join(",")}`,
        );

    const byTell = file.suspects.filter((s) => s.tellCreature === file.culprit);
    if (byTell.length !== 1 || byTell[0].id !== file.culpritSuspect)
        problems.push("creature tell not unique");

    const decoy = file.suspects.find((s) => s.id === file.decoySuspect);
    if (!decoy || decoy.item !== file.sightingItem)
        problems.push("decoy suspect is not a near miss");

    if (!file.clues.some((c) => c.kind === "sighting"))
        problems.push("no sighting");

    return { ok: problems.length === 0, problems };
};

const tryGenerate = (
    rng: Rng,
    seed: number,
    codex: CodexData,
): CaseFile | null => {
    const pool = codex.unlockedCreatures;
    const culprit = rng.pick(pool);
    const others = pool.filter((c) => c !== culprit);
    const best = Math.max(...others.map((c) => shared(culprit, c)));
    const decoy = rng.pick(others.filter((c) => shared(culprit, c) === best));

    // Pick three of the culprit's four traits: unique among the pool, with at
    // least one the player's Codex already ties to the culprit and that the
    // decoy lacks, so the case is fair even with partial knowledge.
    const options = subsets(CREATURES[culprit].traits, 3).filter((set) => {
        if (consistentCreatures(set, pool).length !== 1) return false;
        return set.some(
            (t) =>
                !CREATURES[decoy].traits.includes(t) &&
                codex.known[culprit].includes(t),
        );
    });
    if (!options.length) return null;
    const traits = rng.pick(options);

    const witnessOrder = rng.shuffle(WITNESSES.map((w) => w.id));
    const sightingWitness = witnessOrder[0];
    const otherWitnesses = witnessOrder.slice(1);

    const clues: Clue[] = [];
    const usedPlaces = new Map<Place, number>();
    for (const trait of traits) {
        const places = Object.keys(TRAITS[trait].clue) as Place[];
        const fewest = Math.min(...places.map((p) => usedPlaces.get(p) ?? 0));
        const place = rng.pick(
            places.filter((p) => (usedPlaces.get(p) ?? 0) === fewest),
        );
        usedPlaces.set(place, (usedPlaces.get(place) ?? 0) + 1);
        const text = TRAITS[trait].clue[place] as string;
        clues.push({ id: `trait-${trait}`, place, kind: "trait", trait, text });
    }

    // Witness-borne traits go to a specific witness other than the sighting one.
    for (const clue of clues) {
        if (clue.place === "witness")
            clue.id = `${clue.id}@${rng.pick(otherWitnesses)}`;
    }

    const deathMinutes = 21 * 60 + rng.int(0, 10) * 15;
    const timeOfDeath = formatTime(deathMinutes);
    clues.push({
        id: "time",
        place: "scene:body",
        kind: "time",
        text: `ร่างกายเย็นและแข็งตัวแล้ว ประเมินเวลาเสียชีวิตได้ราว ${timeOfDeath} น.`,
    });

    const used = new Set<string>();
    const victimName = fullName(rng, used);
    const victimJob = rng.pick(VICTIM_FATES);
    clues.push({
        id: "victim",
        place: "scene:desk",
        kind: "victim",
        text: `จดหมายบนโต๊ะจ่าหน้าถึง ${victimName} ${victimJob} ฉบับสุดท้ายเขียนว่า "ฉันรู้แล้วว่าเขาเป็นอะไร"`,
    });

    const epicFragment = rng.int(0, EPIC_FRAGMENTS.length - 1);
    clues.push({
        id: "epic",
        place: "scene:desk",
        kind: "epic",
        text: `ซุกอยู่ใต้กองจดหมาย: ${EPIC_FRAGMENTS[epicFragment]}`,
    });

    // Suspects: the culprit and a near-miss share the sighted item.
    const items = rng.shuffle(ITEMS);
    const sightingItem = items[0];
    const tells = rng.shuffle(MUNDANE_TELLS);
    const alibis = rng.shuffle(ALIBI_PLACES);
    const occupations = rng.shuffle(OCCUPATIONS);
    const roles = rng.shuffle(["culprit", "decoy", "other", "other"] as const);
    let otherIndex = 1;
    const suspects: Suspect[] = roles.map((role, i) => {
        const name = fullName(rng, used);
        const alibiPlace = alibis[i];
        const base = {
            id: `s${i}`,
            name,
            occupation: occupations[i],
            alibiPlace,
        };
        if (role === "culprit") {
            return {
                ...base,
                item: sightingItem,
                tell: CREATURES[culprit].tell,
                tellCreature: culprit,
                alibiStatus: "lie" as const,
                alibiCheck: `คนที่${alibiPlace}ยืนยันว่า${name}ออกไปก่อน ${timeOfDeath} น. นานพอสมควร และกลับมาในสภาพเปียกโชก`,
            };
        }
        if (role === "decoy") {
            return {
                ...base,
                item: sightingItem,
                tell: CREATURES[decoy].tell,
                tellCreature: decoy,
                alibiStatus: "confirmed" as const,
                alibiCheck: `มีพยานหลายคนยืนยันว่า${name}อยู่ที่${alibiPlace}ตลอดช่วงเวลาเกิดเหตุ`,
            };
        }
        const status: AlibiStatus =
            rng.next() < 0.5 ? "confirmed" : "unverified";
        return {
            ...base,
            item: items[otherIndex++],
            tell: tells[i],
            alibiStatus: status,
            alibiCheck:
                status === "confirmed"
                    ? `เจ้าของ${alibiPlace}จำ${name}ได้ อยู่ที่นั่นจนดึก`
                    : `ไม่มีใครที่${alibiPlace}จำได้ว่าเห็น${name}หรือไม่ ข้อแก้ตัวนี้พิสูจน์ไม่ได้`,
        };
    });

    const sightingTime = formatTime(deathMinutes + rng.int(1, 4) * 5);
    clues.push({
        id: `sighting@${sightingWitness}`,
        place: "witness",
        kind: "sighting",
        text: `"ราว ${sightingTime} น. ฉันเห็นเงาคนสวม${sightingItem}รีบเดินออกมาจากตึก หน้าตามองไม่ชัดเพราะหมอก"`,
    });

    const culpritSuspect = suspects[roles.indexOf("culprit")].id;
    const decoySuspect = suspects[roles.indexOf("decoy")].id;
    const keyTraits = traits.filter(
        (t) => !CREATURES[decoy].traits.includes(t),
    );

    return {
        seed,
        victimName,
        victimJob,
        timeOfDeath,
        culprit,
        decoy,
        culpritSuspect,
        decoySuspect,
        sightingItem,
        clues,
        suspects,
        witnessIds: WITNESSES.map((w) => w.id),
        keyTraits,
        epicFragment,
    };
};

export const generateCase = (seed: number, codex: CodexData): CaseFile => {
    const rng = new Rng(seed);
    for (let attempt = 0; attempt < 50; attempt++) {
        const file = tryGenerate(rng, seed, codex);
        if (file && validateCase(file, codex.unlockedCreatures).ok) return file;
    }
    throw new Error(`could not generate a solvable case for seed ${seed}`);
};

/** Clues found at a place. Witness clues are addressed as `witness@<id>`. */
export const cluesAt = (file: CaseFile, place: Place, witnessId?: string) =>
    file.clues.filter(
        (c) =>
            c.place === place &&
            (place !== "witness" || c.id.endsWith(`@${witnessId}`)),
    );
