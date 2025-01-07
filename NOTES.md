#### Создать из SCSS vars файл с цветами

__with regex__
find:^\$([^:]+).+
replace:.js_$1 { color: $ $1; }

__without regex__
find:-
replace:_

__with regex__
find:\$\s+
replace:$

#### конвертировать const { x } = wp.* в import from '@wordpress

find:const[^{]*([^}]*\})\s*=\s*wp\.([^\s]*)
replace:import $1 from '@wordpress/$2'
