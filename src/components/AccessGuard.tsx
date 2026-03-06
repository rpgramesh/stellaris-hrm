"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { employeeService } from "@/services/employeeService";
import { roleBasedAccessService } from "@/services/roleBasedAccessService";
import Sidebar, { menuItems } from "@/components/Sidebar";

const toMenuKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

const fallbackAllowed = (role: string, itemName: string): boolean => {
  if (role === "Super Admin" || role === "Administrator") {
    return true;
  }
  if (role === "Employee") {
    return ["Dashboard", "Self Service (ESS)"].includes(itemName);
  }
  if (role === "Manager") {
    return ["Dashboard", "Team", "Leave"].includes(itemName);
  }
  if (["HR Admin", "HR Manager"].includes(role)) {
    return itemName !== "Settings" && itemName !== "Self Service (ESS)";
  }
  return itemName !== "Self Service (ESS)";
};

const getAllowedHrefs = (role: string, perms: string[] | null) => {
  const hasMenuConfig = perms && perms.some((p) => typeof p === "string" && p.startsWith("menu:"));
  if (!hasMenuConfig) {
    return menuItems.filter((m) => fallbackAllowed(role, m.name)).flatMap((m) => {
      const hrefs = [m.href];
      if (m.subItems) hrefs.push(...m.subItems.filter((s: any) => s.href).map((s: any) => s.href));
      return hrefs;
    });
  }
  const allowedKeys = new Set(perms!.filter((p) => p.startsWith("menu:")).map((p) => p.replace("menu:", "")));
  const allowed = menuItems.filter((m) => allowedKeys.has(toMenuKey(m.name)));
  return allowed.flatMap((m) => {
    const hrefs = [m.href];
    if (m.subItems) hrefs.push(...m.subItems.filter((s: any) => s.href).map((s: any) => s.href));
    return hrefs;
  });
};

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[] | null>(null);
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);
        const employee = await employeeService.getByUserId(user.id);
        if (!employee) {
          setAuthorized(false);
          setRole(null);
          return;
        }
        const adminRoles = ["Administrator", "Super Admin", "Employer Admin", "HR Admin", "HR Manager"];
        const resolvedRole = adminRoles.includes(employee.role) ? employee.role : employee.systemAccessRole || employee.role;
        setRole(resolvedRole);
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("permissions")
          .eq("name", resolvedRole)
          .eq("is_active", true)
          .single();
        const permissions: string[] = roleRow?.permissions || [];
        setPerms(permissions);
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const allowedHrefs = useMemo(() => {
    if (!role) return [];
    return getAllowedHrefs(role, perms);
  }, [role, perms]);

  useEffect(() => {
    if (loading || !pathname) return;
    if (!role) {
      setAuthorized(false);
      return;
    }
    const ok = allowedHrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
    setAuthorized(ok);
    if (!ok && userId) {
      roleBasedAccessService
        .logAction(userId, "unauthorized_access", "route", pathname, { role, permissions: perms || [] })
        .catch(() => {});
    }
  }, [loading, pathname, allowedHrefs, role, userId, perms]);

  if (loading) {
    return (
      <div className="p-8 text-gray-500">Loading...</div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
          <p className="text-sm mb-4">You do not have permission to view this page.</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
