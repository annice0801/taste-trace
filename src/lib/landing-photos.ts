import type { Photo } from "./categories";

// 首頁使用的料理照片：皆來自 Wikimedia Commons 的自由授權照片，存放在 public/landing
export const LANDING_PHOTOS = {
  bread: {
    src: "/landing/bread.jpg",
    author: "Tomascastelazo",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Home_made_sour_dough_bread.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "50% 50%",
  },
  ramen: {
    src: "/landing/ramen.jpg",
    author: "0Zephiron0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Free-photo-of-a-bowl-of-ramen-with-eggs-and-meat.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "50% 50%",
  },
  asparagusSoup: {
    src: "/landing/asparagus-soup.jpg",
    author: "Petar Milošević",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Asparagus_soup_(spargelsuppe).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "50% 50%",
  },
  chocolateCake: {
    src: "/landing/chocolate-cake.jpg",
    author: "Daria Yakovleva",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Piece_of_chocolate_cake_on_a_white_plate_decorated_with_chocolate_sauce.jpg",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    position: "50% 50%",
  },
  beetroots: {
    src: "/landing/beetroots.jpg",
    author: "W.carter",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Beetroots_in_a_basket.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "50% 50%",
  },
  appleCake: {
    src: "/landing/apple-cake.jpg",
    author: "W.carter",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Apple_cake_with_vanilla_ice_cream_2.jpg",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    position: "50% 50%",
  },
} satisfies Record<string, Photo>;
