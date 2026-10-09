// Static content for the demo. Everything here is original to this project:
// creature archetypes are generic folklore, but names, places and text are ours.

export type TraitId =
    | "claws"
    | "fur"
    | "moon"
    | "gnawed"
    | "drained"
    | "neck"
    | "noforce"
    | "soil"
    | "rot"
    | "salt"
    | "glyph"
    | "whisper";

export type CreatureId = "werewolf" | "vampire" | "ghoul" | "deepborn";

export type SceneSpotId =
    "body" | "bodyDeep" | "door" | "window" | "floor" | "wall" | "desk";

export type LocationId =
    | "alley"
    | "cemetery"
    | "docks"
    | "library"
    | "sewer"
    | "pressworks"
    | "abattoir";

/** Where a clue can be found: a crime-scene hotspot, a city location, or a witness. */
export type Place = `scene:${SceneSpotId}` | `loc:${LocationId}` | "witness";

export interface TraitDef {
    id: TraitId;
    name: string;
    clue: Partial<Record<Place, string>>;
}

export interface CreatureDef {
    id: CreatureId;
    name: string;
    kind: "gothic" | "outer";
    blurb: string;
    traits: TraitId[];
    /** What the creature's human disguise gives away under close observation. */
    tell: string;
    /** How the creature is properly put down; used in the reveal. */
    ward: string;
}

export const TRAITS: Record<TraitId, TraitDef> = {
    claws: {
        id: "claws",
        name: "รอยกรงเล็บ",
        clue: {
            "scene:body":
                "รอยฉีกขาดสามแนวขนานกันพาดจากไหล่ถึงสีข้าง ลึกเกินกว่ามีดใดๆ จะทำได้",
            "scene:wall":
                "วอลเปเปอร์ถูกข่วนเป็นร่องลึกสามแนว ราวกับมีอะไรตะกุยตัวขึ้นไป",
        },
    },
    fur: {
        id: "fur",
        name: "ขนสัตว์หยาบ",
        clue: {
            "scene:window":
                "ขนหยาบสีเทาเข้มติดอยู่ที่เสี้ยนไม้ของกรอบหน้าต่าง ยาวเกินกว่าขนสุนัข",
            "scene:floor":
                "กระจุกขนสีเทาหยาบกระจายอยู่ใต้โต๊ะ มีกลิ่นสาบสัตว์ป่า",
            "loc:alley":
                "กองขยะในตรอกมีขนสีเทาหยาบติดอยู่เป็นกระจุก และรอยเท้าที่ไม่ใช่ทั้งคนและสุนัข",
        },
    },
    moon: {
        id: "moon",
        name: "คืนจันทร์เต็มดวง",
        clue: {
            "loc:library":
                "ปฏิทินดาราศาสตร์ระบุว่าคืนเกิดเหตุคือคืนจันทร์เต็มดวง ตรงกับคดีปริศนาสามคดีเมื่อปีก่อน",
            witness:
                '"คืนนั้นพระจันทร์ทั้งดวงลอยทะลุหมอกออกมา สว่างจนน่ากลัว แล้วผมก็ได้ยินเสียงหอน"',
        },
    },
    gnawed: {
        id: "gnawed",
        name: "รอยแทะ",
        clue: {
            "scene:bodyDeep":
                "ใต้เสื้อผ้า กระดูกซี่โครงมีรอยฟันแทะ เนื้อบางส่วนหายไป",
            "loc:abattoir":
                "คนงานโรงฆ่าสัตว์บ่นว่าซากในห้องเย็นถูกแทะกลางดึกมาหลายคืน รอยฟันไม่ใช่หนู",
        },
    },
    drained: {
        id: "drained",
        name: "เลือดถูกสูบ",
        clue: {
            "scene:body":
                "ศพซีดขาวราวขี้ผึ้ง แทบไม่มีเลือดหลงเหลือ แต่พื้นรอบตัวกลับสะอาด",
        },
    },
    neck: {
        id: "neck",
        name: "รอยเจาะคู่",
        clue: {
            "scene:bodyDeep":
                "เมื่อแหวกปกเสื้อ พบรอยเจาะกลมเล็กสองรอยที่ลำคอ ห่างกันราวสองนิ้ว",
        },
    },
    noforce: {
        id: "noforce",
        name: "เข้ามาโดยไม่งัดแงะ",
        clue: {
            "scene:door":
                "กลอนประตูไม่มีรอยงัด และถูกปลดจากด้านใน เหยื่อเปิดประตูให้คนร้ายเอง",
        },
    },
    soil: {
        id: "soil",
        name: "ดินหลุมศพ",
        clue: {
            "scene:floor":
                "รอยเท้าเปื้อนดินชื้นสีดำ ปนเศษรากไม้และกลีบดอกไม้เหี่ยวแบบที่ใช้วางหน้าหลุมศพ",
            "loc:cemetery":
                "หลุมศพใหม่หลุมหนึ่งถูกขุดจากด้านล่างขึ้นมา ดินสีดำแบบเดียวกันเกลื่อนทางเดิน",
        },
    },
    rot: {
        id: "rot",
        name: "กลิ่นเน่า",
        clue: {
            "loc:sewer":
                "ในท่อระบายน้ำมีโพรงเล็กๆ ที่ถูกใช้เป็นรัง กลิ่นเนื้อเน่าคลุ้งจนแสบตา",
            "loc:cemetery":
                "ห้องเก็บศพของสุสานส่งกลิ่นเน่าผิดปกติ ทั้งที่ไม่มีศพรอฝังมาหลายวันแล้ว",
        },
    },
    salt: {
        id: "salt",
        name: "คราบเกลือทะเล",
        clue: {
            "scene:floor":
                "คราบเกลือขาวแห้งกรังเป็นรูปรอยเท้าเปียก ทั้งที่เมืองนี้อยู่ห่างทะเลหลายไมล์",
            "loc:docks":
                "บนท่าเทียบเรือมีรอยเท้าเปียกเดินขึ้นมาจากน้ำ ทิ้งคราบเกลือไว้ แต่ไม่มีรอยเดินลงไป",
        },
    },
    glyph: {
        id: "glyph",
        name: "สัญลักษณ์บิดเบี้ยว",
        clue: {
            "scene:wall":
                "บนผนังมีสัญลักษณ์เรขาคณิตที่มุมของมันดูไม่ลงตัวกัน ยิ่งมองนานยิ่งปวดหัว",
            "loc:pressworks":
                "แท่นพิมพ์ในโรงพิมพ์ร้างถูกใช้พิมพ์สัญลักษณ์ซ้ำๆ เต็มกระดาษหลายร้อยแผ่น",
        },
    },
    whisper: {
        id: "whisper",
        name: "เสียงกระซิบ/เวลาหาย",
        clue: {
            witness:
                '"ผม... จำไม่ได้ว่าชั่วโมงนั้นหายไปไหน รู้แต่ว่าหูยังได้ยินเสียงกระซิบเหมือนคลื่นอยู่เลย"',
            "loc:pressworks":
                'คนเร่ร่อนที่นอนในโรงพิมพ์ร้างพึมพำซ้ำๆ ว่า "มันขึ้นมาจากน้ำ มันกระซิบชื่อเรา"',
        },
    },
};

export const CREATURES: Record<CreatureId, CreatureDef> = {
    werewolf: {
        id: "werewolf",
        name: "มนุษย์หมาป่า",
        kind: "gothic",
        blurb: "คนธรรมดาในเวลากลางวัน สัตว์ล่าเหยื่อเมื่อจันทร์เต็มดวง",
        traits: ["claws", "fur", "moon", "gnawed"],
        tell: "มือทั้งสองพันผ้าพันแผลลวกๆ ใต้เล็บมีคราบเลือดแห้ง",
        ward: "กระสุนเงิน",
    },
    vampire: {
        id: "vampire",
        name: "แวมไพร์",
        kind: "gothic",
        blurb: "ขุนนางแห่งรัตติกาล เข้าบ้านได้เมื่อถูกเชิญเท่านั้น",
        traits: ["drained", "neck", "noforce", "soil"],
        tell: "ผิวซีดและเย็นเฉียบ คอยเบี่ยงตัวหลบแสงตะเกียงตลอดเวลา",
        ward: "หลักไม้ปักอก",
    },
    ghoul: {
        id: "ghoul",
        name: "กูล",
        kind: "gothic",
        blurb: "ผู้กินซากที่ขุดขึ้นมาจากหลุมศพ แล้วเริ่มหิวของสด",
        traits: ["gnawed", "soil", "rot", "claws"],
        tell: "เล็บดำคล้ำมีดินอัดแน่น ตัวมีกลิ่นอับชื้นเหมือนห้องใต้ดิน",
        ward: "ไฟเผาและเกลือศักดิ์สิทธิ์",
    },
    deepborn: {
        id: "deepborn",
        name: "ผู้มาจากห้วงลึก",
        kind: "outer",
        blurb: "บางสิ่งจากใต้ทะเลที่สวมเปลือกมนุษย์ เหตุผลของมันไม่ใช่ของเรา",
        traits: ["salt", "glyph", "whisper", "noforce"],
        tell: "ระหว่างนิ้วมีพังผืดบางๆ ดวงตาแทบไม่กะพริบเลย",
        ward: "การทำลายสัญลักษณ์ที่ยึดมันไว้กับฝั่ง",
    },
};

export const CREATURE_IDS = Object.keys(CREATURES) as CreatureId[];

export interface SpotDef {
    id: SceneSpotId;
    label: string;
    cost: number;
    sanity: number;
    empty: string;
}

export const SCENE_SPOTS: Record<SceneSpotId, SpotDef> = {
    body: {
        id: "body",
        label: "สำรวจศพ",
        cost: 20,
        sanity: 5,
        empty: "ศพนอนคว่ำหน้า ดวงตาเบิกค้างด้วยความหวาดกลัว",
    },
    bodyDeep: {
        id: "bodyDeep",
        label: "ชันสูตรอย่างละเอียด",
        cost: 40,
        sanity: 10,
        empty: "ใต้เสื้อผ้าไม่พบบาดแผลเพิ่มเติม มีเพียงรอยฟกช้ำจากการล้ม",
    },
    door: {
        id: "door",
        label: "ตรวจประตู",
        cost: 20,
        sanity: 0,
        empty: "กลอนประตูหักงอ แต่ตำรวจยอมรับว่าพวกเขาพังเข้ามาเองตอนพบศพ",
    },
    window: {
        id: "window",
        label: "ตรวจหน้าต่าง",
        cost: 20,
        sanity: 0,
        empty: "หน้าต่างปิดสนิท คราบเขม่าจากปล่องโรงงานเกาะหนาเป็นชั้น",
    },
    floor: {
        id: "floor",
        label: "ตรวจพื้นห้อง",
        cost: 30,
        sanity: 0,
        empty: "พื้นไม้มีแต่รอยรองเท้าบู๊ตของตำรวจเหยียบย่ำไปทั่ว",
    },
    wall: {
        id: "wall",
        label: "ตรวจผนัง",
        cost: 20,
        sanity: 5,
        empty: "วอลเปเปอร์ลายดอกไม้ซีดจาง มีเพียงคราบความชื้นตามมุมห้อง",
    },
    desk: { id: "desk", label: "ค้นโต๊ะทำงาน", cost: 20, sanity: 0, empty: "" },
};

export const SCENE_SPOT_IDS = Object.keys(SCENE_SPOTS) as SceneSpotId[];

export interface LocationDef {
    id: LocationId;
    name: string;
    cost: number;
    sanity: number;
    rumor: string;
    empty: string;
}

export const LOCATIONS: Record<LocationId, LocationDef> = {
    alley: {
        id: "alley",
        name: "ตรอกหลังโรงหลอม",
        cost: 40,
        sanity: 0,
        rumor: "ทางหนีที่ใกล้ที่สุดจากที่เกิดเหตุ",
        empty: "มีแต่แมวจรและน้ำมันเครื่องเจิ่งนอง ไม่มีร่องรอยที่ใช้ได้",
    },
    cemetery: {
        id: "cemetery",
        name: "สุสานเนินเถ้า",
        cost: 50,
        sanity: 5,
        rumor: "สัปเหร่อบ่นว่ามีคนแอบเข้ามาตอนกลางคืน",
        empty: "หลุมศพเรียงรายเงียบสงบ ไม่มีอะไรถูกรบกวน",
    },
    docks: {
        id: "docks",
        name: "ท่าเรือหมอกดำ",
        cost: 50,
        sanity: 0,
        rumor: "ชาวประมงเห็นบางอย่างลอยอยู่ใต้น้ำ",
        empty: "เรือกลไฟจอดนิ่ง คนงานท่าเรือไม่เห็นอะไรผิดปกติ",
    },
    library: {
        id: "library",
        name: "หอสมุดสมาคมกลไก",
        cost: 40,
        sanity: 0,
        rumor: "บันทึกดาราศาสตร์และตำราโบราณ",
        empty: "บรรณารักษ์ไม่พบบันทึกที่เกี่ยวกับคืนนั้น",
    },
    sewer: {
        id: "sewer",
        name: "ท่อระบายน้ำใต้เมือง",
        cost: 60,
        sanity: 10,
        rumor: "คนงานท่อหายตัวไปหนึ่งคนเมื่อสัปดาห์ก่อน",
        empty: "น้ำเสียไหลเอื่อย หนูตัวโตวิ่งหนีแสงตะเกียง ไม่มีอะไรอื่น",
    },
    pressworks: {
        id: "pressworks",
        name: "โรงพิมพ์ร้าง",
        cost: 50,
        sanity: 10,
        rumor: "มีแสงไฟลอดออกมาทั้งที่ปิดไปหลายปี",
        empty: "ฝุ่นหนาเตอะ แท่นพิมพ์ขึ้นสนิมเงียบสนิท",
    },
    abattoir: {
        id: "abattoir",
        name: "โรงฆ่าสัตว์ฝั่งตะวันออก",
        cost: 40,
        sanity: 5,
        rumor: "ซากสัตว์ในห้องเย็นหายไปบ่อยๆ",
        empty: "คนงานยืนยันว่าทุกอย่างปกติ นอกจากกลิ่นที่ติดจมูกไปอีกหลายวัน",
    },
};

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

/** The library always offers a lore search that teaches a missing Codex entry. */
export const LIBRARY_RESEARCH = { cost: 50, sanity: 10 };

export const FIRST_NAMES = [
    "อีไลจาห์",
    "มาร์ธา",
    "ออสวิน",
    "ไวโอเล็ต",
    "โทเบียส",
    "เอดา",
    "ซีลาส",
    "เฮนเรียตตา",
    "ฟีเนียส",
    "คอร์เดเลีย",
    "แอมโบรส",
    "เบียทริซ",
    "ลูเซียน",
    "ออกัสตา",
    "เจเรไมอาห์",
    "โรวีนา",
];

export const LAST_NAMES = [
    "ครอว์ลีย์",
    "เวนไรท์",
    "เฮลมอร์",
    "แอชบี",
    "กริมชอว์",
    "ฟินช์",
    "มอร์เดน",
    "โคลเบิร์น",
    "แบล็กวูด",
    "ฮาร์โกรฟ",
    "ธอร์นตัน",
    "เพมเบอร์",
    "สเตอร์ลิง",
    "ไวต์เลอร์",
];

export const OCCUPATIONS = [
    "ช่างหม้อไอน้ำ",
    "คนจุดตะเกียงแก๊ส",
    "สัปเหร่อ",
    "ชาวประมง",
    "นักเคมีประจำโรงงาน",
    "คนขายเนื้อ",
    "ครูสอนเปียโน",
    "เสมียนสถานีรถจักร",
    "ขุนนางตกยาก",
    "ช่างซ่อมนาฬิกา",
    "นักข่าวหนังสือพิมพ์",
    "พยาบาลโรงพยาบาลคนจน",
];

export const ITEMS = [
    "หมวกทรงสูง",
    "เสื้อคลุมยาวสีเทา",
    "ผ้าพันคอสีแดงเข้ม",
    "ไม้เท้าหัวทองเหลือง",
    "แว่นกันลมทรงกลม",
    "ร่มสีดำคันยาว",
];

export const MUNDANE_TELLS = [
    "มีกลิ่นยาสูบติดเสื้อผ้า นิ้วเหลืองเพราะคราบนิโคติน",
    "มือเปื้อนน้ำมันเครื่องจนดำ เล็บสั้นกุด",
    "ไอค่อกแค่กตลอดเวลา น่าจะเป็นปอดจากควันโรงงาน",
    "นิ้วเปื้อนหมึก มีกระดาษจดยัดอยู่ในกระเป๋าเสื้อ",
    "ดวงตาแดงก่ำเหมือนไม่ได้นอนมาหลายคืน",
];

export const ALIBI_PLACES = [
    "ร้านเหล้าตะเกียงแตก",
    "โรงละครเพลิงเงิน",
    "ห้องรอของสถานีรถจักร",
    "โบสถ์เซนต์ออร์ริน",
    "ร้านน้ำชาของมาดามเกรย์",
];

export const VICTIM_FATES = [
    "นักบัญชีของโรงหลอมเหล็ก",
    "ช่างภาพที่เพิ่งย้ายมาเมืองนี้",
    "หญิงม่ายเจ้าของห้องเช่า",
    "วิศวกรรถจักรไอน้ำ",
    "หมอประจำย่านโรงงาน",
];

export interface WitnessDef {
    id: string;
    name: string;
    role: string;
    cost: number;
}

export const WITNESSES: WitnessDef[] = [
    {
        id: "finder",
        name: "แม่บ้านผู้พบศพ",
        role: "มาทำความสะอาดตอนดึกแล้วพบศพ",
        cost: 30,
    },
    {
        id: "lamplighter",
        name: "คนจุดตะเกียงประจำถนน",
        role: "เดินตรวจตะเกียงทั้งคืน",
        cost: 30,
    },
    {
        id: "newsboy",
        name: "เด็กขายหนังสือพิมพ์",
        role: "นอนอยู่ใต้ชายคาฝั่งตรงข้าม",
        cost: 20,
    },
];

export const SUSPECT_COSTS = { observe: 15, alibi: 20, verify: 40 };

export const PHASE_BUDGET = { scene: 120, clues: 150, witness: 150 };

/** The investigation starts at midnight, after the body is found. */
export const START_MINUTES = 0;

/** The serial killer's calling card for the cross-run epic. */
export const EPIC_FRAGMENTS = [
    'ไพ่ทาโรต์ไหม้ครึ่งใบ รูป "หอคอย" มีรอยเฟืองประทับที่มุม',
    'เฟืองทองเหลืองขนาดเล็กสลักอักษร "II" ถูกวางไว้บนอกเหยื่อ',
    "แผ่นเสียงแตกร้าว เมื่อเล่นจะได้ยินเสียงนาฬิกาเดินถอยหลัง",
];
