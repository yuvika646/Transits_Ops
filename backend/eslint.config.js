import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'drizzle/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  prettier,
);
