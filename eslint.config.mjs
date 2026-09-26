import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated or third-party: build output, local Wrangler state, and PDF.js copied in at build time.
    "dist/**",
    ".wrangler/**",
    "public/pdfjs/**",
  ]),
  {
    // vinext's client-side <Link> fails in production builds ("e is not a function"), so the site uses plain
    // links and full page loads, which Next's lint rule would otherwise flag.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      // Images here are teachers' logos and uploaded work served from R2 at their own size; the Worker has no
      // image optimizer for <Image> to use.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
