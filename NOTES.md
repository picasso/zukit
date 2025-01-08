# Заметки для работы с проектом

## Организация файлов

Каждый проект имеет в себе `zukit`. Про инсталяцию и обновление `zukit` смотреть тут - [to install the framework](https://github.com/picasso/zukit/wiki/%5BMisc%5D-Install).

Раньше проект собирался через CodeKit и я работал в Atom.
Сейчас перешел на VSCode. Столкнулся, что у CodeKit как-то много ограничений, да и опыта я накопил - потому решил перейти на простые скрипты и `npm`. JS код проверяется через ESLint и конфигурация лежит в `eslint.config.js`.
__ESLint__ версии 9 сильно изменил формат конфига - некоторые плагины не поддерживают его и из-за этого много warnings при обновление `package`.
Форматирование JS делается с помощью __Prettier__ - его конфиг в `prettier.config.cjs`. Линтинг и форматирование PHP происходит с помощью __PHP Intelephense__.
Мне не всё нравится в нем - хочу попробовать [PHP CS Fixer](https://github.com/junstyle/vscode-php-cs-fixer).

Сборка происходит при помощи `wp-scripts` ([см тут](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#advanced-usage)). На самом деле внутри там используется `webpack` и потому все настройки идут [оттуда](https://webpack.js.org/configuration/entry-context/). Для работы созданы конфиги `wp-scripts.config.cjs` и `wp-dev.config.cjs`. Для `dev` работает перекомпиляция при обновлении файлов. Для refresh браузера пытался использовать `devServer` от webpack, но не получилось настроить его вместе __Local__. У Вордпресса есть своё решение для локальной работы (`wp-env`), но не такое гибкое как __Local__. Потому остался на __Local__ и подключил [BrowserSync](https://www.npmjs.com/package/browser-sync-webpack-plugin) для авто-reload. Работает, но не сравнить с хот refresh от `devServer`... будем искать.

## Выпуск новой версии

- обновить `CHANGES.md`, `package.json` и `zukit-plugin.php`
- добавить tag c номером версии `git tag 2.0.1`
- запушить tags на __Github__ `git push --tags`
- на __Github__ перейти в релизы и создать новый `draft release`
- выбрать последний `tag` и ввести `release notes`
- publish release

## Разные советы/трюки

### Создать из SCSS vars файл с цветами

*with regex*
`find:`^\$([^:]+).+
`replace:`.js_$1 { color: $ $1; }

*without regex*
`find:`-
`replace:`_

*with regex*
`find:`\$\s+
`replace:`$

### конвертировать const { x } = wp.* в import from '@wordpress

`find:`const[^{]*([^}]*\})\s*=\s*wp\.([^\s]*)
`replace:`import $1 from '@wordpress/$2'
