"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VENDORS } from "./VendorDot";

const LINKS = [
  { href: "/catalog", label: "Certifications", index: "01" },
  { href: "/account", label: "My progress", index: "02" },
  { href: "/settings", label: "Settings", index: "03" },
];

/** Shared navigation is presentation-only; account and practice state stay in their existing owners. */
export function WorkspaceNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  function active(href: string) {
    if (href === "/catalog") return pathname === href || pathname.startsWith("/guides/") || Object.hasOwn(VENDORS, pathname.split("/")[1]);
    return pathname === href || pathname.startsWith(href + "/");
  }
  const links = LINKS.map(link => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} onClick={() => setOpen(false)}><span aria-hidden="true">{link.index}</span>{link.label}<span className="workspace-nav-arrow" aria-hidden="true">{String.fromCharCode(8599)}</span></Link>);
  const brand = <><span className="workspace-mark" aria-hidden="true">CR</span><span>certreps</span></>;
  return <>
    <aside className="workspace-rail">
      <Link href="/" aria-label="CertReps home" className="workspace-brand">{brand}</Link>
      <p className="workspace-edition">CERTIFICATION<br />PRACTICE SYSTEM</p>
      <nav aria-label="Workspace navigation">{links}</nav>
      <div className="workspace-rail-foot"><span aria-hidden="true" /> ORIGINAL QUESTIONS<br />INDEPENDENT STUDY RESOURCE</div>
    </aside>
    <header className="workspace-mobile" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } }}>
      <Link href="/" aria-label="CertReps home" className="workspace-brand">{brand}</Link>
      <button ref={toggleRef} type="button" className="workspace-menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="workspace-mobile-menu" onClick={() => setOpen(o => !o)}>Menu <span aria-hidden="true">{open ? "-" : "+"}</span></button>
      <nav id="workspace-mobile-menu" aria-label="Mobile workspace navigation" hidden={!open}>{links}</nav>
    </header>
  </>;
}
