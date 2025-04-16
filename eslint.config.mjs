import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      'react/no-unknown-property': [
        'error',
        {
          ignore: ['intensity', 'position', 'castShadow'], // Add other react-three-fiber properties as needed
        },
      ],
    },
    rules: {
      
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-assertions": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/naming-convention": [
        "error",
        { 
          "selector": "property",
          "format": ["camelCase", "PascalCase"],
          "filter": {
            "regex": "^(.*[- ].*|\\*)$",
            "match": false
          }
        }
      ],
      "react/no-unknown-property": ["error", { "ignore": ["css", "tw"] }],
      "react/prop-types": "off"
    }
  }
];

export default eslintConfig;
