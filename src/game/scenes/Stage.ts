// The single Phaser scene. It draws whichever backdrop the current phase needs
// out of plain shapes (silhouettes on fog), and turns hotspots into actions.

import * as Phaser from "phaser";
import { LOCATIONS, LocationId, SCENE_SPOTS, SceneSpotId } from "../core/data";
import { cluesAt } from "../core/caseGen";
import { GameState, store } from "../core/store";
import { Action, actionKey, canDo, hasMenu, timeCost } from "../core/run";

const W = 1280;
const H = 720;
const FONT = '"Sarabun", "Noto Sans Thai", Tahoma, sans-serif';
const INK = 0x07080a;
const BRASS = 0xc9a45c;
const LAMP = 0xffc874;

type View = "title" | "scene" | "clues" | "office";

interface Hotspot {
    action: Action;
    label: string;
    zone: Phaser.GameObjects.Zone;
    outline: Phaser.GameObjects.Graphics;
    tag: Phaser.GameObjects.Text;
    mark?: Phaser.GameObjects.Graphics;
    shape: { x: number; y: number; w: number; h: number; round?: boolean };
}

const viewFor = (state: GameState): View => {
    if (state.screen !== "run" || !state.run) return "title";
    if (state.run.phase === "scene") return "scene";
    if (state.run.phase === "clues") return "clues";
    return "office";
};

export class Stage extends Phaser.Scene {
    private view: View | null = null;
    private layer: Phaser.GameObjects.Container;
    private fog: Phaser.GameObjects.Container;
    private hotspots: Hotspot[] = [];
    private unsubscribe?: () => void;
    private vignette: Phaser.GameObjects.Graphics;
    private vignetteImage: Phaser.GameObjects.Image;

    constructor() {
        super("Stage");
    }

    create() {
        this.cameras.main.setBackgroundColor(0x101317);
        this.layer = this.add.container(0, 0);
        this.fog = this.add.container(0, 0).setDepth(50);
        this.vignette = this.add.graphics().setDepth(61);
        this.makeFog();
        this.drawVignette(1);

        this.unsubscribe = store.subscribe((s) => this.sync(s));
        this.events.once("shutdown", () => this.unsubscribe?.());
        this.sync(store.get());
    }

    // ---------------------------------------------------------------- sync

    private sync(state: GameState) {
        const view = viewFor(state);
        if (view !== this.view) {
            this.view = view;
            this.build(view, state);
        }
        this.refreshHotspots(state);
        const run = state.run;
        const sanity = run ? run.sanity / run.maxSanity : 1;
        this.drawVignette(sanity);
    }

    private build(view: View, state: GameState) {
        this.hotspots.forEach((h) => h.tag.destroy());
        this.layer.removeAll(true);
        this.hotspots = [];
        this.drawSky(view);
        if (view === "title") this.drawCity();
        if (view === "scene") this.drawRoom();
        if (view === "clues") this.drawMap(state);
        if (view === "office") this.drawOffice();
        this.layer.setAlpha(0);
        this.tweens.add({ targets: this.layer, alpha: 1, duration: 600 });
    }

    // ---------------------------------------------------------------- atmosphere

    private makeFog() {
        for (let i = 0; i < 26; i++) {
            const blob = this.add.ellipse(
                Phaser.Math.Between(-200, W + 200),
                Phaser.Math.Between(0, H),
                Phaser.Math.Between(300, 700),
                Phaser.Math.Between(120, 260),
                0xb8c0c8,
                Phaser.Math.FloatBetween(0.02, 0.045),
            );
            this.fog.add(blob);
            const drift = () => {
                this.tweens.add({
                    targets: blob,
                    x: blob.x + Phaser.Math.Between(-260, 260),
                    y: Phaser.Math.Clamp(
                        blob.y + Phaser.Math.Between(-60, 60),
                        0,
                        H,
                    ),
                    duration: Phaser.Math.Between(9000, 16000),
                    ease: "Sine.easeInOut",
                    onComplete: drift,
                });
            };
            drift();
        }
    }

    private drawVignette(sanity: number) {
        if (!this.textures.exists("vignette")) {
            const tex = this.textures.createCanvas("vignette", W, H)!;
            const ctx = tex.getContext();
            const grad = ctx.createRadialGradient(
                W / 2,
                H / 2,
                H * 0.25,
                W / 2,
                H / 2,
                W * 0.65,
            );
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,1)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
            tex.refresh();
            this.vignetteImage = this.add
                .image(W / 2, H / 2, "vignette")
                .setDepth(60);
        }
        // Losing sanity closes the dark in and bleeds red into the edges.
        this.vignetteImage.setAlpha(0.7 + (1 - sanity) * 0.3);
        const g = this.vignette;
        g.clear();
        if (sanity < 0.3) {
            g.fillStyle(0x5a0f0f, (0.3 - sanity) * 0.6);
            g.fillRect(0, 0, W, H);
        }
    }

    private drawSky(view: View) {
        const g = this.add.graphics();
        const top = view === "office" ? 0x16130f : 0x1a2028;
        g.fillGradientStyle(top, top, 0x07090b, 0x07090b, 1);
        g.fillRect(0, 0, W, H);
        this.layer.add(g);
    }

    private lamp(x: number, y: number, radius = 140) {
        const glow = this.add.graphics();
        for (let r = radius; r > 0; r -= 14) {
            glow.fillStyle(LAMP, 0.018 + (1 - r / radius) * 0.05);
            glow.fillCircle(x, y, r);
        }
        glow.fillStyle(0xfff1c9, 0.95);
        glow.fillCircle(x, y, 6);
        this.layer.add(glow);
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.75, to: 1 },
            duration: Phaser.Math.Between(90, 180),
            yoyo: true,
            repeat: -1,
            repeatDelay: Phaser.Math.Between(400, 2600),
        });
    }

    private moon(x: number, y: number) {
        const g = this.add.graphics();
        for (let r = 110; r > 40; r -= 10) {
            g.fillStyle(0xdfe6ea, 0.012 + (1 - r / 110) * 0.03);
            g.fillCircle(x, y, r);
        }
        g.fillStyle(0xcfd6d8, 0.8);
        g.fillCircle(x, y, 38);
        this.layer.add(g);
    }

    // ---------------------------------------------------------------- views

    private drawCity() {
        this.moon(980, 150);
        const g = this.add.graphics();
        const rows: [number, number][] = [
            [0x161b21, 470],
            [0x0e1115, 540],
            [INK, 610],
        ];
        rows.forEach(([color, base], row) => {
            g.fillStyle(color, 1);
            let x = -20;
            const rand = new Phaser.Math.RandomDataGenerator([`city${row}`]);
            while (x < W + 40) {
                const w = rand.between(50, 130);
                const h = rand.between(80, 260) - row * 30;
                g.fillRect(x, base - h, w, H - base + h);
                if (rand.frac() < 0.35) {
                    const cx = x + rand.between(8, w - 20);
                    g.fillRect(cx, base - h - rand.between(40, 120), 14, 140);
                }
                if (rand.frac() < 0.3) {
                    g.fillTriangle(
                        x,
                        base - h,
                        x + w / 2,
                        base - h - rand.between(30, 70),
                        x + w,
                        base - h,
                    );
                }
                if (row === 1) {
                    g.fillStyle(LAMP, 0.35);
                    for (let i = 0; i < 3; i++)
                        if (rand.frac() < 0.4)
                            g.fillRect(
                                x + 10 + i * 18,
                                base - h + 30 + rand.between(0, 80),
                                7,
                                10,
                            );
                    g.fillStyle(color, 1);
                }
                x += w + rand.between(0, 18);
            }
        });
        this.layer.add(g);
        this.lamp(220, 560, 160);
        this.lamp(1080, 590, 120);
        const post = this.add.graphics();
        post.fillStyle(INK, 1);
        post.fillRect(216, 560, 8, 160);
        post.fillRect(1076, 590, 8, 130);
        this.layer.add(post);
    }

    private drawRoom() {
        const g = this.add.graphics();
        // Back wall with faded stripes and a skirting board.
        g.fillStyle(0x23201c, 1);
        g.fillRect(0, 0, W, 470);
        g.lineStyle(2, 0x2c2823, 1);
        for (let x = 0; x < W; x += 36) g.lineBetween(x, 0, x, 470);
        g.fillStyle(0x15120f, 1);
        g.fillRect(0, 455, W, 20);
        // Floor planks.
        g.fillStyle(0x17140f, 1);
        g.fillRect(0, 475, W, H - 475);
        g.lineStyle(1, 0x0d0b08, 1);
        for (let y = 490; y < H; y += 26) g.lineBetween(0, y, W, y);
        this.layer.add(g);

        // Window: fog and the moon behind four panes.
        const win = this.add.graphics();
        win.fillStyle(0x2b3540, 1);
        win.fillRect(130, 90, 230, 260);
        this.layer.add(win);
        this.moon(300, 150);
        const frame = this.add.graphics();
        frame.lineStyle(14, 0x0d0b09, 1);
        frame.strokeRect(130, 90, 230, 260);
        frame.lineBetween(245, 90, 245, 350);
        frame.lineBetween(130, 220, 360, 220);
        this.layer.add(frame);

        // Door on the right, ajar.
        const door = this.add.graphics();
        door.fillStyle(0x0b0a08, 1);
        door.fillRect(1010, 120, 170, 340);
        door.fillStyle(0x2a2118, 1);
        door.fillRect(1010, 120, 120, 340);
        door.fillStyle(BRASS, 0.9);
        door.fillCircle(1112, 300, 7);
        this.layer.add(door);

        // Writing desk with a lamp.
        const desk = this.add.graphics();
        desk.fillStyle(0x0d0b09, 1);
        desk.fillRect(470, 330, 260, 24);
        desk.fillRect(482, 354, 16, 140);
        desk.fillRect(702, 354, 16, 140);
        desk.fillRect(560, 300, 70, 30);
        desk.fillStyle(0xd9cfb8, 0.55);
        desk.fillRect(500, 318, 40, 12);
        desk.fillRect(645, 320, 50, 10);
        this.layer.add(desk);
        this.lamp(595, 285, 200);

        // Glyph / scratches area on the wall.
        const wall = this.add.graphics();
        wall.lineStyle(2, 0x3b342c, 1);
        wall.strokeCircle(850, 230, 46);
        wall.lineBetween(820, 190, 885, 270);
        wall.lineBetween(890, 195, 812, 262);
        this.layer.add(wall);

        // The body, chalk-outlined, face down.
        const body = this.add.graphics();
        body.fillStyle(0x050505, 1);
        body.fillEllipse(640, 600, 300, 70);
        body.fillCircle(470, 590, 30);
        body.fillEllipse(560, 560, 120, 26);
        body.fillEllipse(760, 640, 140, 24);
        body.lineStyle(2, 0xd8d2c4, 0.4);
        body.strokeEllipse(630, 600, 360, 120);
        body.fillStyle(0x3a0b0b, 0.75);
        body.fillEllipse(700, 650, 240, 40);
        this.layer.add(body);

        this.addHotspot(
            { type: "spot", spot: "window" },
            { x: 120, y: 80, w: 250, h: 280 },
        );
        this.addHotspot(
            { type: "spot", spot: "door" },
            { x: 1000, y: 110, w: 190, h: 360 },
        );
        this.addHotspot(
            { type: "spot", spot: "desk" },
            { x: 460, y: 270, w: 280, h: 90 },
        );
        this.addHotspot(
            { type: "spot", spot: "wall" },
            { x: 770, y: 150, w: 170, h: 170 },
        );
        this.addHotspot(
            { type: "spot", spot: "floor" },
            { x: 860, y: 520, w: 320, h: 160 },
        );
        this.addHotspot(
            { type: "spot", spot: "body" },
            { x: 440, y: 540, w: 380, h: 130 },
        );
        this.addHotspot(
            { type: "spot", spot: "bodyDeep" },
            { x: 520, y: 500, w: 220, h: 34 },
            "ชันสูตร",
        );
    }

    private mapPos: Record<LocationId, [number, number]> = {
        alley: [520, 300],
        cemetery: [250, 170],
        docks: [960, 560],
        library: [700, 160],
        sewer: [430, 520],
        pressworks: [1040, 260],
        abattoir: [190, 470],
    };

    private drawMap(state: GameState) {
        const g = this.add.graphics();
        g.fillStyle(0x1b1915, 1);
        g.fillRoundedRect(60, 50, W - 120, H - 100, 10);
        g.lineStyle(2, BRASS, 0.5);
        g.strokeRoundedRect(60, 50, W - 120, H - 100, 10);
        // River across the bottom-right.
        g.lineStyle(46, 0x10161c, 1);
        g.beginPath();
        g.moveTo(60, 640);
        g.lineTo(520, 610);
        g.lineTo(820, 650);
        g.lineTo(1220, 520);
        g.strokePath();
        // Streets.
        g.lineStyle(3, 0x3a342a, 1);
        const crime: [number, number] = [640, 380];
        Object.values(this.mapPos).forEach(([x, y]) =>
            g.lineBetween(crime[0], crime[1], x, y),
        );
        this.layer.add(g);

        const crimeMark = this.add.graphics();
        crimeMark.lineStyle(3, 0x8b1e1e, 1);
        crimeMark.lineBetween(
            crime[0] - 12,
            crime[1] - 12,
            crime[0] + 12,
            crime[1] + 12,
        );
        crimeMark.lineBetween(
            crime[0] + 12,
            crime[1] - 12,
            crime[0] - 12,
            crime[1] + 12,
        );
        this.layer.add(crimeMark);
        this.layer.add(
            this.add
                .text(crime[0], crime[1] + 22, "ที่เกิดเหตุ", {
                    fontFamily: FONT,
                    fontSize: "18px",
                    color: "#b3423a",
                })
                .setOrigin(0.5, 0),
        );

        const compass = state.run?.perks.includes("silverCompass");
        (Object.keys(this.mapPos) as LocationId[]).forEach((id) => {
            const [x, y] = this.mapPos[id];
            const dot = this.add.graphics();
            dot.fillStyle(0x0b0a08, 1);
            dot.fillCircle(x, y, 22);
            dot.lineStyle(2, BRASS, 0.8);
            dot.strokeCircle(x, y, 22);
            this.layer.add(dot);
            const name = this.add
                .text(x, y + 28, LOCATIONS[id].name, {
                    fontFamily: FONT,
                    fontSize: "19px",
                    color: "#e2d6bb",
                })
                .setOrigin(0.5, 0);
            const rumor = this.add
                .text(x, y + 52, LOCATIONS[id].rumor, {
                    fontFamily: FONT,
                    fontSize: "14px",
                    color: "#8f8571",
                    wordWrap: { width: 220 },
                    align: "center",
                })
                .setOrigin(0.5, 0);
            this.layer.add([name, rumor]);
            // ป้ายบอกว่าสถานที่นี้เข้าไปแล้วมีเมนูให้เลือกทำหลายอย่าง
            if (hasMenu(id)) {
                const badge = this.add
                    .text(x + 30, y, "☰ หลายจุดให้สำรวจ", {
                        fontFamily: FONT,
                        fontSize: "13px",
                        color: "#17130b",
                        backgroundColor: "#c9a45c",
                        padding: { x: 6, y: 2 },
                    })
                    .setOrigin(0, 0.5);
                this.layer.add(badge);
            }
            if (
                compass &&
                state.run &&
                cluesAt(state.run.file, `loc:${id}`).some(
                    (c) => c.kind === "trait",
                )
            ) {
                const ring = this.add
                    .circle(x, y, 32)
                    .setStrokeStyle(2, 0xd8dee3, 0.9);
                this.layer.add(ring);
                this.tweens.add({
                    targets: ring,
                    scale: 1.25,
                    alpha: 0.2,
                    duration: 1100,
                    yoyo: true,
                    repeat: -1,
                });
            }
            this.addHotspot(
                { type: "visit", location: id },
                { x: x - 30, y: y - 30, w: 60, h: 60, round: true },
            );
        });
    }

    private drawOffice() {
        const g = this.add.graphics();
        g.fillStyle(0x1c1814, 1);
        g.fillRect(0, 0, W, H);
        // Pinboard silhouette behind the panels.
        g.fillStyle(0x2a2219, 1);
        g.fillRect(140, 70, 1000, 470);
        g.lineStyle(10, 0x120f0b, 1);
        g.strokeRect(140, 70, 1000, 470);
        g.fillStyle(0xd9cfb8, 0.12);
        const rand = new Phaser.Math.RandomDataGenerator(["board"]);
        for (let i = 0; i < 16; i++)
            g.fillRect(
                rand.between(170, 1040),
                rand.between(100, 460),
                rand.between(60, 110),
                rand.between(50, 80),
            );
        g.lineStyle(2, 0x8b1e1e, 0.4);
        for (let i = 0; i < 8; i++)
            g.lineBetween(
                rand.between(200, 1100),
                rand.between(110, 500),
                rand.between(200, 1100),
                rand.between(110, 500),
            );
        g.fillStyle(0x0b0907, 1);
        g.fillRect(0, 600, W, 120);
        this.layer.add(g);
        this.lamp(640, 40, 260);
    }

    // ---------------------------------------------------------------- hotspots

    private addHotspot(
        action: Action,
        shape: Hotspot["shape"],
        short?: string,
    ) {
        const label =
            short ??
            (action.type === "spot"
                ? SCENE_SPOTS[action.spot as SceneSpotId].label
                : action.type === "visit"
                  ? LOCATIONS[action.location].name
                  : "");
        const outline = this.add.graphics();
        const tag = this.add
            .text(shape.x + shape.w / 2, shape.y - 8, "", {
                fontFamily: FONT,
                fontSize: "17px",
                color: "#f1e3c2",
                backgroundColor: "#0b0a08cc",
                padding: { x: 8, y: 4 },
            })
            .setOrigin(0.5, 1)
            .setDepth(70)
            .setVisible(false);
        const zone = this.add
            .zone(
                shape.x + shape.w / 2,
                shape.y + shape.h / 2,
                shape.w,
                shape.h,
            )
            .setInteractive({ useHandCursor: true });
        this.layer.add([outline, zone]);
        const spot: Hotspot = { action, label, zone, outline, tag, shape };
        zone.on("pointerover", () => this.hover(spot, true));
        zone.on("pointerout", () => this.hover(spot, false));
        // คลิกสถานที่บนแผนที่ส่งไปที่ enterLocation เพื่อให้สถานที่ที่มีเมนูเปิดเมนูซ้ำได้
        zone.on("pointerdown", () =>
            action.type === "visit"
                ? store.enterLocation(action.location)
                : store.act(action),
        );
        this.hotspots.push(spot);
    }

    private hover(spot: Hotspot, on: boolean) {
        const run = store.get().run;
        if (!run) return;
        // สถานที่ที่มีเมนูและเคยไปแล้ว: คลิกเพื่อเข้าไปอีกครั้งได้ฟรี
        if (this.isRevisit(spot)) {
            spot.tag.setText(`${spot.label} — เข้าไปอีกครั้ง (ไม่เสียเวลา)`);
            spot.tag.setVisible(on);
            this.drawOutline(spot, on);
            return;
        }
        const check = canDo(run, spot.action);
        const base =
            spot.action.type === "spot"
                ? SCENE_SPOTS[spot.action.spot].sanity
                : spot.action.type === "visit"
                  ? LOCATIONS[spot.action.location].sanity
                  : 0;
        const menu =
            spot.action.type === "visit" && hasMenu(spot.action.location);
        const cost = `${menu ? "เดินทาง " : ""}${timeCost(run, spot.action)} นาที${base ? " · อาจเสียสติ" : ""}${menu ? " · มีหลายอย่างให้ทำ" : ""}`;
        spot.tag.setText(
            check.ok
                ? `${spot.label} — ${cost}`
                : `${spot.label} — ${check.reason}`,
        );
        spot.tag.setVisible(on);
        this.drawOutline(spot, on && check.ok);
    }

    /** hotspot นี้เป็นสถานที่ที่มีเมนู และผู้เล่นเคยเดินทางไปแล้วหรือยัง */
    private isRevisit(spot: Hotspot) {
        const run = store.get().run;
        return (
            !!run &&
            spot.action.type === "visit" &&
            hasMenu(spot.action.location) &&
            run.done.includes(actionKey(spot.action))
        );
    }

    private drawOutline(spot: Hotspot, hot: boolean) {
        const { x, y, w, h, round } = spot.shape;
        const g = spot.outline;
        g.clear();
        if (!hot) return;
        g.lineStyle(2, LAMP, 0.8);
        if (round) g.strokeCircle(x + w / 2, y + h / 2, w / 2);
        else g.strokeRoundedRect(x, y, w, h, 8);
    }

    private refreshHotspots(state: GameState) {
        const run = state.run;
        for (const spot of this.hotspots) {
            const done = !!run && run.done.includes(actionKey(spot.action));
            // The detailed autopsy only shows up once the body has been looked at.
            const hidden =
                spot.action.type === "spot" &&
                spot.action.spot === "bodyDeep" &&
                !run?.done.includes("spot:body");
            const active = !!run && run.step === "play" && !hidden;
            // สถานที่ที่มีเมนูยังคลิกได้หลังไปแล้ว (เพื่อกลับเข้าไปทำ action อื่น)
            spot.zone.input!.enabled =
                active && (!done || this.isRevisit(spot));
            if (spot.action.type === "spot" && spot.action.spot === "bodyDeep")
                this.drawDeepButton(spot, hidden, done);
            if (done && !spot.mark) {
                const { x, y, w } = spot.shape;
                const mark = this.add.graphics();
                mark.fillStyle(0x0b0a08, 0.8);
                mark.fillCircle(x + w - 10, y + 10, 13);
                mark.lineStyle(3, BRASS, 1);
                mark.beginPath();
                mark.moveTo(x + w - 17, y + 10);
                mark.lineTo(x + w - 11, y + 16);
                mark.lineTo(x + w - 2, y + 4);
                mark.strokePath();
                this.layer.add(mark);
                spot.mark = mark;
                this.drawOutline(spot, false);
                spot.tag.setVisible(false);
            }
        }
    }

    private deepButton?: Phaser.GameObjects.Text;

    private drawDeepButton(spot: Hotspot, hidden: boolean, done: boolean) {
        if (!this.deepButton || !this.deepButton.active) {
            const { x, y, w, h } = spot.shape;
            this.deepButton = this.add
                .text(x + w / 2, y + h / 2, "🔍 ชันสูตรอย่างละเอียด", {
                    fontFamily: FONT,
                    fontSize: "16px",
                    color: "#f1e3c2",
                    backgroundColor: "#3a0b0bdd",
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(0.5);
            this.layer.add(this.deepButton);
        }
        this.deepButton.setVisible(!hidden).setAlpha(done ? 0.4 : 1);
    }
}
