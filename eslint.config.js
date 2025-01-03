import js from '@eslint/js'
import wordpressPlugin from '@wordpress/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import importSortPlugin from 'eslint-plugin-simple-import-sort'
import globals from 'globals'

export default [
	js.configs.recommended,

	{
		...reactPlugin.configs.flat.recommended,

		ignores: ['dist'],
		files: ['src/scripts/**/*.{js,jsx,ts,tsx}', '*.mjs', '*.cjs'],
		settings: { react: { version: 'detect' } },
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2021,
				process: true,
				wp: true,
				jQuery: true,
				Zubug: true,
			},

			ecmaVersion: 2021,
			sourceType: 'module',

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			react: reactPlugin,
			'simple-import-sort': importSortPlugin,
			'react-hooks': reactHooksPlugin,
			'@wordpress': wordpressPlugin,
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...wordpressPlugin.configs.rules,
			...reactHooksPlugin.configs.recommended.rules,

			// general
			semi: ['warn', 'never'],
			'no-console': 'warn',
			'object-shorthand': 'warn',
			'no-useless-catch': 'warn',
			'no-empty-pattern': 'warn',
			'no-unneeded-ternary': 'warn',
			'no-nested-ternary': 'off',
			'object-curly-spacing': ['warn', 'always'],
			indent: 'off',
			'no-multi-spaces': 'warn',
			'eol-last': ['warn', 'always'],
			'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 0, maxBOF: 0 }],
			'comma-spacing': 'warn',
			'spaced-comment': ['warn', 'always', { markers: ['/'] }],
			'no-duplicate-imports': 'warn',
			'no-trailing-spaces': 'warn',
			'no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'no-use-before-define': 'error',
			// react
			...reactPlugin.configs['jsx-runtime'].rules,
			'jsx-quotes': ['warn', 'prefer-double'],
			'react/jsx-equals-spacing': ['warn', 'never'],
			'react/jsx-no-literals': 'off',
			'react/jsx-fragments': ['warn'],
			'react/jsx-no-target-blank': 'warn',
			'react/jsx-first-prop-new-line': ['warn', 'multiline'],
			'react/jsx-closing-bracket-location': ['warn', 'tag-aligned'],
			'react/no-unused-prop-types': 'warn',
			'react/self-closing-comp': 'warn',
			'react/prop-types': 'off',
			// wordpress
			'@wordpress/no-unused-vars-before-return': 'off',
			// imports
			'simple-import-sort/imports': [
				'warn',
				{
					groups: [
						['^\\u0000'],
						['^lodash-es', '^react', '^@?\\w'],
						['^components', '^data', '^hooks', '^plugins'],
						['^\\.'],
					],
				},
			],
		},
	},
]
