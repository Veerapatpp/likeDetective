// In-run draft options and the careers that bias them.

export type PerkCategory = "tool" | "technique" | "skill";

export type PerkId =
    | "brassLens"
    | "gasLantern"
    | "silverCompass"
    | "smellingSalts"
    | "readTheLie"
    | "rapport"
    | "keenEye"
    | "ironWill"
    | "allNighter"
    | "deduction"
    | "forbiddenLore"
    | "oldFiles";

/** Phases a perk still matters in; the draft never offers a perk whose phases are over. */
export type PerkPhase = "clues" | "witness" | "accuse";

export interface PerkDef {
    id: PerkId;
    category: PerkCategory;
    name: string;
    text: string;
    phases: PerkPhase[];
    /** Perks that have to be unlocked through the Codex before they enter the pool. */
    locked?: boolean;
}

export const PERKS: Record<PerkId, PerkDef> = {
    brassLens: {
        id: "brassLens",
        category: "tool",
        name: "เลนส์ขยายทองเหลือง",
        text: "ทุกการค้นและตรวจสอบใช้เวลาน้อยลง 10 นาที",
        phases: ["clues", "witness"],
    },
    gasLantern: {
        id: "gasLantern",
        category: "tool",
        name: "ตะเกียงแก๊สพกพา",
        text: "เดินทางไปสถานที่ในเมืองเร็วขึ้น 20 นาที",
        phases: ["clues"],
    },
    silverCompass: {
        id: "silverCompass",
        category: "tool",
        name: "เข็มทิศเงินชี้ลางร้าย",
        text: "ทำเครื่องหมายสถานที่ที่มีเบาะแสของสิ่งลี้ลับบนแผนที่",
        phases: ["clues"],
        locked: true,
    },
    smellingSalts: {
        id: "smellingSalts",
        category: "tool",
        name: "ขวดเกลือดม",
        text: "ฟื้นสติ (Sanity) 30 หน่วยทันที",
        phases: ["clues", "witness"],
    },
    readTheLie: {
        id: "readTheLie",
        category: "technique",
        name: "จับพิรุธ",
        text: "เมื่อถามข้อแก้ตัว จะรู้ทันทีว่าโกหกหรือไม่ ไม่ต้องไปตรวจสอบเอง",
        phases: ["witness"],
    },
    rapport: {
        id: "rapport",
        category: "technique",
        name: "สร้างความไว้ใจ",
        text: "คุยกับพยานใช้เวลาเพียงครึ่งเดียว",
        phases: ["witness"],
    },
    keenEye: {
        id: "keenEye",
        category: "technique",
        name: "สายตานักสังเกต",
        text: "การสังเกตผู้ต้องสงสัยไม่เสียเวลา",
        phases: ["witness"],
    },
    ironWill: {
        id: "ironWill",
        category: "skill",
        name: "จิตใจเหล็กกล้า",
        text: "เสียสติจากสิ่งที่เห็นเพียงครึ่งเดียว",
        phases: ["clues", "witness"],
    },
    allNighter: {
        id: "allNighter",
        category: "skill",
        name: "ทำงานข้ามคืน",
        text: "ได้เวลาเพิ่ม 40 นาทีในทุกเฟสที่เหลือ",
        phases: ["clues", "witness"],
    },
    deduction: {
        id: "deduction",
        category: "skill",
        name: "ตรรกะนิรนัย",
        text: "กระดานหลักฐานจะขีดฆ่าสิ่งลี้ลับที่เป็นไปไม่ได้จากเบาะแสที่พบ",
        phases: ["accuse"],
    },
    forbiddenLore: {
        id: "forbiddenLore",
        category: "skill",
        name: "ความรู้ต้องห้าม",
        text: "เรียนรู้ลายเซ็นที่ยังไม่รู้ 1 อย่างเข้า Codex ทันที แลกกับสติ 10",
        phases: ["clues", "witness", "accuse"],
    },
    oldFiles: {
        id: "oldFiles",
        category: "technique",
        name: "แฟ้มคดีเก่า",
        text: "ตำรวจยืนยันว่าผู้ต้องสงสัยหนึ่งคนบริสุทธิ์แน่นอน",
        phases: ["witness", "accuse"],
    },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

export type CareerId = "inspector" | "surgeon" | "occultist";

export interface CareerDef {
    id: CareerId;
    name: string;
    blurb: string;
    weights: Record<PerkCategory, number>;
    bonus: string;
}

export const CAREERS: Record<CareerId, CareerDef> = {
    inspector: {
        id: "inspector",
        name: "สารวัตรนอกราชการ",
        blurb: "ถูกไล่ออกจากกรมตำรวจเพราะรู้มากเกินไป ยังรู้วิธีทำให้คนพูด",
        weights: { tool: 1, technique: 3, skill: 1 },
        bonus: "คุยกับพยานแต่ละคนเร็วขึ้น 10 นาที",
    },
    surgeon: {
        id: "surgeon",
        name: "ศัลยแพทย์นิติเวช",
        blurb: "ผ่าศพมาหลายร้อยร่าง ศพที่ผิดธรรมชาติก็ยังพูดความจริงเสมอ",
        weights: { tool: 3, technique: 1, skill: 1 },
        bonus: "ชันสูตรอย่างละเอียดเร็วขึ้น 20 นาที และไม่เสียสติ",
    },
    occultist: {
        id: "occultist",
        name: "นักไสยศาสตร์สมัครเล่น",
        blurb: "อ่านตำราที่ไม่ควรอ่าน และยังมีสติเหลือพอจะเล่าให้ฟัง",
        weights: { tool: 1, technique: 1, skill: 3 },
        bonus: "เริ่มคดีด้วยสติ 120 และค้นตำราในหอสมุดเร็วขึ้น 20 นาที",
    },
};

export const CAREER_IDS = Object.keys(CAREERS) as CareerId[];
