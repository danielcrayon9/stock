"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlertLog, AlertSetting, AlertType } from "@/lib/types";

type AlertCenterProps = {
  initialSettings: AlertSetting[];
  initialLogs: AlertLog[];
  initialMessage?: string;
};

const ALERT_OPTIONS: Array<{ value: AlertType; label: string }> = [
  { value: "target_profit", label: "보유종목 목표수익률 도달" },
  { value: "stop_loss", label: "손절가 접근/도달" },
  { value: "watchlist_buy_price", label: "관심종목 매수가 도달" },
  { value: "trading_value_surge", label: "거래대금 급증" },
  { value: "negative_disclosure", label: "악재 공시 발생" },
  { value: "price_drop", label: "급락" },
];

const emptyForm = {
  id: "",
  type: "target_profit" as AlertType,
  enabled: true,
  stockCode: "",
  stockName: "",
  condition: "",
  targetValue: "",
};

function isEnabled(value: unknown) {
  return value === true || value === "TRUE" || value === "true";
}

export default function AlertCenter({ initialSettings, initialLogs, initialMessage = "" }: AlertCenterProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [logs] = useState(initialLogs);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [settingsResponse, checkResponse] = await Promise.all([
      fetch("/api/alerts", { cache: "no-store" }),
      fetch("/api/alerts/check?force=true", { cache: "no-store" }),
    ]);
    const settingsResult = await settingsResponse.json();
    const checkResult = await checkResponse.json();
    if (settingsResult.ok) setSettings(settingsResult.data);
    setMessage(checkResult.ok ? "알림 조건을 수동 점검했습니다." : "알림 점검에 실패했습니다.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const isEdit = Boolean(form.id);
      const response = await fetch("/api/alerts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setForm(emptyForm);
      setMessage(isEdit ? "알림 설정을 수정했습니다." : "알림 설정을 추가했습니다.");
      const settingsResponse = await fetch("/api/alerts", { cache: "no-store" });
      const settingsResult = await settingsResponse.json();
      if (settingsResult.ok) setSettings(settingsResult.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 설정 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 알림 설정을 삭제할까요?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setSettings((prev) => prev.filter((item) => item.id !== id));
      setMessage("알림 설정을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/alerts?test=true", { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error ?? result.data?.error);
      setMessage("Telegram 테스트 알림을 발송했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Telegram 테스트 알림 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>Telegram으로 받을 알림 조건을 켜고 끌 수 있습니다.</CardDescription>
        </CardHeader>
        <form className="grid gap-3 md:grid-cols-6" onSubmit={handleSubmit}>
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as AlertType }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          >
            {ALERT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={form.stockCode}
            onChange={(event) => setForm((prev) => ({ ...prev, stockCode: event.target.value }))}
            placeholder="종목코드(선택)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.stockName}
            onChange={(event) => setForm((prev) => ({ ...prev, stockName: event.target.value }))}
            placeholder="종목명(선택)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            사용
          </label>
          <Button type="submit" disabled={loading}>
            저장
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleTest} disabled={loading}>
            테스트 알림 발송
          </Button>
          <Button type="button" variant="secondary" onClick={loadData} disabled={loading}>
            알림 조건 수동 점검
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>설정 목록</CardTitle>
          <CardDescription>종목코드를 비워두면 알림 유형 전체 설정으로 사용할 수 있습니다.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">종목</th>
                <th className="px-3 py-2">채널</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{isEnabled(setting.enabled) ? "ON" : "OFF"}</td>
                  <td className="px-3 py-2">{setting.type}</td>
                  <td className="px-3 py-2">
                    {setting.stockName || "전체"} {setting.stockCode ? `(${setting.stockCode})` : ""}
                  </td>
                  <td className="px-3 py-2">{setting.channel}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: setting.id,
                          type: setting.type,
                          enabled: isEnabled(setting.enabled),
                          stockCode: setting.stockCode,
                          stockName: setting.stockName,
                          condition: setting.condition,
                          targetValue: String(setting.targetValue ?? ""),
                        })
                      }
                      className="mr-2 font-semibold text-slate-700"
                    >
                      수정
                    </button>
                    <button type="button" onClick={() => handleDelete(setting.id)} className="font-semibold text-red-600">
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {settings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    저장된 알림 설정이 없습니다. 기본 알림 조건은 알림 체크 시 평가됩니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>알림 로그</CardTitle>
          <CardDescription>오늘 발송된 알림은 같은 종목/조건 기준으로 중복 발송을 막습니다.</CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          {logs.slice(0, 30).map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-100 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-950">
                  {log.stockName} ({log.stockCode})
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {log.alertType}
                </span>
              </div>
              <p className="mt-2 text-slate-600">{log.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                {log.channel} · {log.sentAt}
              </p>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-slate-500">아직 알림 로그가 없습니다.</p> : null}
        </div>
      </Card>
    </div>
  );
}
