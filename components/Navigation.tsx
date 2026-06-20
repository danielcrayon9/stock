import Link from "next/link";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Home,
  LineChart,
  Radar,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/dashboard", label: "대시보드", icon: BarChart3 },
  { href: "/scanner", label: "시장 스캐너", icon: Radar },
  { href: "/recommendations", label: "추천 종목", icon: Sparkles },
  { href: "/analyze", label: "종목 분석", icon: LineChart },
  { href: "/watchlist", label: "관심종목", icon: Star },
  { href: "/portfolio", label: "보유종목", icon: BriefcaseBusiness },
  { href: "/alerts", label: "알림센터", icon: Bell },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function Navigation() {
  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
