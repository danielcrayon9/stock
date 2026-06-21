import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Home,
  LineChart,
  Radar,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/dashboard", label: "대시보드", icon: BarChart3 },
  { href: "/scanner", label: "시장 스캐너", icon: Radar },
  { href: "/intraday-scanner", label: "장중 스캐너", icon: ShieldCheck },
  { href: "/recommendations", label: "추천 종목", icon: Sparkles },
  { href: "/recommendations/intraday", label: "장중 추천", icon: Sparkles },
  { href: "/analyze", label: "종목 분석", icon: LineChart },
  { href: "/watchlist", label: "관심종목", icon: Star },
  { href: "/portfolio", label: "보유종목", icon: BriefcaseBusiness },
  { href: "/alerts", label: "알림센터", icon: Bell },
  { href: "/settings", label: "설정", icon: Settings },
];
