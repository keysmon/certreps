import type { CSSProperties } from "react";

/** Vendor color system - the heart of at-a-glance catalog scanning. Keyed by a
 *  lowercase slug; `c` resolves to the --v-* token in globals.css. The full map
 *  ships now (only AWS has live content) so future certs get their accent for free. */
export const VENDORS: Record<string, { n: string; c: string }> = {
  aws: { n: "AWS", c: "var(--v-aws)" },
  azure: { n: "Azure", c: "var(--v-azure)" },
  ms: { n: "Microsoft", c: "var(--v-ms)" },
  gcp: { n: "Google Cloud", c: "var(--v-gcp)" },
  comptia: { n: "CompTIA", c: "var(--v-comptia)" },
  k8s: { n: "Kubernetes", c: "var(--v-k8s)" },
  hashi: { n: "HashiCorp", c: "var(--v-hashi)" },
  cisco: { n: "Cisco", c: "var(--v-cisco)" },
  databricks: { n: "Databricks", c: "var(--v-databricks)" },
  nvidia: { n: "NVIDIA", c: "var(--v-nvidia)" },
};

export interface VendorDotProps {
  color?: string;
  size?: number;
  style?: CSSProperties;
}

export function VendorDot({ color = "var(--gold)", size = 9, style = {} }: VendorDotProps) {
  return (
    <span
      style={{
        width: size + "px",
        height: size + "px",
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
