import { CUT_EXTRAS } from "./meat-cuts-extra";

// 肉品部位圖鑑：台灣常見的豬、牛、雞、鴨、鵝、羊，各部位的介紹、台灣叫法、適合的煮法與切法。
// 部位圖是原創的側面示意圖（viewBox 0 0 640 400，頭朝左），region 是部位範圍（會被身體輪廓裁切）。

export const COOKING_METHODS = [
  "boil", // 水煮・白切
  "hotpot", // 火鍋・涮
  "stirfry", // 炒
  "panfry", // 煎
  "grill", // 燒烤
  "roast", // 烤箱烤
  "braise", // 燉・紅燒
  "lu", // 滷
  "deepfry", // 炸
  "steam", // 蒸
  "soup", // 煮湯・熬湯
  "smoke", // 煙燻
  "sousvide", // 低溫烹調
  "snack", // 台灣小吃做法
] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];

export type CutMethod = {
  method: CookingMethod;
  dish?: string; // 小吃名稱（method 為 snack 時）
  thickness: string; // 建議的切法與厚度
  time: string; // 大約的烹調時間
  tip?: string;
};

export type MeatCut = {
  id: string;
  name: string; // 繁中名稱
  nameEn: string;
  aliases: string[]; // 台灣市場的其他叫法
  retailNames?: string[]; // 大賣場的標示（合併自 meat-cuts-extra.ts）
  wholesaleNames?: string[]; // 肉攤、批發商的說法
  description: string;
  texture: string; // 肉質：油花、軟硬
  fat: 1 | 2 | 3 | 4 | 5; // 油脂多寡
  tenderness: 1 | 2 | 3 | 4 | 5; // 軟嫩程度
  methods: CutMethod[];
  dishes: string[]; // 台灣常見吃法
  buyTip: string;
  // 部位圖：多邊形範圍（"x,y x,y …"）或 SVG 路徑（以 M 開頭），以及標籤位置
  region?: string;
  label?: [number, number];
  // 標籤放在身體外時，用引線指到部位上的這一點
  anchor?: [number, number];
  // 同一群組的部位，在說明裡並排比較（例：牛肩胛）
  compareGroup?: string;
  // 只畫在這個形狀裡面（例：雞翅的三段只畫在翅膀範圍內）
  within?: string;
  // 不受身體輪廓裁切（例：豬耳朵、尾巴長在輪廓外）
  unclipped?: boolean;
};

export type Animal = {
  id: "pork" | "beef" | "chicken" | "duck" | "goose" | "lamb";
  name: string;
  nameEn: string;
  intro: string;
  outline: string; // 身體輪廓（含腳），部位會被它裁切
  details: string[]; // 不屬於任何部位的線條（眼睛、嘴喙等），只畫線
  cuts: MeatCut[]; // 圖上的部位
  others: MeatCut[]; // 內臟等不在圖上的部位
};

// ── 豬 ─────────────────────────────────────────
const PORK: Animal = {
  id: "pork",
  name: "豬肉",
  nameEn: "Pork",
  intro: "台灣最常吃的肉。溫體豬當天現宰、冷藏豬經排酸，口感各有喜好；挑選時看顏色粉紅、表面不出水、按壓有彈性。",
  outline:
    "M118 150 C150 112 262 96 384 100 C476 104 546 122 566 164 C582 200 578 250 560 282 L560 348 L532 348 L528 300 L506 300 L502 348 L474 348 L470 296 C400 300 300 300 230 294 L222 348 L196 348 L192 296 L178 296 L174 348 L148 348 L146 280 C126 270 112 256 102 244 C84 242 64 236 52 224 C42 214 46 196 60 190 C78 184 94 176 104 164 Z",
  details: ["M70 204 a4 4 0 1 0 0.1 0", "M46 214 C44 220 46 226 52 228", "M566 172 C590 160 598 182 582 188 C572 192 576 176 586 178"],
  cuts: [
    {
      id: "ear",
      name: "豬耳",
      nameEn: "Ear",
      aliases: ["豬耳朵"],
      description: "幾乎全是軟骨與皮，口感爽脆，滷好切細絲是黑白切與涼拌小菜的常客。",
      texture: "軟骨脆、皮Q，幾乎沒有肉。",
      fat: 2,
      tenderness: 1,
      methods: [
        { method: "lu", thickness: "整個滷好後切 0.2 cm 細絲", time: "小火 40–60 分鐘", tip: "先汆燙並刮除細毛。" },
        { method: "boil", thickness: "整個白煮後切細絲", time: "30 分鐘，冰鎮後切", tip: "涼拌豬耳絲：蒜末、辣油、香菜。" },
      ],
      dishes: ["滷豬耳朵", "涼拌豬耳絲", "黑白切"],
      buyTip: "選軟骨完整、皮面乾淨無殘毛的。",
      region: "M106 158 C96 130 104 112 122 104 C136 122 144 140 142 160 Z",
      label: [88, 90],
      anchor: [120, 132],
      unclipped: true,
    },
    {
      id: "head",
      name: "豬頭皮",
      nameEn: "Head",
      aliases: ["豬頭肉", "嘴邊肉"],
      description: "頭部的皮與肉，膠質豐富、口感Q脆，是台式黑白切與滷味攤的常客。",
      texture: "皮多肉少，富含膠質，口感脆彈。",
      fat: 3,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "整塊下鍋，滷好後切 0.3 cm 薄片", time: "小火 60–90 分鐘", tip: "先汆燙去腥並刮除細毛。" },
        { method: "boil", thickness: "整塊白煮後切 0.3 cm 片", time: "40–60 分鐘", tip: "冰鎮後切片更脆，可涼拌蒜泥醬油。" },
      ],
      dishes: ["黑白切", "涼拌豬頭皮", "滷味"],
      buyTip: "選皮面乾淨、無殘毛、顏色均勻的。",
      region: "0,0 150,0 150,212 0,212",
      label: [102, 204],
    },
    {
      id: "jowl",
      name: "松阪豬",
      nameEn: "Jowl / Neck",
      aliases: ["豬頸肉", "霜降豬", "雪花豬"],
      description: "頸部連接下巴的一小塊肉，一頭豬只有約 6 兩，油花細密如霜降，烤起來脆口不柴。",
      texture: "細緻油花分布均勻，口感脆彈帶嚼勁。",
      fat: 4,
      tenderness: 4,
      methods: [
        { method: "grill", thickness: "斜刀切 0.5–0.8 cm 片", time: "大火每面 2–3 分鐘", tip: "整塊烤到表面焦香再切片也很好吃。" },
        { method: "panfry", thickness: "0.5 cm 片", time: "中大火每面 1–2 分鐘", tip: "不用放油，靠自身油脂煎出香氣。" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 15–20 秒" },
      ],
      dishes: ["烤松阪豬", "松阪豬炒飯", "泰式松阪豬"],
      buyTip: "油花呈白色細網狀、顏色粉紅不暗沉。",
      region: "0,212 150,212 196,236 196,296 0,296",
      label: [146, 252],
    },
    {
      id: "shoulder",
      name: "梅花肉",
      nameEn: "Blade Shoulder (Butt)",
      aliases: ["梅頭肉", "胛心肉上段", "豬梅肉"],
      description: "肩頸上方的肉，瘦肉中夾著細細的油花，肉嫩多汁，是用途最廣的豬肉部位。",
      texture: "瘦中帶油、肉質軟嫩多汁，久煮也不柴。",
      fat: 3,
      tenderness: 4,
      methods: [
        { method: "roast", thickness: "切成 4–5 cm 寬的長條", time: "200°C 烤 35–45 分鐘", tip: "叉燒的經典部位，醃一晚更入味。" },
        { method: "panfry", thickness: "1–1.5 cm 豬排，斷筋", time: "中火每面 3–4 分鐘" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 15–20 秒" },
        { method: "stirfry", thickness: "0.3 cm 片", time: "大火 2–3 分鐘" },
        { method: "braise", thickness: "3 cm 塊", time: "小火 50–60 分鐘" },
      ],
      dishes: ["叉燒", "梅花豬排", "燒肉片", "火鍋肉片"],
      buyTip: "油花分布均勻、肉色粉紅有光澤。",
      region: "150,0 262,0 262,172 150,172",
      label: [206, 142],
    },
    {
      id: "picnic",
      name: "前腿肉",
      nameEn: "Picnic Shoulder",
      aliases: ["胛心肉", "前腿瘦肉", "前腿"],
      description: "前腿上段，筋膜較多、瘦中帶一點油，最適合絞成絞肉或切丁滷肉燥。",
      texture: "有筋、略有嚼勁，油脂適中。",
      fat: 2,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "切 0.5 cm 小丁", time: "小火 60–90 分鐘", tip: "滷肉飯的肉燥用前腿肉加一點五花最香。" },
        { method: "stirfry", thickness: "絞肉，或切 0.3 cm 肉絲", time: "大火 2–3 分鐘" },
        { method: "steam", thickness: "絞肉", time: "大火 15–20 分鐘", tip: "瓜仔肉、肉餅的常用部位。" },
        { method: "braise", thickness: "3 cm 塊", time: "小火 60 分鐘" },
      ],
      dishes: ["滷肉飯", "瓜仔肉", "獅子頭", "水餃餡"],
      buyTip: "請攤商現絞，可指定肥瘦比例（常見三分肥七分瘦）。",
      region: "150,172 262,172 262,296 196,296 196,236 150,212",
      label: [216, 238],
    },
    {
      id: "foreshank",
      name: "豬腱",
      nameEn: "Fore Shank",
      aliases: ["前腿腱", "腱子肉", "豬腱子"],
      description: "前腿下段的肌肉，筋膜交錯、膠質多，滷過放涼切片Q彈有嚼勁，做法和牛腱很像。",
      texture: "筋肉交錯，滷後Q彈，切面有花紋。",
      fat: 1,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "整條", time: "小火 60–90 分鐘，泡滷汁放涼", tip: "冷藏後逆紋切 0.3 cm 片當冷盤。" },
        { method: "braise", thickness: "3–4 cm 塊", time: "小火 60–80 分鐘" },
        { method: "soup", thickness: "3 cm 塊", time: "小火 1 小時", tip: "藥燉、清燉都適合。" },
      ],
      dishes: ["滷豬腱", "豬腱冷盤", "藥燉豬腱"],
      buyTip: "選筋紋清楚、顏色紅潤的整條。",
      region: "140,296 240,296 240,338 140,338",
      label: [86, 360],
      anchor: [168, 318],
    },
    {
      id: "loin",
      name: "大里肌",
      nameEn: "Loin",
      aliases: ["里肌肉", "豬排肉", "大排"],
      description: "背脊兩側的長條瘦肉，脂肪少、肉質細緻，是台式炸排骨和日式豬排的主角。",
      texture: "瘦肉多、紋理細，煮過頭容易乾柴。",
      fat: 1,
      tenderness: 3,
      methods: [
        { method: "deepfry", thickness: "1–1.5 cm 片，拍鬆斷筋", time: "170°C 炸 3–4 分鐘", tip: "台式排骨用帶骨大里肌，先醃再沾地瓜粉。" },
        { method: "panfry", thickness: "1–1.5 cm 片，斷筋", time: "中火每面 2–3 分鐘", tip: "邊緣的筋要切斷，煎時才不會捲起來。" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 15 秒" },
        { method: "stirfry", thickness: "0.3 cm 片或絲", time: "大火 1–2 分鐘", tip: "先抓少許太白粉，炒起來更滑嫩。" },
      ],
      dishes: ["排骨飯", "炸豬排", "京醬肉絲"],
      buyTip: "肉色淡粉、外圍有一層白色油脂的較新鮮。",
      region: "262,0 474,0 474,158 262,158",
      label: [372, 128],
    },
    {
      id: "tenderloin",
      name: "小里肌",
      nameEn: "Tenderloin",
      aliases: ["腰內肉", "腰內", "豬菲力"],
      description: "藏在大里肌內側的細長肉條，一頭豬只有兩條，是最軟嫩的部位。",
      texture: "幾乎沒有筋與油，入口最嫩。",
      fat: 1,
      tenderness: 5,
      methods: [
        { method: "panfry", thickness: "2 cm 厚圓片", time: "中火每面 2 分鐘，靜置 3 分鐘" },
        { method: "deepfry", thickness: "2 cm 圓片，略拍扁", time: "170°C 炸 2–3 分鐘", tip: "一口豬排、腰內豬排。" },
        { method: "stirfry", thickness: "0.5 cm 片", time: "大火 1–2 分鐘" },
        { method: "roast", thickness: "整條", time: "200°C 烤 18–22 分鐘", tip: "中心 63°C 取出靜置，切片仍帶淡粉色最嫩。" },
      ],
      dishes: ["腰內豬排", "蜜汁腰內", "炒肉片"],
      buyTip: "整條購買再自己切，表面的白色筋膜要先剔除。",
      region: "402,158 474,158 474,198 402,198",
      label: [438, 182],
    },
    {
      id: "spareribs",
      name: "肋排",
      nameEn: "Spare Ribs (Rack)",
      aliases: ["整片肋排", "一字排"],
      description: "胸腔側面的整排肋骨，骨頭長而直、肉較薄。整片烤是美式烤肋排；切成一支支就是一字排，糖醋、京都排骨常用。",
      texture: "骨邊肉香、肉層較薄，烤後軟嫩脫骨。",
      fat: 3,
      tenderness: 3,
      methods: [
        { method: "roast", thickness: "整片", time: "160°C 烤 1.5–2 小時，最後刷醬 220°C 上色", tip: "先撕掉背面的薄膜，入味更快。" },
        { method: "deepfry", thickness: "沿骨切成一支支，再切 6–8 cm 段", time: "160°C 炸 5–6 分鐘", tip: "京都排骨、糖醋一字排。" },
        { method: "braise", thickness: "6 cm 段", time: "小火 50–60 分鐘" },
      ],
      dishes: ["烤豬肋排", "京都排骨", "糖醋排骨"],
      buyTip: "整片購買時選肉層厚、骨頭不外露的。",
      region: "262,158 402,158 402,196 262,196",
      label: [330, 186],
    },
    {
      id: "ribs",
      name: "小排・腩排",
      nameEn: "Riblets / Soft-bone Ribs",
      aliases: ["小排", "腩排", "軟骨排", "排骨"],
      description: "肋骨下段靠腹部的部分。小排肉多、骨短，剁小塊燉湯、蒸最常見；腩排（軟骨排）在五花下方，帶Q脆軟骨。",
      texture: "骨邊肉最香，帶筋膜與軟骨。",
      fat: 3,
      tenderness: 3,
      methods: [
        { method: "soup", thickness: "剁 3–4 cm 段", time: "小火 40–60 分鐘", tip: "先汆燙去血水，湯才清澈（蘿蔔排骨湯、四神湯）。" },
        { method: "steam", thickness: "剁 2–3 cm 小塊", time: "大火 20–25 分鐘", tip: "豆豉排骨、粉蒸排骨。" },
        { method: "deepfry", thickness: "2–3 cm 段", time: "160°C 炸 5–6 分鐘", tip: "糖醋排骨先炸後裹醬。" },
        { method: "roast", thickness: "整片肋排", time: "160°C 烤 1.5–2 小時", tip: "先低溫烤軟，最後刷醬高溫上色。" },
        { method: "braise", thickness: "4 cm 段", time: "小火 50–60 分鐘" },
      ],
      dishes: ["排骨湯", "糖醋排骨", "豆豉蒸排骨", "烤肋排"],
      buyTip: "小排請攤商剁好；肉要包覆骨頭、骨頭切面帶紅色較新鮮。",
      region: "262,196 402,196 402,232 262,232",
      label: [330, 226],
    },
    {
      id: "belly",
      name: "五花肉",
      nameEn: "Belly",
      aliases: ["三層肉", "腩肉", "五層肉"],
      description: "腹部肥瘦相間的肉，皮、油、肉層層分明，滷、煮、烤都美味，是台菜最重要的部位之一。",
      texture: "油脂豐富，久煮後軟糯入口即化。",
      fat: 5,
      tenderness: 4,
      methods: [
        { method: "lu", thickness: "3–4 cm 方塊（東坡肉 5 cm）", time: "小火 60–90 分鐘", tip: "先煎或汆燙逼出部分油脂。" },
        { method: "boil", thickness: "整塊 3–4 cm 厚下鍋，煮後切 0.3 cm 片", time: "30–40 分鐘", tip: "白切肉、蒜泥白肉。" },
        { method: "grill", thickness: "0.5–0.8 cm 片", time: "每面 2–3 分鐘", tip: "韓式烤五花可切到 1 cm。" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 20 秒" },
        { method: "stirfry", thickness: "0.3 cm 片", time: "先煸出油再炒 3–4 分鐘", tip: "客家小炒、回鍋肉。" },
        { method: "roast", thickness: "整塊，皮面劃細刀", time: "220°C 烤 40–50 分鐘", tip: "脆皮燒肉：皮先抹鹽風乾。" },
      ],
      dishes: ["滷肉", "控肉飯", "客家小炒", "蒜泥白肉", "脆皮燒肉"],
      buyTip: "層次清楚、油脂潔白；滷用帶皮，烤肉片可選去皮。",
      region: "262,232 402,232 402,198 474,198 474,330 262,330",
      label: [370, 268],
    },
    {
      id: "rump",
      name: "臀肉",
      nameEn: "Rump (Sirloin)",
      aliases: ["後腿上段", "臀尖肉"],
      description: "後腿最上方靠近臀部的肉，比內、外腿多一點油花，肉質較嫩，切片炒、白切、做叉燒都適合。",
      texture: "瘦中帶少許油花，比其他後腿肉嫩。",
      fat: 2,
      tenderness: 3,
      methods: [
        { method: "stirfry", thickness: "0.3 cm 片", time: "大火 1–2 分鐘" },
        { method: "boil", thickness: "整塊下鍋，煮後切 0.3 cm 片", time: "30–40 分鐘", tip: "白切肉沾蒜蓉醬油。" },
        { method: "roast", thickness: "4 cm 寬長條", time: "200°C 烤 30–35 分鐘", tip: "比梅花瘦的叉燒。" },
      ],
      dishes: ["白切肉", "炒肉片", "瘦叉燒"],
      buyTip: "想要比梅花瘦、又不像後腿那麼柴，選臀肉。",
      region: "474,0 640,0 640,150 474,150",
      label: [524, 140],
    },
    {
      id: "outerham",
      name: "外腿",
      nameEn: "Outside Ham",
      aliases: ["後腿外側"],
      description: "後腿外側運動量大的肉，纖維粗、肉較硬，價格最實惠，適合絞肉、做肉乾或長時間燉煮。",
      texture: "瘦、纖維粗，直接煎炒容易硬。",
      fat: 1,
      tenderness: 1,
      methods: [
        { method: "stirfry", thickness: "絞肉", time: "大火 3–4 分鐘", tip: "做肉丸、餡料可混一點五花。" },
        { method: "braise", thickness: "3 cm 塊", time: "小火 60–80 分鐘" },
        { method: "roast", thickness: "0.3 cm 片，醃後攤平", time: "160°C 烤 25–30 分鐘", tip: "自製豬肉乾。" },
      ],
      dishes: ["豬肉乾", "肉丸", "燉肉"],
      buyTip: "請攤商現絞，口感比預先絞好的好。",
      region: "474,150 520,150 520,290 474,290",
      label: [497, 274],
    },
    {
      id: "ham",
      name: "內腿",
      nameEn: "Inside Ham",
      aliases: ["後腿內側", "後腿瘦肉", "老鼠肉（內腿上的一小塊）"],
      description: "後腿內側的瘦肉，比外腿嫩、紋理較細，切絲、切片快炒或做肉羹最合適。內側有一小塊形狀像老鼠的「老鼠肉」，特別嫩。",
      texture: "瘦、紋理較粗，切絲炒或醃過再煮較嫩。",
      fat: 1,
      tenderness: 2,
      methods: [
        { method: "stirfry", thickness: "逆紋切 0.3 cm 絲或片", time: "大火 1–2 分鐘", tip: "先用醬油、太白粉醃 10 分鐘。" },
        { method: "boil", thickness: "整塊下鍋，煮後切 0.3 cm 片", time: "30 分鐘" },
        { method: "roast", thickness: "0.3 cm 片，醃後攤平", time: "160°C 烤 25–30 分鐘", tip: "自製豬肉乾。" },
        { method: "soup", thickness: "0.3 cm 片", time: "滾水 1–2 分鐘", tip: "肉片湯先抓太白粉。" },
      ],
      dishes: ["青椒肉絲", "肉片湯", "豬肉乾", "白切肉"],
      buyTip: "整塊買回家冷凍半小時，比較好切成薄片。",
      region: "520,150 640,150 640,290 520,290",
      label: [550, 222],
    },
    {
      id: "hock",
      name: "腿庫",
      nameEn: "Hock",
      aliases: ["蹄膀", "豬腱", "腿庫肉"],
      description: "後腿下段、豬腳上方的部位，皮厚膠質多、肉帶筋，滷到軟爛是台菜經典。",
      texture: "皮Q、肉帶筋，長時間燉滷後軟爛。",
      fat: 3,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "整塊或剁 4 cm 塊", time: "小火 1.5–2 小時", tip: "先炸或煎皮面再滷，皮更Q不散。" },
        { method: "braise", thickness: "整塊", time: "小火 2 小時", tip: "紅燒蹄膀。" },
      ],
      dishes: ["滷腿庫", "腿庫飯", "紅燒蹄膀", "萬巒豬腳（腿庫段）"],
      buyTip: "皮面光滑、無瘀血，請攤商先處理好細毛。",
      region: "470,290 640,290 640,338 470,338",
      label: [580, 306],
    },
    {
      id: "trotter",
      name: "豬腳",
      nameEn: "Trotter",
      aliases: ["豬蹄", "腳蹄"],
      description: "腳掌部位，幾乎都是皮、筋與骨，膠質非常豐富，台灣人過生日、出獄都要吃豬腳麵線。",
      texture: "皮筋多、肉少，膠質Q彈。",
      fat: 2,
      tenderness: 1,
      methods: [
        { method: "lu", thickness: "剁 4–5 cm 段", time: "小火 1.5–2 小時", tip: "汆燙後冰鎮再滷，皮更有彈性。" },
        { method: "soup", thickness: "剁 4 cm 段", time: "小火 1.5 小時", tip: "花生豬腳湯。" },
        { method: "boil", thickness: "整隻煮後切片", time: "1 小時", tip: "萬巒豬腳沾蒜蓉醬油膏。" },
      ],
      dishes: ["豬腳麵線", "滷豬腳", "花生豬腳", "萬巒豬腳"],
      buyTip: "前腳肉較多、後腳筋較多，喜歡吃肉選前腳。",
      region: "0,338 640,338 640,400 0,400",
      label: [326, 384],
    },
    {
      id: "tail",
      name: "豬尾",
      nameEn: "Tail",
      aliases: ["豬尾巴"],
      description: "皮多骨多，膠質豐富，常見於滷味與燉湯。",
      texture: "皮Q、骨節間有一點肉。",
      fat: 3,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "剁 5 cm 段", time: "小火 60–80 分鐘" },
        { method: "soup", thickness: "剁 4 cm 段", time: "小火 1.5 小時", tip: "花生豬尾湯。" },
      ],
      dishes: ["滷豬尾", "花生豬尾湯"],
      buyTip: "選皮面完整、粗細均勻的。",
      region: "M560 150 C592 140 610 170 594 192 C582 206 562 196 560 186 Z",
      label: [606, 130],
      unclipped: true,
    },
  ],
  others: [
    {
      id: "intestine",
      name: "大腸",
      nameEn: "Large Intestine",
      aliases: ["肥腸"],
      description: "油脂多、口感軟Q，需徹底清洗、去除多餘油脂。",
      texture: "外Q內軟，有特殊香氣。",
      fat: 5,
      tenderness: 3,
      methods: [
        { method: "lu", thickness: "整段滷好再切 1 cm 圈", time: "小火 60–90 分鐘" },
        { method: "deepfry", thickness: "滷後切 1 cm 段", time: "180°C 炸 2 分鐘", tip: "炸大腸、大腸包小腸。" },
      ],
      dishes: ["大腸麵線", "大腸包小腸", "三杯大腸"],
      buyTip: "買已清洗好的，回家再用麵粉、鹽搓洗一次。",
    },
    {
      id: "blood",
      name: "豬血",
      nameEn: "Pork Blood",
      aliases: ["豬血湯的豬血", "米血（豬血糕）"],
      description: "凝固的豬血口感滑嫩；豬血糕則是糯米加豬血蒸成。",
      texture: "豬血滑嫩；豬血糕Q黏。",
      fat: 1,
      tenderness: 5,
      methods: [
        { method: "soup", thickness: "切 2 cm 方塊", time: "微滾 3–5 分鐘", tip: "煮太久會出現孔洞變硬。" },
        { method: "hotpot", thickness: "2 cm 方塊", time: "3 分鐘" },
      ],
      dishes: ["豬血湯", "麻辣鍋", "豬血糕"],
      buyTip: "表面光滑、無異味。",
    },
    {
      id: "liver",
      name: "豬肝",
      nameEn: "Liver",
      aliases: ["粉肝"],
      description: "粉肝是油脂較多、口感綿密的豬肝，台式黑白切常見。",
      texture: "綿密細緻，煮過頭會變硬。",
      fat: 2,
      tenderness: 4,
      methods: [
        { method: "soup", thickness: "0.5 cm 片", time: "滾水 30–60 秒，關火泡熟", tip: "豬肝湯先抓少許太白粉。" },
        { method: "stirfry", thickness: "0.5 cm 片", time: "大火 1 分鐘", tip: "麻油豬肝。" },
      ],
      dishes: ["豬肝湯", "麻油豬肝", "黑白切粉肝"],
      buyTip: "顏色紅潤有光澤、質地柔軟有彈性。",
    },
  ],
};

// ── 牛 ─────────────────────────────────────────
const BEEF: Animal = {
  id: "beef",
  name: "牛肉",
  nameEn: "Beef",
  intro: "台灣常見進口冷藏、冷凍牛，以及台南的溫體牛（現宰黃牛）。牛排看油花與厚度，燉煮選有筋的部位。",
  outline:
    "M112 132 C150 104 250 96 380 98 C480 100 560 112 586 150 C600 176 600 236 588 270 L590 350 L562 350 L556 292 L528 292 L524 350 L496 350 L492 288 C420 296 300 296 228 288 L222 350 L194 350 L190 290 L174 290 L170 350 L142 350 L138 272 C124 262 112 246 104 230 L74 236 C54 240 38 228 40 210 C42 196 54 186 68 184 L82 168 C78 150 70 132 82 128 C92 126 100 132 112 132 Z",
  details: ["M76 196 a4 4 0 1 0 0.1 0", "M86 138 C80 116 92 104 108 108", "M590 158 C612 176 610 220 604 248"],
  cuts: [
    {
      id: "neck",
      name: "牛頸肉",
      nameEn: "Neck",
      aliases: ["頸肉"],
      description: "活動量大的頸部肉，筋多、肉味濃，適合長時間燉煮或絞肉。",
      texture: "肉質較硬、筋膜多，燉久後軟爛有味。",
      fat: 2,
      tenderness: 1,
      methods: [
        { method: "braise", thickness: "4 cm 塊", time: "小火 2–2.5 小時" },
        { method: "stirfry", thickness: "絞肉", time: "大火 3–4 分鐘", tip: "漢堡排、牛肉丸可混一點油脂多的部位。" },
      ],
      dishes: ["紅燒牛肉", "牛肉丸", "漢堡排"],
      buyTip: "適合整塊買回家燉，價格較實惠。",
      region: "0,0 150,0 150,296 0,296",
      label: [100, 220],
    },
    {
      id: "chucktender",
      name: "嫩肩",
      nameEn: "Chuck Tender (Mock Tender)",
      aliases: ["嫩肩肉", "肩胛嫩肉"],
      description: "肩胛骨上方的一條肌肉，形狀細長像菲力，所以英文又叫 Mock Tender（假菲力）。肉瘦、紋理細，中間有一條筋膜；薄切涮、沖熱湯最嫩，台南溫體牛肉湯常用。注意：賣場標示的「嫩肩里肌」常是肩胛肉捲（Chuck Roll），和這裡的嫩肩不同，看英文標示最準。",
      texture: "瘦、細緻，中間有筋膜；薄切很嫩，整塊煎容易乾。",
      fat: 1,
      tenderness: 3,
      methods: [
        { method: "hotpot", thickness: "逆紋 0.2 cm 薄片", time: "涮 5–10 秒", tip: "肉片薄、時間短，才不會變硬。" },
        { method: "stirfry", thickness: "逆紋 0.3 cm 片", time: "大火 1 分鐘", tip: "先抓少許太白粉與油，沙茶牛肉很合適。" },
        { method: "braise", thickness: "4 cm 塊", time: "小火 1.5–2 小時" },
      ],
      dishes: ["台南牛肉湯", "沙茶牛肉", "牛肉火鍋"],
      buyTip: "整條買回家先剔除中間的筋膜；做牛肉湯要選溫體、當天現切。",
      region: "150,0 200,0 200,175 150,175",
      label: [112, 60],
      anchor: [176, 128],
      compareGroup: "beef-chuck",
    },
    {
      id: "topblade",
      name: "板腱・翼板",
      nameEn: "Top Blade (Flat Iron)",
      aliases: ["板腱", "翼板", "嫩肩牛排（部分店家）"],
      description: "肩胛骨外側的肌肉。台灣常把板腱、翼板當成同一個部位，也有店家把整塊稱為翼板、切成牛排叫板腱。中央有一條粗筋，沿著筋剖開去除後就是 Flat Iron 牛排，嫩度僅次於菲力，CP 值很高。",
      texture: "油花細密均勻、非常嫩而多汁；中央有一條粗筋要切除。",
      fat: 3,
      tenderness: 4,
      methods: [
        { method: "panfry", thickness: "去筋後 1.5–2.5 cm 牛排", time: "大火每面 2–3 分鐘，靜置 5 分鐘", tip: "沒去筋直接煎，中間那條筋會很難咬。" },
        { method: "grill", thickness: "0.8–1 cm 燒肉片", time: "每面 30–60 秒" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 5–10 秒" },
        { method: "stirfry", thickness: "逆紋 0.3 cm 片", time: "大火 1 分鐘" },
      ],
      dishes: ["板腱牛排", "翼板燒肉", "牛肉火鍋"],
      buyTip: "買整塊翼板回家自己去筋切牛排最划算；買切好的板腱牛排，看筋是否已經剔除。",
      region: "200,0 250,0 250,175 200,175",
      label: [226, 40],
      anchor: [226, 136],
      compareGroup: "beef-chuck",
    },
    {
      id: "chuckeye",
      name: "肩里肌",
      nameEn: "Chuck Eye Roll",
      aliases: ["肩胛里肌", "肩胛肉捲", "嫩肩里肌（部分賣場）"],
      description: "接在肋眼前面的背肉，是肋眼往肩膀延伸的部分，所以又被稱為「窮人的肋眼」。油花多、肉味濃，價格比肋眼實惠，薄切也是壽喜燒、霜降火鍋片的常見部位。",
      texture: "油花多、肉味濃郁，口感有彈性，比肋眼稍有嚼勁。",
      fat: 4,
      tenderness: 3,
      methods: [
        { method: "panfry", thickness: "2–2.5 cm 牛排", time: "大火每面 2–3 分鐘，靜置 5 分鐘", tip: "五分熟以下最嫩。" },
        { method: "grill", thickness: "1 cm 燒肉片", time: "每面 40–60 秒" },
        { method: "hotpot", thickness: "0.15–0.2 cm 霜降片", time: "涮 5–8 秒", tip: "壽喜燒也很適合。" },
        { method: "braise", thickness: "4 cm 塊", time: "小火 1.5–2 小時" },
      ],
      dishes: ["肩里肌牛排", "壽喜燒", "霜降火鍋片"],
      buyTip: "越靠近肋眼的那一端越嫩、油花越漂亮。",
      region: "250,0 300,0 300,175 250,175",
      label: [340, 52],
      anchor: [276, 134],
      compareGroup: "beef-chuck",
    },
    {
      id: "ribeye",
      name: "肋眼",
      nameEn: "Ribeye",
      aliases: ["肋脊部", "肋眼牛排", "沙朗（部分店家的叫法）", "霜降", "肋眼心"],
      description: "肋骨上方的背肉，油花最豐富，香氣濃郁，是牛排館的招牌；薄切就是頂級火鍋霜降片。",
      texture: "大理石紋油花、多汁柔嫩。",
      fat: 5,
      tenderness: 4,
      methods: [
        { method: "panfry", thickness: "2–3 cm 牛排", time: "大火每面 2–3 分鐘，靜置 5 分鐘", tip: "提前 30 分鐘回溫、下鍋前才撒鹽。" },
        { method: "grill", thickness: "1 cm 燒肉片", time: "每面 30–60 秒" },
        { method: "hotpot", thickness: "0.15–0.2 cm 霜降片", time: "涮 5–8 秒" },
      ],
      dishes: ["肋眼牛排", "霜降牛火鍋", "燒肉"],
      buyTip: "中央的「眼」與周圍油花分布均勻；厚度至少 2 cm 才好控制熟度。",
      region: "300,0 390,0 390,150 300,150",
      label: [346, 128],
    },
    {
      id: "striploin",
      name: "紐約客",
      nameEn: "Striploin (New York Strip)",
      aliases: ["前腰脊部", "前腰脊", "沙朗", "外脊"],
      description: "腰背部的肉，一側帶一條油脂邊，肉味濃、有嚼勁，台灣多稱為沙朗。",
      texture: "肉紋緊實、帶油邊，嚼勁與肉味兼具。",
      fat: 3,
      tenderness: 3,
      methods: [
        { method: "panfry", thickness: "2–2.5 cm 牛排", time: "大火每面 2–3 分鐘", tip: "油邊先立起來煎到焦香。" },
        { method: "grill", thickness: "0.5–1 cm 燒肉片", time: "每面 1 分鐘" },
        { method: "stirfry", thickness: "逆紋 0.3 cm 片", time: "大火 1 分鐘" },
      ],
      dishes: ["沙朗牛排", "燒肉", "黑胡椒牛柳"],
      buyTip: "選油邊潔白、肉色鮮紅的。",
      region: "390,0 476,0 476,150 390,150",
      label: [434, 128],
    },
    {
      id: "tenderloin",
      name: "菲力",
      nameEn: "Tenderloin (Fillet)",
      aliases: ["腰里肌", "腰內肉", "牛菲力"],
      description: "腰椎內側的細長肉，幾乎不運動，是牛身上最嫩的部位，油脂少、價格最高。",
      texture: "非常軟嫩、油脂少、肉味較淡。",
      fat: 1,
      tenderness: 5,
      methods: [
        { method: "panfry", thickness: "3–4 cm 厚圓柱", time: "大火每面 2 分鐘，再轉小火或進烤箱", tip: "厚切才能外焦內嫩，建議五分熟以下。" },
        { method: "roast", thickness: "整條", time: "200°C 烤 20–25 分鐘", tip: "威靈頓牛排的部位。" },
        { method: "stirfry", thickness: "2 cm 丁", time: "大火 1–2 分鐘", tip: "骰子牛。" },
      ],
      dishes: ["菲力牛排", "骰子牛", "威靈頓牛排"],
      buyTip: "整條購買較划算，外層銀色筋膜要剔除。",
      region: "400,150 560,150 560,176 400,176",
      label: [536, 46],
      anchor: [512, 163],
    },
    {
      id: "topsirloin",
      name: "上後腰脊",
      nameEn: "Top Sirloin",
      aliases: ["後腰脊部（上段）", "上後腰", "沙朗心"],
      description: "後腰脊部的上半段，接近臀部。瘦而有肉味，價格比肋眼、紐約客實惠，美式餐廳的「沙朗牛排」常用這個部位。",
      texture: "瘦肉為主、有嚼勁。",
      fat: 2,
      tenderness: 3,
      methods: [
        { method: "panfry", thickness: "2 cm 牛排", time: "大火每面 2 分鐘，五分熟以下" },
        { method: "grill", thickness: "0.5 cm 燒肉片", time: "每面 30–60 秒" },
        { method: "roast", thickness: "整塊", time: "180°C 烤 30–40 分鐘", tip: "烤牛肉薄切做三明治。" },
      ],
      dishes: ["牛排", "烤牛肉", "燒肉"],
      buyTip: "煎之前用叉子戳孔或醃一下會更嫩。",
      region: "476,0 560,0 560,150 476,150",
      label: [518, 128],
    },
    {
      id: "bottomsirloin",
      name: "下後腰脊",
      nameEn: "Bottom Sirloin (Tri-tip)",
      aliases: ["後腰脊部（下段）", "三角肉", "三角腹肉"],
      description: "後腰脊部的下半段，包含三角肉（Tri-tip）。肉味濃、略有嚼勁，整塊慢烤或燒烤都很適合。",
      texture: "瘦中帶點油花、肉味濃，略有嚼勁。",
      fat: 2,
      tenderness: 3,
      methods: [
        { method: "roast", thickness: "整塊三角肉", time: "180°C 烤 35–45 分鐘，中心 55°C 取出靜置", tip: "逆紋切 0.5 cm 片。" },
        { method: "grill", thickness: "1 cm 燒肉片", time: "每面 40–60 秒" },
        { method: "panfry", thickness: "2 cm 牛排", time: "大火每面 2–3 分鐘" },
      ],
      dishes: ["烤三角肉", "燒肉"],
      buyTip: "三角肉的紋理方向會轉彎，切片時要注意逆紋。",
      region: "476,176 560,176 560,226 476,226",
      label: [518, 210],
    },
    {
      id: "round",
      name: "牛後腿肉",
      nameEn: "Round",
      aliases: ["後腿肉", "和尚頭", "牛霖", "臀肉"],
      description: "後腿的大塊瘦肉，包含和尚頭（牛霖）、上後腿等。脂肪少、價格實惠，適合切絲快炒、做牛肉乾或整塊烤牛肉。",
      texture: "瘦、纖維較粗，要逆紋切薄或醃過才嫩。",
      fat: 1,
      tenderness: 2,
      methods: [
        { method: "stirfry", thickness: "逆紋 0.3 cm 絲或片", time: "大火 1 分鐘", tip: "先用醬油、太白粉醃 10 分鐘。" },
        { method: "roast", thickness: "整塊", time: "180°C 烤 40–50 分鐘", tip: "烤牛肉冷卻後薄切。" },
        { method: "hotpot", thickness: "和尚頭 0.2 cm 薄片", time: "涮 5–8 秒" },
        { method: "braise", thickness: "4 cm 塊", time: "小火 2 小時" },
      ],
      dishes: ["青椒牛肉絲", "烤牛肉", "牛肉乾"],
      buyTip: "和尚頭（牛霖）是後腿裡最嫩的一塊，適合涮與炒。",
      region: "560,0 640,0 640,296 560,296",
      label: [612, 330],
      anchor: [578, 232],
    },
    {
      id: "shortrib",
      name: "牛小排",
      nameEn: "Short Rib",
      aliases: ["帶骨牛小排", "無骨牛小排", "LA 牛小排"],
      description: "肋骨下段的肉，油花多、口感彈牙，是燒肉店最受歡迎的部位。",
      texture: "油花豐富、彈牙多汁。",
      fat: 5,
      tenderness: 4,
      methods: [
        { method: "grill", thickness: "無骨 1 cm 片；韓式 LA 小排帶骨橫切 0.8–1 cm", time: "大火每面 1–2 分鐘" },
        { method: "panfry", thickness: "1.5–2 cm", time: "大火每面 1–2 分鐘" },
        { method: "braise", thickness: "帶骨 5 cm 段", time: "小火 2–2.5 小時", tip: "韓式燉牛小排。" },
      ],
      dishes: ["燒肉牛小排", "韓式烤牛小排", "燉牛小排"],
      buyTip: "帶骨的燉煮更香，燒肉選無骨較方便。",
      region: "300,150 400,150 400,226 300,226",
      label: [350, 196],
    },
    {
      id: "brisket",
      name: "前胸肉",
      nameEn: "Brisket",
      aliases: ["牛胸肉", "胸口肉"],
      description: "胸前的肉，結締組織與油脂多，要長時間低溫燉煮或煙燻才會軟嫩；美式 BBQ 的煙燻牛胸就是這個部位。",
      texture: "纖維粗、帶筋膜與油脂，久煮後軟嫩多汁。",
      fat: 4,
      tenderness: 2,
      methods: [
        { method: "braise", thickness: "整塊或 5 cm 塊", time: "小火 3–4 小時" },
        { method: "smoke", thickness: "整塊", time: "110–120°C 煙燻 8–12 小時", tip: "美式煙燻牛胸，切 0.6 cm 片。" },
        { method: "soup", thickness: "4 cm 塊", time: "小火 2.5–3 小時", tip: "清燉牛肉湯。" },
      ],
      dishes: ["煙燻牛胸", "清燉牛肉", "紅燒牛肉"],
      buyTip: "選油脂層均勻、整塊厚度一致的，燉煮時熟度較平均。",
      region: "150,175 300,175 300,296 150,296",
      label: [226, 250],
    },
    {
      id: "plate",
      name: "牛五花",
      nameEn: "Short Plate",
      aliases: ["胸腹部", "牛腹肉", "牛五花肉片"],
      description: "胸腹部的肉，肥瘦層層相間，薄切就是最常見的牛五花火鍋片、牛丼肉片。",
      texture: "油脂豐富、肥瘦相間，薄切入口即化。",
      fat: 5,
      tenderness: 3,
      methods: [
        { method: "hotpot", thickness: "0.2 cm 牛五花片", time: "涮 8–10 秒" },
        { method: "stirfry", thickness: "0.2 cm 片", time: "大火 1 分鐘", tip: "牛丼、韓式炒牛肉、沙茶牛肉。" },
        { method: "grill", thickness: "0.3–0.5 cm 燒肉片", time: "每面 20–30 秒" },
        { method: "braise", thickness: "4 cm 塊", time: "小火 2 小時" },
      ],
      dishes: ["牛五花火鍋", "牛丼", "韓式烤牛五花"],
      buyTip: "火鍋片選紅白分明、油脂潔白的。",
      region: "300,226 400,226 400,296 300,296",
      label: [350, 268],
    },
    {
      id: "flank",
      name: "腹脇肉・牛腩",
      nameEn: "Flank",
      aliases: ["臀腹部", "腹脇肉", "牛腩"],
      description: "腹部後段的肉（臀腹部），帶筋膜、肉味濃，台灣燉牛肉麵、牛腩煲常用；整片的 Flank Steak 逆紋薄切也很適合燒烤。",
      texture: "纖維明顯、帶筋膜，燉煮後軟嫩入味；逆紋薄切口感佳。",
      fat: 3,
      tenderness: 2,
      methods: [
        { method: "braise", thickness: "4 cm 塊", time: "小火 2–3 小時", tip: "牛肉麵：先汆燙，再與豆瓣醬、香料燉。" },
        { method: "grill", thickness: "整片烤後逆紋切 0.5 cm 片", time: "大火每面 3–4 分鐘", tip: "Flank Steak，五分熟最嫩。" },
        { method: "stirfry", thickness: "逆紋 0.3 cm 片", time: "大火 1 分鐘" },
      ],
      dishes: ["紅燒牛肉麵", "清燉牛腩", "牛腩煲"],
      buyTip: "燉湯選帶筋膜的牛腩，煮完肉才不會散。",
      region: "400,176 476,176 476,226 560,226 560,296 400,296",
      label: [470, 268],
    },
    {
      id: "shank",
      name: "牛腱",
      nameEn: "Shank",
      aliases: ["腱子部", "腱子心", "金錢腱", "牛腱心"],
      description: "腿部肌肉，筋多、膠質豐富，滷過後切片是台灣家常冷盤；也是牛肉麵常用的部位。",
      texture: "筋肉交錯，切面有花紋，滷後Q彈。",
      fat: 1,
      tenderness: 2,
      methods: [
        { method: "lu", thickness: "整條", time: "小火 1.5–2 小時，泡在滷汁中放涼", tip: "冷藏後逆紋切 0.3 cm 片最漂亮。" },
        { method: "braise", thickness: "3–4 cm 塊", time: "小火 2 小時", tip: "牛肉麵用腱子心最有口感。" },
        { method: "soup", thickness: "3 cm 塊", time: "小火 2 小時", tip: "清燉牛肉湯。" },
      ],
      dishes: ["滷牛腱", "牛肉麵", "牛腱冷盤"],
      buyTip: "腱子心（金錢腱）筋紋最漂亮，適合切片冷盤。",
      region: "M140 296 L232 296 L232 400 L140 400 Z M470 296 L600 296 L600 400 L470 400 Z",
      label: [318, 384],
      anchor: [186, 330],
    },
    {
      id: "oxtail",
      name: "牛尾",
      nameEn: "Oxtail",
      aliases: ["牛尾巴"],
      description: "膠質豐富，燉湯濃郁，肉從骨頭上脫落時最好吃。",
      texture: "骨多肉少，膠質黏口。",
      fat: 3,
      tenderness: 2,
      methods: [
        { method: "soup", thickness: "依關節切 5 cm 段", time: "小火 3–4 小時", tip: "牛尾湯：先汆燙、撈除浮油。" },
        { method: "braise", thickness: "5 cm 段", time: "小火 3 小時" },
      ],
      dishes: ["牛尾湯", "紅燒牛尾"],
      buyTip: "選粗細接近的段，燉煮時間較一致。",
      region: "M586 150 C612 170 614 224 604 254 L596 252 C602 222 600 182 584 164 Z",
      label: [616, 120],
      anchor: [600, 168],
    },
  ],
  others: [
    {
      id: "tendon",
      name: "牛筋",
      nameEn: "Tendon",
      aliases: ["蹄筋"],
      description: "腿部的筋，幾乎全是膠原蛋白，燉到透明軟Q。",
      texture: "燉透後軟Q黏口。",
      fat: 1,
      tenderness: 1,
      methods: [
        { method: "braise", thickness: "4 cm 段", time: "小火 3 小時或壓力鍋 40 分鐘" },
        { method: "lu", thickness: "整條滷後切段", time: "小火 2.5–3 小時" },
      ],
      dishes: ["半筋半肉牛肉麵", "滷牛筋", "牛筋火鍋"],
      buyTip: "生牛筋要燉很久，可買已滷好的。",
    },
    {
      id: "tripe",
      name: "牛肚",
      nameEn: "Tripe",
      aliases: ["毛肚", "牛百葉", "蜂巢肚"],
      description: "牛的胃，毛肚（百葉）脆口適合涮火鍋，蜂巢肚適合滷燉。",
      texture: "毛肚脆口；蜂巢肚軟Q。",
      fat: 1,
      tenderness: 2,
      methods: [
        { method: "hotpot", thickness: "毛肚切 3 cm 寬條", time: "七上八下，涮 10–15 秒", tip: "麻辣鍋必點，涮太久會變硬。" },
        { method: "lu", thickness: "蜂巢肚整塊", time: "小火 2 小時後切條" },
      ],
      dishes: ["麻辣鍋毛肚", "滷牛肚", "牛雜湯"],
      buyTip: "選顏色自然、不過白（過白可能經漂白）的。",
    },
  ],
};

// 雞、鴨、鵝共用的禽類輪廓：頭、頸長度與腳掌不同
function poultryOutline(kind: "chicken" | "duck" | "goose"): string {
  if (kind === "chicken") {
    return "M150 92 C166 60 204 60 214 92 C222 110 218 130 230 150 C300 140 420 136 500 150 C548 120 586 110 600 124 C604 160 580 210 540 236 C510 268 450 290 380 290 L376 316 L398 346 L392 352 L366 330 L350 352 L342 346 L356 316 L352 290 C300 290 250 272 222 244 C196 220 176 180 168 150 C156 140 136 136 118 136 L102 124 L124 116 C130 104 140 96 150 92 Z";
  }
  if (kind === "duck") {
    return "M150 76 C170 54 204 60 210 86 C214 106 206 126 216 150 C290 150 420 150 500 160 C544 150 580 150 598 160 C596 190 570 220 530 240 C500 262 440 280 380 280 L376 312 L404 346 L364 346 L356 330 L346 346 L326 346 L352 312 L350 280 C290 278 240 262 216 236 C194 214 176 182 170 156 C160 136 150 126 136 120 L80 122 C72 118 74 106 82 104 L136 96 C138 88 142 82 150 76 Z";
  }
  return "M130 36 C150 18 180 22 186 44 C190 62 184 82 188 104 C194 130 204 152 226 168 C300 158 420 156 500 168 C546 158 584 160 600 170 C598 200 572 230 532 250 C502 272 442 290 382 290 L378 318 L406 350 L366 350 L358 334 L348 350 L328 350 L354 318 L352 290 C292 288 242 270 218 244 C196 222 178 188 172 150 C166 118 164 84 150 66 C140 58 120 62 100 62 L62 66 C54 62 56 52 64 50 L106 46 C112 40 120 36 130 36 Z";
}

const POULTRY_DETAILS: Record<"chicken" | "duck" | "goose", string[]> = {
  chicken: ["M176 100 a4 4 0 1 0 0.1 0", "M150 92 C150 70 170 56 186 64 C198 52 214 62 206 80"],
  duck: ["M176 92 a4 4 0 1 0 0.1 0"],
  goose: ["M150 48 a4 4 0 1 0 0.1 0", "M106 46 C104 38 114 32 124 36"],
};

// 禽類部位的共同範圍：背部（骨架）鋪滿整個身體當底層，其他部位疊在上面，就不會有空白縫
const P = {
  neck: "0,0 232,0 232,160 196,250 0,250",
  back: "232,0 640,0 640,400 232,400",
  tail: "566,0 640,0 640,320 548,320 548,236 566,220",
  breast: "232,200 330,200 330,320 196,320 196,250",
  tender: "232,200 330,200 330,226 232,226",
  thigh: "330,200 470,200 470,320 330,320",
  wing: "M276 186 C330 160 420 160 470 180 C440 206 370 222 296 216 C280 210 272 198 276 186 Z",
  feet: "0,320 640,320 640,400 0,400",
  // 雞翅三段（畫在翅膀形狀裡）
  drumette: "260,150 335,150 335,230 260,230",
  wingflat: "335,150 420,150 420,230 335,230",
  wingtip: "420,150 490,150 490,230 420,230",
  // 雞腿兩段
  upperthigh: "330,200 470,200 470,262 330,262",
  drumstick: "330,262 470,262 470,320 330,320",
};
// 頭部範圍：頭的下緣依鳥的種類不同（鵝的脖子最長）
const HEAD: Record<"chicken" | "duck" | "goose", string> = {
  chicken: "0,0 260,0 260,120 0,120",
  duck: "0,0 260,0 260,114 0,114",
  goose: "0,0 260,0 260,76 0,76",
};
// 禽類部位的繪製順序（後畫的蓋在上面）
export const POULTRY_LAYER_ORDER = ["back", "tail", "breast", "thigh", "drumstick", "tender", "wing", "drumette", "wingflat", "wingtip", "neck", "head", "feet"];

function poultryCut(base: Omit<MeatCut, "region" | "label">, region: string, label: [number, number], extra?: Partial<MeatCut>): MeatCut {
  return { ...base, region, label, ...extra };
}

// ── 雞 ─────────────────────────────────────────
const CHICKEN: Animal = {
  id: "chicken",
  name: "雞肉",
  nameEn: "Chicken",
  intro: "台灣有肉雞（白肉雞）、土雞、仿土雞、烏骨雞。肉雞嫩、適合煎炸；土雞肉緊有嚼勁，燉湯、白斬最香。",
  outline: poultryOutline("chicken"),
  details: POULTRY_DETAILS.chicken,
  cuts: [
    poultryCut({
      id: "head", name: "雞頭", nameEn: "Head", aliases: ["雞冠（頭頂）"],
      description: "肉很少，雞冠膠質多，多用在滷味或與骨架一起熬湯。", texture: "皮與膠質為主。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "整顆", time: "小火 20–30 分鐘" },
        { method: "soup", thickness: "整顆，與骨架一起", time: "小火 1–2 小時" },
      ],
      dishes: ["滷雞頭", "雞高湯"], buyTip: "滷之前先汆燙去腥。",
    }, HEAD.chicken, [176, 114]),
    poultryCut({
      id: "neck", name: "雞脖", nameEn: "Neck", aliases: ["雞脖子", "雞頸"],
      description: "肉少骨多，骨節間的細碎肉很香，滷味攤常見，也是熬湯的好材料。", texture: "骨多、皮多，細碎的肉很香。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "雞脖切 5 cm 段", time: "小火 30–40 分鐘" },
        { method: "soup", thickness: "整段", time: "小火 1 小時", tip: "與雞骨架一起熬高湯。" },
      ],
      dishes: ["滷雞脖", "雞高湯"], buyTip: "雞脖子的皮有較多淋巴，滷之前可先剝除。",
    }, P.neck, [204, 200]),
    poultryCut({
      id: "breast", name: "雞胸肉", nameEn: "Breast", aliases: ["清肉", "雞胸"],
      description: "高蛋白、低脂肪的白肉，容易煮太乾，控制溫度與厚度是關鍵。台式炸雞排用的就是雞胸。", texture: "瘦、細緻，過熟會乾柴。", fat: 1, tenderness: 3,
      methods: [
        { method: "sousvide", thickness: "整塊（約 2–2.5 cm 厚）", time: "62–64°C 1–1.5 小時", tip: "健身餐的經典做法，最多汁。" },
        { method: "boil", thickness: "片開成 2 cm 厚", time: "水滾後放入、關火蓋鍋泡 15 分鐘", tip: "雞絲飯、涼拌雞絲。" },
        { method: "deepfry", thickness: "蝴蝶切開成 1 cm 大片", time: "170°C 炸 4–5 分鐘", tip: "台式炸雞排先醃 2 小時再沾地瓜粉。" },
        { method: "panfry", thickness: "片開 1.5 cm", time: "中火每面 3–4 分鐘，靜置 3 分鐘" },
        { method: "stirfry", thickness: "2 cm 丁", time: "大火 2–3 分鐘", tip: "宮保雞丁先抓蛋白與太白粉。" },
      ],
      dishes: ["炸雞排", "雞肉飯（嘉義）", "舒肥雞胸", "宮保雞丁"], buyTip: "肉色淡粉、表面不黏手。",
    }, P.breast, [262, 284]),
    poultryCut({
      id: "tender", name: "雞柳", nameEn: "Tenderloin", aliases: ["雞里肌", "雞柳條", "嫩里肌"],
      description: "雞胸內側的細長肉條，比雞胸更嫩，一隻雞只有兩條。", texture: "最軟嫩的雞肉，中間有一條白筋。", fat: 1, tenderness: 5,
      methods: [
        { method: "deepfry", thickness: "整條", time: "170°C 炸 3 分鐘", tip: "先拉除中間的白筋。" },
        { method: "stirfry", thickness: "0.5 cm 斜片", time: "大火 1–2 分鐘" },
        { method: "boil", thickness: "整條", time: "滾水關火泡 6–8 分鐘", tip: "日式雞柳沙拉。" },
      ],
      dishes: ["炸雞柳", "雞柳沙拉", "炒雞柳"], buyTip: "肉條完整、顏色均勻。",
    }, P.tender, [130, 300], { anchor: [250, 222] }),
    poultryCut({
      id: "drumette", name: "翅小腿", nameEn: "Drumette", aliases: ["翅根", "翅腿", "小雞腿"],
      description: "翅膀連著身體的那一段，形狀像迷你雞腿，肉最多、價格最實惠。", texture: "肉多、口感像雞腿，皮比二節翅少。", fat: 3, tenderness: 4,
      methods: [
        { method: "deepfry", thickness: "整隻", time: "170°C 炸 7–8 分鐘", tip: "鹽酥翅腿、韓式炸雞。" },
        { method: "roast", thickness: "整隻，兩面劃刀", time: "200°C 烤 20–25 分鐘" },
        { method: "lu", thickness: "整隻", time: "小火 20 分鐘", tip: "可樂翅腿。" },
      ],
      dishes: ["炸翅腿", "烤翅腿", "可樂翅腿"], buyTip: "比二節翅便宜，想吃肉多選翅小腿。",
    }, P.drumette, [300, 206], { within: P.wing }),
    poultryCut({
      id: "wingflat", name: "二節翅", nameEn: "Wing Flat (Mid-joint)", aliases: ["中翅", "雞中翅"],
      description: "翅膀中間那一段，有兩根細骨，皮多、膠質多，是最受歡迎的雞翅部位。", texture: "皮多Q彈，肉細嫩，膠質豐富。", fat: 3, tenderness: 4,
      methods: [
        { method: "roast", thickness: "整隻，兩面劃刀", time: "200°C 烤 20–25 分鐘" },
        { method: "deepfry", thickness: "整隻", time: "170°C 炸 6–7 分鐘" },
        { method: "lu", thickness: "整隻", time: "小火 15–20 分鐘", tip: "可樂雞翅、滷雞翅。" },
        { method: "panfry", thickness: "整隻，皮朝下", time: "中小火每面 5–6 分鐘", tip: "鹽烤雞翅。" },
      ],
      dishes: ["可樂雞翅", "烤雞翅", "雞翅包飯"], buyTip: "大小均勻的熟度比較一致。",
    }, P.wingflat, [378, 206], { within: P.wing }),
    poultryCut({
      id: "wingtip", name: "翅尖", nameEn: "Wing Tip", aliases: ["雞翅尖"],
      description: "翅膀最末端，幾乎沒有肉，皮與膠質為主，多用來滷或熬湯。", texture: "皮多、骨多，啃起來有滋味。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "整隻", time: "小火 20 分鐘" },
        { method: "soup", thickness: "整隻", time: "小火 1 小時", tip: "和雞骨架一起熬湯更濃。" },
      ],
      dishes: ["滷翅尖", "雞高湯"], buyTip: "通常很便宜，適合熬湯。",
    }, P.wingtip, [450, 196], { within: P.wing }),
    poultryCut({
      id: "thigh", name: "雞腿排", nameEn: "Thigh", aliases: ["上腿", "去骨雞腿排", "雞腿排"],
      description: "雞腿的上半段，油脂與肉汁最豐富，久煮不柴。去骨就是雞腿排，帶骨剁塊適合三杯、燉湯。", texture: "肉多汁、有彈性。", fat: 3, tenderness: 4,
      methods: [
        { method: "panfry", thickness: "去骨腿排 1.5–2 cm，斷筋", time: "皮朝下中火 6–8 分鐘，翻面 3–4 分鐘", tip: "壓著煎，皮才平整酥脆。" },
        { method: "braise", thickness: "帶骨剁 4 cm 塊", time: "小火 15–20 分鐘", tip: "三杯雞：麻油爆薑、米酒、醬油各一杯。" },
        { method: "soup", thickness: "帶骨剁 4 cm 塊", time: "小火 40–60 分鐘", tip: "香菇雞湯、麻油雞。" },
        { method: "deepfry", thickness: "切 3 cm 塊", time: "170°C 炸 5 分鐘", tip: "鹽酥雞、唐揚雞。" },
      ],
      dishes: ["三杯雞", "麻油雞", "雞腿排便當", "鹽酥雞"], buyTip: "去骨腿排請攤商先斷筋，煎時才不會縮。",
    }, P.upperthigh, [400, 244]),
    poultryCut({
      id: "drumstick", name: "棒棒腿", nameEn: "Drumstick", aliases: ["雞小腿", "下腿"],
      description: "雞腿的下半段，肉質緊實、帶筋，整隻烤、滷、炸都很適合，便當店的大雞腿就是整隻腿。", texture: "肉緊實有彈性，靠近骨頭處帶筋。", fat: 2, tenderness: 3,
      methods: [
        { method: "roast", thickness: "整隻，劃 2–3 刀", time: "200°C 烤 30–35 分鐘" },
        { method: "lu", thickness: "整隻", time: "小火 25–30 分鐘，泡滷汁入味" },
        { method: "deepfry", thickness: "整隻", time: "160°C 炸 10–12 分鐘", tip: "炸大雞腿便當。" },
        { method: "soup", thickness: "整隻或剁 2 段", time: "小火 40 分鐘" },
      ],
      dishes: ["滷雞腿", "烤棒棒腿", "炸雞腿便當"], buyTip: "粗細接近的一起烤，熟度比較一致。",
    }, P.drumstick, [400, 304]),
    poultryCut({
      id: "back", name: "雞背骨架", nameEn: "Back & Carcass", aliases: ["雞骨架", "雞骨"],
      description: "剔下肉後剩下的骨架，熬高湯的最佳材料。", texture: "骨多肉少。", fat: 2, tenderness: 2,
      methods: [{ method: "soup", thickness: "整副剁開", time: "小火 2–3 小時", tip: "先汆燙去血水，加蔥薑熬成清雞湯。" }],
      dishes: ["雞高湯", "雞白湯拉麵"], buyTip: "一次多買冷凍，熬湯前不用退冰。",
    }, P.back, [508, 262]),
    poultryCut({
      id: "tail", name: "雞屁股", nameEn: "Tail (Pope's Nose)", aliases: ["雞尾椎", "七里香"],
      description: "雞尾巴上的一小塊，油脂豐富，烤得焦香是夜市串烤的人氣品項。", texture: "油脂多、外焦內軟。", fat: 5, tenderness: 4,
      methods: [
        { method: "grill", thickness: "整顆串成串", time: "中火 8–10 分鐘", tip: "先切除尾端的尾脂腺，才不會有腥味。" },
        { method: "deepfry", thickness: "整顆", time: "170°C 炸 4–5 分鐘" },
      ],
      dishes: ["烤七里香", "鹽酥雞屁股"], buyTip: "請攤商處理好尾脂腺。",
    }, P.tail, [596, 222]),
    poultryCut({
      id: "feet", name: "雞爪", nameEn: "Feet", aliases: ["雞腳", "鳳爪"],
      description: "幾乎全是皮與筋，膠質豐富，滷、泡椒、燉湯都受歡迎。", texture: "皮Q、筋脆。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "剪去趾甲，整隻", time: "小火 30–40 分鐘" },
        { method: "boil", thickness: "整隻或對切", time: "煮 10 分鐘後冰鎮", tip: "泡椒雞爪、檸檬雞爪。" },
        { method: "steam", thickness: "炸過後整隻蒸", time: "大火 30 分鐘", tip: "港式豉汁鳳爪。" },
      ],
      dishes: ["滷雞腳", "泡椒鳳爪", "豉汁鳳爪"], buyTip: "表皮白淨、沒有黑斑。",
    }, P.feet, [380, 384]),
  ],
  others: [
    {
      id: "gizzard", name: "雞胗", nameEn: "Gizzard", aliases: ["雞肫"],
      description: "雞的胃部肌肉，口感爽脆，滷味與鹽酥雞攤的必點。", texture: "脆口有嚼勁。", fat: 1, tenderness: 2,
      methods: [
        { method: "lu", thickness: "整顆滷後切片", time: "小火 30 分鐘" },
        { method: "stirfry", thickness: "切 0.3 cm 片或剞花刀", time: "大火 1–2 分鐘", tip: "三杯雞胗、薑絲炒雞胗。" },
        { method: "deepfry", thickness: "切 1 cm 片", time: "170°C 炸 2 分鐘" },
      ],
      dishes: ["滷雞胗", "鹽酥雞胗"], buyTip: "去除內膜（黃色角質層）。",
    },
    {
      id: "heart", name: "雞心", nameEn: "Heart", aliases: [],
      description: "小小一顆，口感彈牙，燒烤攤與滷味常見。", texture: "彈牙。", fat: 2, tenderness: 3,
      methods: [{ method: "grill", thickness: "整顆串燒", time: "中火 5–6 分鐘" }, { method: "lu", thickness: "整顆", time: "小火 20 分鐘" }],
      dishes: ["烤雞心", "滷雞心"], buyTip: "顏色暗紅有光澤。",
    },
  ],
};

// ── 鴨 ─────────────────────────────────────────
const DUCK: Animal = {
  id: "duck",
  name: "鴨肉",
  nameEn: "Duck",
  intro: "台灣常見番鴨（薑母鴨、當歸鴨）、櫻桃鴨（烤鴨、鴨胸）與菜鴨。鴨肉油脂集中在皮下，煎鴨胸要慢慢把油逼出來。",
  outline: poultryOutline("duck"),
  details: POULTRY_DETAILS.duck,
  cuts: [
    poultryCut({
      id: "head", name: "鴨頭", nameEn: "Head", aliases: ["鴨舌（頭部）"],
      description: "東山鴨頭的主角，鴨舌也是滷味、熱炒常見的下酒菜。", texture: "皮Q骨多，鴨舌脆中帶軟骨。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "整顆對切", time: "小火 40–60 分鐘，泡滷汁入味" },
        { method: "deepfry", thickness: "鴨舌整條", time: "170°C 炸 2 分鐘", tip: "椒鹽鴨舌。" },
      ],
      dishes: ["東山鴨頭", "滷鴨舌", "椒鹽鴨舌"], buyTip: "滷味用的鴨舌要先汆燙去腥。",
    }, HEAD.duck, [180, 108]),
    poultryCut({
      id: "neck", name: "鴨脖", nameEn: "Neck", aliases: ["鴨脖子", "鴨頸"],
      description: "滷味攤的經典，骨節間的肉有嚼勁、越啃越香。", texture: "骨多、皮Q，肉有嚼勁。", fat: 2, tenderness: 2,
      methods: [
        { method: "lu", thickness: "切 6–8 cm 段", time: "小火 40 分鐘，泡滷汁入味", tip: "麻辣鴨脖：滷汁加花椒、辣椒。" },
        { method: "soup", thickness: "整條", time: "小火 1 小時" },
      ],
      dishes: ["滷鴨脖", "麻辣鴨脖", "東山鴨頭（鴨脖）"], buyTip: "粗一點的鴨脖肉較多。",
    }, P.neck, [204, 196]),
    poultryCut({
      id: "breast", name: "鴨胸", nameEn: "Breast", aliases: ["鴨胸肉"],
      description: "肉色深紅、皮下有厚油脂，煎成粉紅色的半熟最好吃。宜蘭鴨賞則是整隻鴨醃製後煙燻。", texture: "肉質紮實多汁，皮煎酥後香脆。", fat: 4, tenderness: 4,
      methods: [
        { method: "panfry", thickness: "整塊，皮面劃菱格紋", time: "冷鍋皮朝下小火 8–10 分鐘，翻面 2–3 分鐘，靜置 5 分鐘", tip: "切 0.5–0.8 cm 斜片，中心粉紅色最嫩。" },
        { method: "smoke", thickness: "整塊", time: "醃一晚後煙燻 10–15 分鐘", tip: "煙燻鴨胸、鴨賞的風味。" },
        { method: "roast", thickness: "整塊", time: "200°C 烤 12–15 分鐘" },
      ],
      dishes: ["香煎鴨胸", "煙燻鴨胸", "鴨賞"], buyTip: "煎出的鴨油可以留著炒青菜、拌飯。",
    }, P.breast, [262, 284]),
    poultryCut({
      id: "wing", name: "鴨翅", nameEn: "Wing", aliases: [],
      description: "肉少皮多，以滷為主。", texture: "皮Q、骨邊肉有嚼勁。", fat: 3, tenderness: 2,
      methods: [{ method: "lu", thickness: "整隻或切兩段", time: "小火 40–50 分鐘" }, { method: "roast", thickness: "整隻", time: "200°C 烤 25 分鐘" }],
      dishes: ["滷鴨翅"], buyTip: "選皮面完整的。",
    }, P.wing, [372, 194]),
    poultryCut({
      id: "thigh", name: "鴨腿", nameEn: "Leg", aliases: ["鴨腿肉"],
      description: "運動量大、肉味濃，適合長時間燉煮或油封。薑母鴨用番鴨剁塊。", texture: "肉緊實、有嚼勁，久煮軟嫩。", fat: 3, tenderness: 2,
      methods: [
        { method: "braise", thickness: "帶骨剁 4–5 cm 塊", time: "小火 60–90 分鐘", tip: "薑母鴨：老薑、麻油爆香，加米酒燉。" },
        { method: "soup", thickness: "帶骨剁 4 cm 塊", time: "小火 1 小時", tip: "當歸鴨麵線、酸菜鴨湯。" },
        { method: "roast", thickness: "整隻鴨腿", time: "低溫 150°C 1.5 小時，最後 220°C 烤脆皮", tip: "接近油封鴨腿的口感。" },
      ],
      dishes: ["薑母鴨", "當歸鴨", "油封鴨腿"], buyTip: "薑母鴨要用番鴨，肉質較紮實不易散。",
    }, P.thigh, [400, 266]),
    poultryCut({
      id: "back", name: "鴨架", nameEn: "Carcass", aliases: ["鴨骨"],
      description: "烤鴨片完肉後的骨架，熬湯或炒鴨架都是「烤鴨三吃」的一部分。", texture: "骨多肉少。", fat: 3, tenderness: 2,
      methods: [
        { method: "soup", thickness: "剁大塊", time: "小火 1–1.5 小時", tip: "鴨骨湯加酸菜、豆腐。" },
        { method: "stirfry", thickness: "剁 4 cm 塊", time: "大火 3–4 分鐘", tip: "椒鹽鴨架。" },
      ],
      dishes: ["烤鴨三吃", "鴨骨湯"], buyTip: "買烤鴨時可請店家幫忙剁好鴨架。",
    }, P.back, [508, 262]),
    poultryCut({
      id: "feet", name: "鴨掌", nameEn: "Feet", aliases: ["鴨腳"],
      description: "有蹼、膠質多，去骨後涼拌是熱炒店常見小菜。", texture: "脆Q。", fat: 1, tenderness: 2,
      methods: [
        { method: "lu", thickness: "整隻", time: "小火 40 分鐘" },
        { method: "boil", thickness: "煮熟後去骨", time: "煮 15 分鐘後冰鎮", tip: "芥末鴨掌。" },
      ],
      dishes: ["芥末鴨掌", "滷鴨掌"], buyTip: "表皮完整、無破損。",
    }, P.feet, [380, 384]),
  ],
  others: [
    {
      id: "blood", name: "鴨血", nameEn: "Duck Blood", aliases: [],
      description: "滑嫩、吸湯汁，是麻辣鍋的必備配料。", texture: "滑嫩。", fat: 1, tenderness: 5,
      methods: [{ method: "hotpot", thickness: "切 3 cm 方塊", time: "小火煮 10 分鐘以上更入味" }],
      dishes: ["麻辣鴨血", "臭臭鍋"], buyTip: "顏色暗紅、切面細緻。",
    },
    {
      id: "intestine", name: "鴨腸", nameEn: "Duck Intestine", aliases: [],
      description: "爽脆，涮或快炒都要快，煮久會變硬。", texture: "脆口。", fat: 1, tenderness: 3,
      methods: [{ method: "hotpot", thickness: "切 6 cm 段", time: "涮 10 秒" }, { method: "stirfry", thickness: "切 4 cm 段", time: "大火 30 秒", tip: "韭菜炒鴨腸。" }],
      dishes: ["麻辣鍋鴨腸", "韭菜鴨腸"], buyTip: "要徹底清洗並用鹽、麵粉搓過。",
    },
  ],
};

// ── 鵝 ─────────────────────────────────────────
const GOOSE: Animal = {
  id: "goose",
  name: "鵝肉",
  nameEn: "Goose",
  intro: "台灣鵝肉多以白鵝製作，最常見的是鵝肉攤的白斬鵝與煙燻鵝，搭配薑絲、醬油膏，再來一碗鵝肉米粉或鵝油拌麵。",
  outline: poultryOutline("goose"),
  details: POULTRY_DETAILS.goose,
  cuts: [
    poultryCut({
      id: "head", name: "鵝頭", nameEn: "Head", aliases: ["鵝頭（含鵝舌）"],
      description: "鵝頭較大，額頭的肉瘤與鵝舌都是鵝肉攤的人氣小菜，以滷為主。", texture: "皮厚Q、膠質多。", fat: 3, tenderness: 2,
      methods: [{ method: "lu", thickness: "整顆對切", time: "小火 50–60 分鐘" }],
      dishes: ["滷鵝頭", "滷鵝舌"], buyTip: "鵝肉攤可單點，請店家剁開。",
    }, HEAD.goose, [240, 40], { anchor: [168, 56] }),
    poultryCut({
      id: "neck", name: "鵝脖", nameEn: "Neck", aliases: ["鵝頸"],
      description: "鵝脖比鴨脖更長更粗，皮厚肉多，滷或煙燻後切段。", texture: "皮Q、骨邊肉香。", fat: 3, tenderness: 2,
      methods: [{ method: "lu", thickness: "切 6 cm 段", time: "小火 50–60 分鐘" }, { method: "smoke", thickness: "煮熟後整條", time: "煙燻 10 分鐘" }],
      dishes: ["滷鵝脖", "煙燻鵝脖"], buyTip: "鵝肉攤可單點，請店家剁成小段。",
    }, P.neck, [192, 170]),
    poultryCut({
      id: "breast", name: "鵝胸", nameEn: "Breast", aliases: ["鵝肉（胸肉）", "鵝胸肉"],
      description: "鵝肉攤切盤的主力部位，肉厚、皮下油脂香。白斬是整隻浸煮後放涼切片。", texture: "肉紮實、皮下油香。", fat: 3, tenderness: 3,
      methods: [
        { method: "boil", thickness: "整隻浸煮，放涼後帶骨切 0.8–1 cm 片", time: "依大小約 50–70 分鐘（小火保持微滾）", tip: "白斬鵝：煮好浸冰水，皮更Q脆。" },
        { method: "smoke", thickness: "煮熟後整塊煙燻，切 0.8 cm 片", time: "煙燻 10–15 分鐘", tip: "用糖、茶葉、米煙燻出香氣。" },
      ],
      dishes: ["白斬鵝", "煙燻鵝肉", "鵝肉切盤"], buyTip: "肉攤切盤可指定「胸肉」或「腿肉」，胸肉肉多油少。",
    }, P.breast, [262, 284]),
    poultryCut({
      id: "wing", name: "鵝翅", nameEn: "Wing", aliases: [],
      description: "大而有肉，滷到入味很下酒。", texture: "皮厚Q、肉有嚼勁。", fat: 3, tenderness: 2,
      methods: [{ method: "lu", thickness: "切兩段", time: "小火 60 分鐘" }],
      dishes: ["滷鵝翅"], buyTip: "選大小均勻的。",
    }, P.wing, [372, 196]),
    poultryCut({
      id: "thigh", name: "鵝腿", nameEn: "Leg", aliases: ["鵝腿肉"],
      description: "肉多油多，白斬或煙燻都比胸肉更滑嫩多汁。", texture: "多汁、油脂較多。", fat: 4, tenderness: 4,
      methods: [
        { method: "boil", thickness: "整隻浸煮後帶骨切 1 cm 片", time: "隨整隻煮 50–70 分鐘" },
        { method: "smoke", thickness: "煮熟後煙燻", time: "10–15 分鐘" },
        { method: "braise", thickness: "剁 4 cm 塊", time: "小火 60–80 分鐘", tip: "紅燒鵝肉、鵝肉燉蘿蔔。" },
      ],
      dishes: ["鵝腿切盤", "紅燒鵝肉"], buyTip: "喜歡多汁口感選腿肉。",
    }, P.thigh, [400, 270]),
    poultryCut({
      id: "back", name: "鵝架", nameEn: "Carcass", aliases: ["鵝骨"],
      description: "鵝肉攤熬湯頭的材料，鵝肉米粉、鵝肉麵的湯底就來自鵝骨。", texture: "骨多肉少。", fat: 3, tenderness: 2,
      methods: [{ method: "soup", thickness: "剁大塊", time: "小火 2–3 小時" }],
      dishes: ["鵝肉米粉湯", "鵝肉麵"], buyTip: "向鵝肉攤購買通常較便宜。",
    }, P.back, [508, 262]),
    poultryCut({
      id: "feet", name: "鵝掌", nameEn: "Feet", aliases: ["鵝腳"],
      description: "厚實有膠質，紅燒或滷到軟Q，港式燒鵝掌也很有名。", texture: "厚Q、膠質多。", fat: 2, tenderness: 2,
      methods: [{ method: "lu", thickness: "整隻", time: "小火 60–90 分鐘" }, { method: "braise", thickness: "整隻，先炸後燜", time: "小火 1.5 小時" }],
      dishes: ["滷鵝掌", "紅燒鵝掌"], buyTip: "表皮完整、蹼沒有破損。",
    }, P.feet, [380, 384]),
  ],
  others: [
    {
      id: "intestine", name: "鵝腸", nameEn: "Goose Intestine", aliases: [],
      description: "鵝肉攤的人氣小菜，爽脆有嚼勁，汆燙時間是關鍵。", texture: "脆口。", fat: 1, tenderness: 3,
      methods: [{ method: "boil", thickness: "切 5 cm 段", time: "滾水 10–15 秒立刻撈起", tip: "沾薑絲醬油膏。" }, { method: "stirfry", thickness: "切 4 cm 段", time: "大火 30 秒", tip: "韭菜炒鵝腸。" }],
      dishes: ["涼拌鵝腸", "韭菜鵝腸"], buyTip: "顏色乳白、彈性好。",
    },
    {
      id: "liver", name: "鵝肝", nameEn: "Goose Liver", aliases: [],
      description: "台式鵝肝多是滷製後切片，口感綿密；與法式肥肝（Foie gras）不同。", texture: "綿密。", fat: 3, tenderness: 4,
      methods: [{ method: "lu", thickness: "整副", time: "小火 15–20 分鐘，泡滷汁放涼" }],
      dishes: ["滷鵝肝切片"], buyTip: "顏色均勻、無血斑。",
    },
    {
      id: "fat", name: "鵝油", nameEn: "Goose Fat", aliases: ["鵝油蔥"],
      description: "鵝肉攤的靈魂，鵝油爆紅蔥頭做成鵝油蔥，拌飯、拌麵、燙青菜都香。", texture: "—", fat: 5, tenderness: 5,
      methods: [{ method: "stirfry", thickness: "鵝皮、鵝脂切小塊煸油", time: "小火 20–30 分鐘", tip: "最後加紅蔥頭炸到金黃。" }],
      dishes: ["鵝油拌飯", "鵝油燙青菜"], buyTip: "也可直接向鵝肉攤購買現成的鵝油蔥。",
    },
  ],
};

// ── 羊 ─────────────────────────────────────────
const LAMB: Animal = {
  id: "lamb",
  name: "羊肉",
  nameEn: "Lamb & Goat",
  intro: "台灣常見進口紐澳羊肉，以及本地的山羊肉（羊肉爐、沙茶羊肉多用帶皮山羊）。冬天吃羊肉爐是台灣的進補習慣。",
  outline:
    "M126 120 C150 98 196 96 214 120 C250 110 330 104 420 108 C500 112 560 126 576 160 C588 190 584 236 568 262 L570 350 L544 350 L538 290 L514 290 L510 350 L484 350 L480 284 C410 290 320 290 246 282 L240 350 L214 350 L210 286 L196 286 L192 350 L166 350 L162 262 C150 252 140 238 132 222 C112 222 94 218 82 206 C70 194 72 176 86 170 C96 166 104 160 110 150 C112 138 116 128 126 120 Z",
  details: ["M104 182 a4 4 0 1 0 0.1 0", "M132 120 C120 96 140 84 150 104"],
  cuts: [
    {
      id: "neck", name: "羊頸", nameEn: "Neck", aliases: ["羊脖子"],
      description: "肉帶骨、筋膜多，燉煮後滑嫩入味。", texture: "膠質多、久燉軟嫩。", fat: 3, tenderness: 2,
      methods: [{ method: "braise", thickness: "帶骨切 3–4 cm 段", time: "小火 1.5–2 小時" }, { method: "soup", thickness: "帶骨 4 cm 段", time: "小火 1.5 小時" }],
      dishes: ["燉羊頸", "羊肉湯"], buyTip: "帶骨燉煮湯頭更香。",
      region: "0,0 214,0 214,300 0,300", label: [150, 184],
    },
    {
      id: "shoulder", name: "羊肩", nameEn: "Shoulder", aliases: ["前腿肉"],
      description: "肥瘦適中、帶骨帶筋，慢燉、慢烤都適合；羊肉爐常用帶骨帶皮的部位。", texture: "油脂適中，慢煮後軟嫩。", fat: 3, tenderness: 3,
      methods: [
        { method: "braise", thickness: "帶骨帶皮剁 3–4 cm 塊", time: "小火 1.5–2 小時", tip: "羊肉爐：麻油爆老薑，加中藥包、米酒燉。" },
        { method: "roast", thickness: "整塊", time: "160°C 慢烤 3 小時", tip: "烤到可以用叉子撥開。" },
        { method: "stirfry", thickness: "逆紋 0.2 cm 片", time: "大火 1 分鐘", tip: "沙茶羊肉。" },
      ],
      dishes: ["羊肉爐", "沙茶羊肉", "慢烤羊肩"], buyTip: "羊肉爐選帶皮山羊肉，口感更Q。",
      region: "214,0 330,0 330,190 214,190", label: [270, 156],
    },
    {
      id: "rack", name: "羊排", nameEn: "Rack (Rib Chops)", aliases: ["法式羊排", "肋排", "羊小排"],
      description: "肋骨連著的背肉，切成一支支就是法式羊排，軟嫩少羶味。", texture: "軟嫩、油花細。", fat: 3, tenderness: 4,
      methods: [
        { method: "panfry", thickness: "一支骨（約 2–2.5 cm）", time: "大火每面 2–3 分鐘，五分熟", tip: "油脂邊先立起來煎香。" },
        { method: "grill", thickness: "一支骨", time: "每面 3 分鐘" },
        { method: "roast", thickness: "整排", time: "200°C 烤 15–20 分鐘", tip: "表面先煎上色再進烤箱。" },
      ],
      dishes: ["香煎羊排", "香草烤羊排"], buyTip: "骨頭乾淨（法式修清）的較好看，價格也較高。",
      region: "330,0 430,0 430,170 330,170", label: [380, 140],
    },
    {
      id: "loin", name: "羊里肌", nameEn: "Loin", aliases: ["腰脊", "羊背肉"],
      description: "背部的瘦肉，最嫩、羶味最少，薄切適合涮或炒。", texture: "瘦嫩細緻。", fat: 2, tenderness: 5,
      methods: [
        { method: "hotpot", thickness: "0.15–0.2 cm 薄片", time: "涮 5–8 秒", tip: "涮羊肉。" },
        { method: "stirfry", thickness: "逆紋 0.2 cm 片", time: "大火 30–60 秒", tip: "蔥爆羊肉。" },
        { method: "panfry", thickness: "2.5 cm 厚", time: "大火每面 2 分鐘" },
      ],
      dishes: ["涮羊肉", "蔥爆羊肉", "沙茶羊肉炒麵"], buyTip: "冷凍羊肉片選紋理清楚、無冰晶的。",
      region: "430,0 540,0 540,160 430,160", label: [486, 134],
    },
    {
      id: "breast", name: "羊胸", nameEn: "Breast", aliases: ["羊胸肉", "胸口肉"],
      description: "胸前帶骨帶油的部位，膠質與油脂多，長時間燉煮後軟嫩，是羊肉爐常用的帶骨肉。", texture: "帶骨、油脂多，燉後軟糯。", fat: 4, tenderness: 2,
      methods: [
        { method: "braise", thickness: "帶骨剁 4 cm 塊", time: "小火 1.5–2 小時", tip: "羊肉爐、紅燒羊肉。" },
        { method: "roast", thickness: "整塊帶骨", time: "150°C 慢烤 2.5–3 小時" },
      ],
      dishes: ["羊肉爐", "紅燒羊肉"], buyTip: "帶皮的山羊胸肉燉起來更Q。",
      region: "214,190 330,190 330,300 214,300", label: [272, 252],
    },
    {
      id: "belly", name: "羊腩", nameEn: "Belly / Flank", aliases: ["羊肋", "羊五花"],
      description: "腹部肥瘦相間帶皮的肉，燉羊肉爐、紅燒羊肉最香。", texture: "肥瘦相間、皮Q。", fat: 4, tenderness: 3,
      methods: [
        { method: "braise", thickness: "帶皮 4 cm 塊", time: "小火 1.5–2 小時", tip: "紅燒羊肉、羊肉爐。" },
        { method: "hotpot", thickness: "0.2 cm 薄片", time: "涮 10 秒" },
      ],
      dishes: ["羊肉爐", "紅燒羊肉"], buyTip: "帶皮的較有口感。",
      region: "330,170 430,170 430,160 540,160 540,300 330,300", label: [436, 250],
    },
    {
      id: "rump", name: "羊臀", nameEn: "Rump (Chump)", aliases: ["羊臀肉", "腰臀"],
      description: "腰與後腿之間的肉，瘦而嫩、羶味少，可以像牛排一樣整塊煎，價格比羊排實惠。", texture: "瘦嫩、肉味濃。", fat: 2, tenderness: 4,
      methods: [
        { method: "panfry", thickness: "2.5–3 cm 厚塊", time: "大火每面 3 分鐘，靜置 5 分鐘", tip: "五分熟最嫩。" },
        { method: "roast", thickness: "整塊", time: "200°C 烤 15–20 分鐘" },
        { method: "grill", thickness: "3 cm 丁串成串", time: "大火 6–8 分鐘" },
      ],
      dishes: ["香煎羊臀排", "烤羊臀"], buyTip: "選表面帶一層薄油脂的，煎起來更香。",
      region: "540,0 640,0 640,190 540,190", label: [618, 70], anchor: [562, 150],
    },
    {
      id: "leg", name: "羊腿", nameEn: "Leg", aliases: ["後腿肉"],
      description: "大塊瘦肉，切丁烤串或整隻烤都很適合，新疆羊肉串多用羊腿。", texture: "瘦、有嚼勁、肉味濃。", fat: 2, tenderness: 3,
      methods: [
        { method: "grill", thickness: "切 2.5–3 cm 丁串成串", time: "大火 6–8 分鐘", tip: "孜然羊肉串，肥瘦交錯串更香。" },
        { method: "roast", thickness: "整隻帶骨", time: "180°C 烤 1.5–2 小時" },
        { method: "stirfry", thickness: "逆紋 0.3 cm 片", time: "大火 1 分鐘" },
      ],
      dishes: ["羊肉串", "烤羊腿", "孜然羊肉"], buyTip: "去骨羊腿肉切丁最方便。",
      region: "540,190 640,190 640,300 540,300", label: [612, 236], anchor: [562, 240],
    },
    {
      id: "shank", name: "羊腱", nameEn: "Shank", aliases: ["羊小腿", "羊蹄"],
      description: "腿下段，筋多膠質多，燉到脫骨最好吃。", texture: "膠質豐富，久燉軟Q。", fat: 1, tenderness: 2,
      methods: [{ method: "braise", thickness: "整支", time: "小火 2–2.5 小時" }, { method: "soup", thickness: "整支", time: "小火 2 小時", tip: "當歸羊肉湯。" }],
      dishes: ["燉羊小腿", "當歸羊肉湯"], buyTip: "整支燉，上桌更有份量。",
      region: "0,300 640,300 640,400 0,400", label: [326, 384],
    },
  ],
  others: [],
};

// 合併大賣場／批發名稱與小吃做法
function withExtras(animal: Animal): Animal {
  const extras = CUT_EXTRAS[animal.id] ?? {};
  const merge = (cut: MeatCut): MeatCut => {
    const extra = extras[cut.id];
    if (!extra) return cut;
    return {
      ...cut,
      retailNames: extra.retail,
      wholesaleNames: extra.wholesale,
      methods: [...cut.methods, ...(extra.snacks ?? [])],
    };
  };
  return { ...animal, cuts: animal.cuts.map(merge), others: animal.others.map(merge) };
}

export const ANIMALS: Animal[] = [PORK, BEEF, CHICKEN, DUCK, GOOSE, LAMB].map(withExtras);

export function findAnimal(id: string): Animal | undefined {
  return ANIMALS.find((animal) => animal.id === id);
}
