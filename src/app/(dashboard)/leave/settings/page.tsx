"use client";

import { useState } from "react";

type GeneralSettings = {
  fiscalYearStartMonth: string;
  displayBalanceIn: "Days" | "Hours";
  allowNegativeBalance: boolean;
  requireAttachmentForSickLeaveDays: number;
  sendEmailNotifications: boolean;
  allowSelfApprovalForAdmins: boolean;
};

export default function LeaveSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>({
    fiscalYearStartMonth: "January",
    displayBalanceIn: "Days",
    allowNegativeBalance: false,
    requireAttachmentForSickLeaveDays: 2,
    sendEmailNotifications: true,
    allowSelfApprovalForAdmins: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
          <p className="text-muted-foreground">
            Configure global settings for the Leave module.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fiscal Year & Display */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Display & Calendar</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fiscal Year Start</label>
            <select
              value={settings.fiscalYearStartMonth}
              onChange={(e) => setSettings({ ...settings, fiscalYearStartMonth: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Determines when the leave accrual cycle resets.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Display Leave Balance In</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="balanceDisplay"
                  value="Days"
                  checked={settings.displayBalanceIn === "Days"}
                  onChange={() => setSettings({ ...settings, displayBalanceIn: "Days" })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Days</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="balanceDisplay"
                  value="Hours"
                  checked={settings.displayBalanceIn === "Hours"}
                  onChange={() => setSettings({ ...settings, displayBalanceIn: "Hours" })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hours</span>
              </label>
            </div>
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Policies & Restrictions</h2>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Negative Balance</label>
              <p className="text-xs text-gray-500">Employees can request leave even if balance is insufficient.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowNegativeBalance}
              onChange={(e) => setSettings({ ...settings, allowNegativeBalance: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="space-y-2 pt-2">
             <label className="text-sm font-medium text-gray-700">Require Attachment for Sick Leave exceeding (days)</label>
             <input
                type="number"
                min="0"
                value={settings.requireAttachmentForSickLeaveDays}
                onChange={(e) => setSettings({ ...settings, requireAttachmentForSickLeaveDays: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
             <p className="text-xs text-gray-500">Set to 0 to always require attachment.</p>
          </div>

           <div className="flex items-center justify-between pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Admin Self-Approval</label>
              <p className="text-xs text-gray-500">Allow Global Admins to approve their own requests.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowSelfApprovalForAdmins}
              onChange={(e) => setSettings({ ...settings, allowSelfApprovalForAdmins: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold border-b pb-2">Notifications</h2>
          
           <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-xs text-gray-500">Send email alerts for requests, approvals, and rejections.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.sendEmailNotifications}
              onChange={(e) => setSettings({ ...settings, sendEmailNotifications: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
