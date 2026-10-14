import type { CutMethod } from "./meat-cuts";

// 部位的補充資料：大賣場的標示名稱、肉商與批發的說法，以及台灣小吃的做法。
// 依「動物 → 部位 id」對應，於 meat-cuts.ts 合併進部位資料。

type Extra = {
  retail?: string[]; // 大賣場（全聯、家樂福、好市多等）常見的標示
  wholesale?: string[]; // 傳統肉攤、肉品批發商、進口肉商的說法
  snacks?: CutMethod[]; // 台灣小吃的做法（method 一律為 snack）
};

const snack = (dish: string, thickness: string, time: string, tip?: string): CutMethod => ({
  method: "snack",
  dish,
  thickness,
  time,
  tip,
});

export const CUT_EXTRAS: Record<string, Record<string, Extra>> = {
  pork: {
    ear: { retail: ["豬耳朵"], wholesale: ["豬耳"], snacks: [snack("黑白切（豬耳朵）", "滷好後切 0.2 cm 細絲", "滷 40–60 分鐘", "淋醬油膏、薑絲，或拌蒜末辣油。")] },
    foreshank: { retail: ["豬腱", "腱子肉"], wholesale: ["腱子心", "前腱"] },
    spareribs: { retail: ["豬肋排", "整片肋排", "一字排"], wholesale: ["肋排", "一字排", "Spare Ribs"] },
    rump: { retail: ["豬臀肉", "後腿肉片"], wholesale: ["臀肉", "後腿上段"] },
    outerham: { retail: ["後腿肉", "豬絞肉"], wholesale: ["外腿", "後腿外側"] },
    head: { retail: ["豬頭皮"], wholesale: ["頭皮", "嘴邊肉"], snacks: [snack("黑白切（豬頭皮）", "滷或白煮後切 0.3 cm 薄片", "滷 60–90 分鐘", "淋醬油膏、撒薑絲與蔥花。")] },
    jowl: { retail: ["松阪豬肉片", "霜降豬肉"], wholesale: ["頸肉", "霜降", "松阪"] },
    shoulder: {
      retail: ["梅花肉片", "梅花豬排", "梅花火鍋片", "梅花肉塊"],
      wholesale: ["胛心肉（上段）", "梅頭", "梅花"],
      snacks: [snack("台式香腸", "梅花與後腿約 7:3，切 0.5–0.8 cm 丁或粗絞", "醃一晚、灌腸後風乾半天；小火煎 10–12 分鐘或炭烤", "加高粱酒、糖、五香粉，醃料是靈魂。")],
    },
    picnic: {
      retail: ["前腿肉", "豬絞肉", "前腿肉丁"],
      wholesale: ["胛心", "前腿瘦肉", "前腿"],
      snacks: [
        snack("滷肉飯", "前腿加少許五花，切 0.5 cm 小丁（或粗絞）", "先炒香油蔥，再與醬油、冰糖小火滷 1–1.5 小時"),
        snack("胡椒餅", "前腿或梅花切 1 cm 丁", "醃黑胡椒、醬油 30 分鐘，包入麵皮加大量蔥花，貼爐烤 15–20 分鐘"),
        snack("肉圓內餡", "切 1.5 cm 塊", "醃五香、醬油後包進地瓜粉皮，蒸 20 分鐘（彰化肉圓再低溫油泡）"),
      ],
    },
    loin: {
      retail: ["里肌肉排", "豬排", "大里肌火鍋片", "里肌肉絲"],
      wholesale: ["大排（帶骨大里肌）", "里肌", "腰脊"],
      snacks: [snack("排骨便當（炸排骨）", "帶骨大里肌 1–1.5 cm 片，拍鬆斷筋", "醃蒜頭醬油 2 小時，沾地瓜粉 170°C 炸 3–4 分鐘")],
    },
    tenderloin: { retail: ["豬腰內肉", "小里肌"], wholesale: ["腰內", "腰內肉"] },
    ribs: {
      retail: ["豬小排", "腩排", "軟骨排", "排骨"],
      wholesale: ["小排", "腩排", "一字排（肋排中段，骨形較直）", "軟骨排"],
      snacks: [snack("排骨酥湯", "小排剁 3 cm 塊", "醃五香醬油、裹地瓜粉炸到金黃，再與白蘿蔔蒸或煮湯 40 分鐘")],
    },
    belly: {
      retail: ["五花肉片", "五花肉塊", "帶皮五花", "五花火鍋片"],
      wholesale: ["三層肉", "腹脇肉", "五花"],
      snacks: [
        snack("割包（刈包）", "整塊帶皮五花滷好，切 1 cm 厚片", "滷 1–1.5 小時", "夾酸菜、花生糖粉、香菜。"),
        snack("燒肉粽", "切 3–4 cm 塊", "先滷 40 分鐘，與油飯一起包粽，蒸或水煮 1.5–2 小時"),
        snack("控肉飯", "帶皮切 1.5 cm 厚長片", "醬油、冰糖、米酒小火滷 1.5 小時至軟糯"),
      ],
    },
    ham: {
      retail: ["後腿肉絲", "豬肉片", "瘦肉片"],
      wholesale: ["後腿", "內腿", "外腿", "老鼠肉（後腿內側一小塊）"],
      snacks: [snack("肉羹", "切 1 cm 寬條", "醃醬油、蒜、糖後裹魚漿，滾水燙熟成肉羹，再加入羹湯")],
    },
    hock: { retail: ["蹄膀", "豬腳（腿庫段）"], wholesale: ["腿庫", "蹄膀"], snacks: [snack("腿庫飯", "整塊滷好，切 1.5 cm 厚片", "滷 1.5–2 小時，泡在滷汁中保溫")] },
    trotter: { retail: ["豬腳"], wholesale: ["前腳", "後腳", "豬蹄"], snacks: [snack("豬腳麵線", "剁 4–5 cm 段", "滷 1.5–2 小時，配麻油麵線")] },
    tail: { retail: ["豬尾"], wholesale: ["尾巴"] },
    intestine: {
      retail: ["清洗大腸"],
      wholesale: ["大腸頭", "肥腸"],
      snacks: [
        snack("大腸麵線", "滷好切 1 cm 段", "大腸先滷 60 分鐘，加入勾芡紅麵線，淋烏醋、撒香菜"),
        snack("大腸包小腸", "大腸滷後整段（約 15 cm）", "糯米腸烤熱剖開，夾入烤香腸、酸菜、蒜片"),
      ],
    },
    blood: { retail: ["豬血", "米血糕"], wholesale: ["豬血"], snacks: [snack("豬血糕", "米血切 3×6 cm 長方塊插竹籤", "蒸熱或水煮 5 分鐘，刷醬油膏、裹花生粉與香菜")] },
    liver: { retail: ["豬肝"], wholesale: ["粉肝", "豬肝"], snacks: [snack("豬肝湯", "切 0.5 cm 片，抓太白粉", "薑絲高湯滾後下豬肝 30 秒、關火泡熟")] },
  },
  beef: {
    neck: { retail: ["牛頸肉"], wholesale: ["Neck", "頸肉"] },
    chucktender: {
      retail: ["嫩肩火鍋片", "嫩肩肉片"],
      wholesale: ["Chuck Tender", "Mock Tender", "嫩肩"],
      snacks: [snack("台南牛肉湯", "溫體牛嫩肩（或腰內），逆紋切 0.2 cm 薄片", "生肉片放碗中，直接沖入滾燙牛骨湯燙熟", "肉要當天現宰才鮮甜，配薑絲與醬油膏。")],
    },
    topblade: { retail: ["板腱牛排", "翼板牛排", "翼板燒肉片"], wholesale: ["Top Blade", "Flat Iron（去筋後的牛排）", "翼板"] },
    chuckeye: { retail: ["肩里肌牛排", "嫩肩里肌牛排", "霜降牛肉片"], wholesale: ["Chuck Eye Roll", "Chuck Roll（肩胛肉捲）", "肩胛里肌"] },
    ribeye: { retail: ["肋眼牛排", "沙朗牛排（部分賣場）", "霜降火鍋片"], wholesale: ["Ribeye Roll", "Rib", "肋眼心"] },
    striploin: { retail: ["紐約客牛排", "沙朗"], wholesale: ["Striploin", "Short Loin", "外脊"] },
    tenderloin: { retail: ["菲力牛排", "腓力"], wholesale: ["Tenderloin", "腰內", "菲力"] },
    topsirloin: { retail: ["上後腰牛排", "沙朗牛排（部分賣場）"], wholesale: ["Top Sirloin", "Top Sirloin Butt", "上後腰脊"] },
    bottomsirloin: { retail: ["三角肉", "牛臀肉"], wholesale: ["Bottom Sirloin", "Tri-tip"] },
    round: { retail: ["牛後腿肉", "牛肉絲", "和尚頭火鍋片"], wholesale: ["Round", "Knuckle（和尚頭）", "Top Round", "Outside Round"] },
    shortrib: { retail: ["無骨牛小排", "帶骨牛小排", "牛小排火鍋片"], wholesale: ["Chuck Short Rib（無骨牛小排常見來源）", "Short Rib", "Boneless Short Rib"] },
    brisket: { retail: ["牛胸肉"], wholesale: ["Brisket", "Point / Flat（胸肉兩部分）"] },
    plate: { retail: ["牛五花火鍋片", "牛五花肉片", "牛丼肉片"], wholesale: ["Short Plate", "Navel"] },
    flank: {
      retail: ["牛腩", "牛腹肉"],
      wholesale: ["Flank", "Flank Steak", "腹脇"],
      snacks: [snack("紅燒牛肉麵", "切 4 cm 塊", "汆燙後與豆瓣醬、番茄、八角小火燉 2–3 小時")],
    },
    shank: {
      retail: ["牛腱", "腱子心", "金錢腱"],
      wholesale: ["Shank", "Heel Muscle（腱子心）"],
      snacks: [snack("牛肉捲餅", "滷牛腱放涼後逆紋切 0.2 cm 薄片", "牛腱滷 1.5–2 小時；蔥油餅煎香，抹甜麵醬、捲牛肉片與小黃瓜、蔥絲")],
    },
    oxtail: { retail: ["牛尾"], wholesale: ["Oxtail"] },
    tendon: { retail: ["牛筋"], wholesale: ["Tendon"] },
    tripe: {
      retail: ["毛肚", "牛百葉", "蜂巢肚"],
      wholesale: ["Omasum（百葉）", "Honeycomb Tripe（蜂巢肚）"],
      snacks: [snack("牛雜湯", "牛肚、牛筋滷熟後切 1 cm 條", "與牛骨湯、白蘿蔔煮 30 分鐘，撒蔥花芹菜")],
    },
  },
  chicken: {
    head: { retail: ["雞頭"], wholesale: ["雞頭"] },
    neck: { retail: ["雞脖子"], wholesale: ["雞頸"] },
    breast: {
      retail: ["清胸肉", "雞胸肉片", "舒肥雞胸"],
      wholesale: ["清肉", "胸肉", "雞清胸"],
      snacks: [
        snack("台式炸雞排", "雞胸蝴蝶刀片開成約 1 cm 厚大片", "醃蒜頭醬油五香 2 小時，裹粗地瓜粉反潮後 170°C 炸 4–5 分鐘", "起鍋撒胡椒鹽、辣椒粉。"),
        snack("雞肉飯（嘉義）", "整塊水煮後手撕成絲", "水滾放入關火泡 15 分鐘", "淋雞油與油蔥醬汁，配醃黃蘿蔔。"),
      ],
    },
    tender: { retail: ["雞柳條", "里肌肉"], wholesale: ["里肌", "雞柳"] },
    drumette: { retail: ["翅小腿", "雞翅腿"], wholesale: ["翅腿", "翅根"] },
    wingtip: { retail: ["翅尖"], wholesale: ["翅尖"] },
    wingflat: {
      retail: ["二節翅", "雞中翅", "三節翅（含翅尖）"],
      wholesale: ["二節翅", "中翅", "三節翅"],
      snacks: [snack("雞翅包飯", "二節翅＋翅小腿整隻，抽出骨頭", "塞入炒飯或油飯，用牙籤封口，170°C 炸 6–8 分鐘")],
    },
    thigh: {
      retail: ["去骨雞腿排", "雞腿肉丁", "雞腿塊"],
      wholesale: ["清腿（去骨腿肉）", "骨腿（帶骨腿）", "全腿", "上腿"],
      snacks: [snack("鹽酥雞", "去骨腿肉切 3 cm 塊", "醃蒜泥、醬油、五香粉 1 小時，裹地瓜粉 170°C 炸 4–5 分鐘", "起鍋前丟入九層塔一起炸，撒胡椒鹽。")],
    },
    drumstick: { retail: ["棒棒腿", "雞小腿", "大雞腿（全腿）"], wholesale: ["棒腿", "下腿"] },
    back: { retail: ["雞骨架", "雞骨"], wholesale: ["雞架", "骨架"] },
    tail: { retail: ["雞屁股"], wholesale: ["尾椎", "七里香"], snacks: [snack("烤七里香", "去尾脂腺後整顆串成串", "先刷醬油膏烤 8–10 分鐘，刷醬再烤 1 分鐘")] },
    feet: { retail: ["雞腳"], wholesale: ["雞爪", "鳳爪"], snacks: [snack("滷雞腳", "剪去趾甲整隻", "汆燙後滷 30–40 分鐘，泡滷汁一晚更入味")] },
    gizzard: { retail: ["雞胗"], wholesale: ["雞肫"], snacks: [snack("鹽酥雞胗", "切 1 cm 片", "醃後裹地瓜粉 170°C 炸 2 分鐘")] },
    heart: { retail: ["雞心"], wholesale: ["雞心"] },
  },
  duck: {
    head: {
      retail: ["鴨頭", "鴨舌"],
      wholesale: ["鴨頭"],
      snacks: [snack("東山鴨頭", "鴨頭整顆對切", "中藥滷汁小火滷 40–60 分鐘，瀝乾放涼；160–170°C 回炸 2–3 分鐘到外皮酥脆", "先滷後炸是東山鴨頭的特色，起鍋撒胡椒鹽。")],
    },
    neck: {
      retail: ["鴨脖"],
      wholesale: ["鴨頸"],
      snacks: [snack("東山鴨頭", "鴨頭、鴨脖（切 8–10 cm 段）", "中藥滷汁小火滷 40–60 分鐘，瀝乾放涼；160–170°C 回炸 2–3 分鐘到外皮酥脆", "先滷後炸是東山鴨頭的特色，起鍋撒胡椒鹽，也常一起炸豆干、米血。")],
    },
    breast: {
      retail: ["櫻桃鴨胸", "鴨胸肉"],
      wholesale: ["鴨胸", "清胸"],
      snacks: [
        snack("鴨肉飯（嘉義）", "整隻鴨煮熟後，鴨肉切 0.5 cm 片或手撕", "鴨肉鋪在白飯上，淋鴨肉滷汁、鴨油"),
        snack("鴨賞（宜蘭）", "整隻鴨醃鹽、煙燻後切薄片", "可直接吃，或與蒜苗、辣椒快炒 1 分鐘"),
        snack("鹹水鴨", "整隻鴨抹鹽醃一晚", "小火浸煮 40–50 分鐘，放涼切塊"),
      ],
    },
    wing: { retail: ["鴨翅"], wholesale: ["鴨翅"], snacks: [snack("東山鴨頭（鴨翅）", "整隻", "與鴨頭一起先滷 40 分鐘，再回炸 2–3 分鐘")] },
    thigh: { retail: ["鴨腿", "番鴨腿"], wholesale: ["鴨腿", "骨腿"] },
    back: { retail: ["鴨架", "鴨骨"], wholesale: ["鴨架"] },
    feet: { retail: ["鴨掌", "鴨腳"], wholesale: ["鴨掌"], snacks: [snack("東山鴨頭（鴨掌）", "整隻", "滷 40 分鐘後回炸 2 分鐘")] },
    blood: { retail: ["鴨血"], wholesale: ["鴨血"] },
    intestine: { retail: ["鴨腸"], wholesale: ["鴨腸"] },
  },
  goose: {
    head: { retail: ["鵝頭", "鵝舌"], wholesale: ["鵝頭"] },
    neck: { retail: ["鵝脖"], wholesale: ["鵝頸"] },
    breast: {
      retail: ["鵝肉（胸）", "煙燻鵝肉"],
      wholesale: ["鵝胸"],
      snacks: [snack("鵝肉切盤", "整隻浸煮或煙燻後，帶骨切 0.8–1 cm 片", "依大小浸煮 50–70 分鐘，冰鎮後切盤", "沾薑絲醬油膏，是鵝肉攤的招牌。")],
    },
    wing: { retail: ["鵝翅"], wholesale: ["鵝翅"] },
    thigh: { retail: ["鵝腿"], wholesale: ["鵝腿"] },
    back: { retail: ["鵝架"], wholesale: ["鵝骨", "鵝架"], snacks: [snack("鵝肉米粉湯", "鵝骨剁大塊熬湯", "熬 2–3 小時，加米粉、鵝肉片、韭菜")] },
    feet: { retail: ["鵝掌"], wholesale: ["鵝掌"] },
    intestine: { retail: ["鵝腸"], wholesale: ["鵝腸"] },
    liver: { retail: ["鵝肝"], wholesale: ["鵝肝"] },
    fat: { retail: ["鵝油蔥"], wholesale: ["鵝油"], snacks: [snack("鵝油拌麵", "麵條煮熟瀝乾", "拌鵝油蔥、醬油膏、少許高湯")] },
  },
  lamb: {
    neck: { retail: ["羊頸肉"], wholesale: ["Neck"] },
    shoulder: {
      retail: ["羊肩肉", "羊肩排", "帶皮羊肉（爐用）"],
      wholesale: ["Shoulder", "Square Cut Shoulder"],
      snacks: [snack("岡山羊肉爐", "帶皮山羊肉剁 3–4 cm 塊", "麻油爆老薑，加米酒、中藥包小火燉 1.5–2 小時", "沾豆瓣醬，最後加高麗菜、凍豆腐。")],
    },
    rack: { retail: ["法式羊排", "羊小排", "羊肋排"], wholesale: ["Rack", "Frenched Rack（法式修清）"] },
    loin: {
      retail: ["羊里肌", "羊肉片（火鍋）"],
      wholesale: ["Loin", "Backstrap（去骨里肌）"],
      snacks: [snack("沙茶羊肉炒麵", "逆紋切 0.2 cm 薄片", "大火爆炒 30–60 秒加沙茶醬、空心菜，再拌入油麵")],
    },
    breast: { retail: ["羊胸", "帶骨羊肉（爐用）"], wholesale: ["Breast"] },
    belly: { retail: ["羊腩", "羊五花"], wholesale: ["Flap", "Flank"] },
    rump: { retail: ["羊臀肉", "羊臀排"], wholesale: ["Rump", "Chump"] },
    leg: { retail: ["去骨羊腿", "羊腿肉丁"], wholesale: ["Leg", "Boneless Leg"] },
    shank: { retail: ["羊小腿", "羊腱"], wholesale: ["Shank"] },
  },
};
