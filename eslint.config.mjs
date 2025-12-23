import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: ["**/node_modules/**", ".next/**", ".next.bak*/**", "dist/**", "out/**"],
  },
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
