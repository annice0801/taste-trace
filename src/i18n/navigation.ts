import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// 會自動帶上目前語系前綴的 Link、useRouter、usePathname
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
