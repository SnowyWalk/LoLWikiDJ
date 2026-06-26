import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "public/static/**",
      "static/**",
      "*.js"
    ],
  },
];

export default eslintConfig;
