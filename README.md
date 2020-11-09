# Zukit

_Framework serves as the basis for creating plugins or themes for WordPress._

Implements basic functionality for managing scripts and creating plugin or theme settings page based on Gutenberg functionality.

## Install
To _use_ __Zukit__ in your project, you need to install it as a `subtree` in your project. To simplify this process, I wrote a bash script [`zukit.sh`] that does all the necessary operations. You will need to download the script from the remote repository and then execute it. Before executing the script, you can change it and remove unnecessary (in your opinion) operations:

```shell
# retrieve 'zukit.sh' from the repository
$ curl 'https://raw.githubusercontent.com/picasso/zukit/master/zukit.sh' > zukit.sh

# maybe you have to give the script permission to run
# chmod +x zukit.sh

# execute script
$ sh zukit.sh
```

To update __Zukit__ to the current version, you need to run the `subtree pull` command. You can change the commit message at your discretion:
```shell
# pull updates from Zukit
$ git subtree pull --prefix=zukit zukit master --squash -m 'Zukit updated'
```

See [Git sparse-checkout](https://www.git-scm.com/docs/git-sparse-checkout) and [Git subtree](https://opensource.com/article/20/5/git-submodules-subtrees) for complete docs and examples.

> &#x2757; Памятка. Попробовать потом [иначе](https://docs.github.com/en/free-pro-team@latest/github/using-git/about-git-subtree-merges)

After installation, you can remove `zukit.sh` or add it to your `.gitignore` file.

### Download

The latest version of __Zukit__ can downloaded [on GitHub](https://github.com/picasso/zukit/archive/master.zip)

## Description

The best way to learn a framework is to look at working examples of its use. This can be done in plugins that I have already adapted for the new framework: [Zu Contact](https://github.com/picasso/zu-contact) и [Zu Media](https://github.com/picasso/zumedia). Below I have described the main points of working with the framework. This in no way pretends to be complete documentation, but I think that by looking at the source codes you can understand a lot. While this framework is used only by me, then all these descriptions are just *memos* for myself.

- Create a new class inheriting the class `zukit_Plugin`
```php
class my_Class extends zukit_Plugin {

}
```

> &#x274C; __Attention!__ You should not define a class constructor `__construct` in a new class.

- If you need to do something in the class constructor, you need to override the `construct_more` method.
> &#x1F645; __Attention!__ You cannot use the functions for working with `options` (see the "Options" section) in this method, since the `options` there are not yet synchronized with the class methods:

```php
protected function construct_more() {
    add_action('add_attachment', [$this, 'attachment_save']);
    add_filter('attachment_fields_to_edit', [$this, 'add_attachment_field'], 10, 2);

    // you should avoid ‘options’ getter and setter here!!
    //
    // if($this->is_option('option1')) {
    //     add_action('pre_get_posts', [$this, 'pre_get_attachments']);
    // }
}
```

- Override the `config` method in which to return an array with keys. Almost all keys are optional except for the `prefix` key, which must contain some unique name used in many methods later.

```php
protected function config() {
    return  [
        'prefix'    => 'myplugin',
        // set true if 'Zukit' script & CSS should be loaded
        'zukit'     => true,         
        // default values for plugin options
        'options'   => [
            'option1'   => true,
            'option2'   => false,
            'option3'   => 'somevalue',
        ],
    ];
}
```

#### Options
- methods `options` and `update_options` are used to get __options__ and update them
- the `reset_options` method is used to reset __options__ to default values. On the settings page, a button is automatically created that calls this method via AJAX
- the `set_option` method is used to set the __options__ value for a given key and then update `options` in WordPress. If argument `$key` contains *path* (dots separated keys) then the required key will be found in nested options
- the `is_option` method is used to compare the value by the given key with the second argument of the method. For types `bool`, `int` and` string`, a cast to required value type occurs
```php
if($this->is_option('option1')) {
    add_action('pre_get_posts', [$this, 'pre_get_attachments']);
}

if($this->is_option('option3', 'value3')) {
    add_image_size($name, $width, $height, $crop);
}

// will be set ['more_option' => ['nextkey' => true]]
$this->set_option('more_option.nextkey', true);

```

#### Init
The plugin does not need to add action to the `init` and `admin_init` events - you just need to override the methods with such names and perform the necessary initializations in them. Within these methods, you can safely refer to `options`.
```php
public function init() {
    if($this->is_option('add_category')) {
        register_taxonomy_for_object_type('category', 'attachment');
    }
}

public function admin_init() {
    if(!session_id()) session_start();
}
```

#### Scripts & Styles

- To load JS scripts, you need to override the `should_load_js` method in which to return true if the script should be loaded (if the script is not needed, then overriding the method is not required). The method has two arguments: `$is_frontend` and `$hook`. The script file name will be generated automatically based on the `prefix` (see above). For the script loaded to the front-end it will be the file `js/<prefix>.min.js`, and for the admin pages it will be the file `admin/js/<prefix>.min.js`. If the admin script contains only options page management, then it is better to limit its loading only to this page using the helper method `ends_with_slug` (see example).
```php
// for front-end and admin scripts
protected function should_load_js($is_frontend, $hook) {
    return $is_frontend ? true : $this->ends_with_slug($hook);
}

// for admin script only
protected function should_load_js($is_frontend, $hook) {
    return !$is_frontend && $this->ends_with_slug($hook);
}
```

- To load styles, you need to override the `should_load_css` method. The arguments and logic are the same as with scripts. For styles loaded on the front-end it will be the file `css/<prefix>.css`, and for the admin pages it will be the file `admin/css/<prefix>.css`.

- Все остальные параметры загрузки скрипта можно задать переопределив методы `js_params` для скрипта или `css_params` для стилей. Если массив не содержит ключа или значение ключа равно *null*, то значение по умолчанию будет использовано. По умолчанию an array of dependencies is empty for front-end and `['zukit']` for admin script and styles. Примеры задания параметров для скриптов и стилей:

```php
// redefine dependencies for scripts and 'in-footer' param
protected function js_params($is_frontend) {
    return [
        'deps'	     => $is_frontend ? ['jquery'] : null,
        'bottom'     => $is_frontend ? true : false,
    ];
}

// redefine dependencies for styles and handle
protected function css_params($is_frontend) {
    return [
        'deps'	    => $is_frontend ? [] : ['wp-edit-post', 'wp-editor-font'],
        'handle'    => $is_frontend ? 'my-gallery' : null,
    ];    
}
```

- By default, a JSON object is created for a JS script, accessible from the script by a variable named `<prefix>_jsdata`. You also could rename the variable which will be available in javascript via `jsdata_name` key (see example). For the options page in admin mode, the variable name will be `<prefix>_settings`. And although this can also be renamed, it is highly discouraged in order to keep the default data set necessary for __Zukit__ to work. If additional JS data is required, then you need to override the `js_data` method. Usually changing the default data set is required if you want to display additional AJAX actions on the plugin/theme settings page.
```php
protected function js_data($is_frontend) {
    return  $is_frontend ? [
        'jsdata_name'	=> 'myplugin_data',
        'important_id'  => $very_important_id,
    ] : [
        'actions'   => [
            [
                'label'		=> __('My Action 1', 'myplugin'),
                'value'		=> 'myplugin_action_one',
                'icon'		=> 'update',
                'color'		=> 'green',
                'help'		=> 'Do something special or something else...',
            ],
            [
                'label'		=> __('My Action 2', 'myplugin'),
                'value'		=> 'myplugin_action_two',
                'icon'		=> 'admin-customizer',
                'color'		=> 'gold',
                // the button will be visible only if "option2" is 'true'
                'depends'	=> 'option2',
            ],
        ],
    ];
}
```

- Если требуется загрузить больше, чем один файл для script and styles, то нужно переопределить метод `enqueue_more`. У него тоже два аргумента: `$is_frontend` and `$hook`. Для удобства можно воспользоваться helper методами `sprintf_dir` и `sprintf_uri` которые работают аналогично функции `sprintf`, но добавляют в начало создаваемой строки plugin directory or uri соответственно. Также есть helper методы `enqueue_style` и `enqueue_script` для добавления файлов на front-end страницах и `admin_enqueue_style` и `admin_enqueue_script` для добавления файлов на админ страницах:
```php
protected function enqueue_more($is_frontend, $hook) {
    if($is_frontend) {

        // the styles with path 'css/gallery.css',
        // without dependencies
        // with handle 'gallery'
        // will be added in header
        $this->enqueue_style('gallery');

    } else if(in_array($hook, ['customize.php', 'widgets.php'])) {

        // the script with path 'admin/js/my-colors.min.js',
        // with dependency 'jquery'
        // without wp_localize_script() data (default value),
        // with handle 'my-colors' (default handle)
        // will be added in footer (default value)
        $this->admin_enqueue_script('my-colors', [
            'deps'  => ['jquery'],
        ]);

        // the script with path '/dist/js/more.js',
        // with JS data,
        // with dependency 'lodash' and 'jquery-ui-droppable'
        // with handle 'more-plus'
        // will be added in header
        $filename = 'more';
        $absolute_path = $this->sprintf_dir('/dist/js/%1$s.js', $filename);
        // if we use absolute path then $file should start with '!'
        $this->admin_enqueue_script('!'.$absolute_path, [
            'data'      => ['ajaxurl' => admin_url('admin-ajax.php')],
            'deps'      => ['lodash','jquery-ui-droppable'],
            'handle'    => 'more-plus',
            'bottom'    => false,
        ]);
    }
}
```

- If you __only__ need to __register__ the script so that later it will be enqueued, depending on some conditions (for example, when calling the shortcode on the page), then you need to set the `register_only` key to *true*. And then, when the condition is met, call the `enqueue_only` method. This method has two arguments: `$is_style` and `$handle`. The first one defines what will be enqueue - script or style. If `$handle` is *null* or omitted then it will be generated based on the `prefix`. If call the `enqueue_only` method without arguments, both the script and the style with handles based on `prefix` will be enqueued. Some examples:
```php
protected function enqueue_more($is_frontend, $hook) {
    if($is_frontend) {
        $this->script_handle = $this->enqueue_script('my-gallery', [
            'deps'          => ['jquery'],
            'register_only' => true,    
        ]);
    }
}

public function gallery_shortcode($atts, $content = null) {

    extract(shortcode_atts([
        'columns'       => 3,
        'border'        => 'thin',
    ], $atts));

    // enqueue js script with the stored handle
    $this->enqueue_only(false, $this->script_handle);

    // some shortcode logic here

    return $shortcode_output;
}
```

#### Add-ons

> &#x2757; Description required

#### Ajax

> &#x2757; Description required

#### Admin page and menu

> &#x2757; Description required

#### Snippets

*Snippets* is a collection of various functions that I have accumulated during my work with WordPress. They are combined into one class for ease of use. You can view all available functions in the source codes, which for convenience are grouped in *traits* that are located in the __snippets__ folder. There is a special helper method for using "snippet" function in a plugin or add-on:
```php
    // add class to BODY in admin mode
    $this->snippets('add_admin_body_class', 'zukit-settings');

    // check if the page with ID is child of the page with slug 'gallery'
    if($this->snippets('is_child_of_slug', 'gallery', $page->ID)) {
        // ...
    }

    // convert string with 'translit'
    $slug = $this->snippets('translit', $term->name);

    // format bytes to kilobytes, megabytes, gigabytes
    $formatted_value = $this->snippets('format_bytes', $memory_in_bytes, 1);
```
------------------------------------------------------
### Options Page With Gutenberg Components

In order to create the `options` page for the plugin/theme, you need to create a JS script that will be loaded in the WordPress admin mode. All Gutenberg components are based on [React](https://reactjs.org), so without knowing this library it will be very difficult. But first, you can just copy the example. Even using the default parameters, you will get a page displaying your plugin/theme options and can easily change them:
```js
// WordPress dependencies

const { __ } = wp.i18n;
const { PanelBody } = wp.components;

// Zukit dependencies

const { renderPage, toggleOption, selectOption } = wp.zukit.render;

// Options labels and descriptions

const optionsData = {
	option1: {
		label: 	__('Use Option1?', 'myplugin'),
		help:	__('Detailed description for option1.', 'myplugin'),
	},
	option1_1: {
		label: 	__('Use Option1_1?', 'myplugin'),
		help:	__('Detailed description for option1_1.', 'myplugin'),
        // will be displayed only when 'option1' is true
        depends: 'option1',
        // divider will be added after this option
        // 2em -> margins above and under the divider
		divider: 2,
	},
	option2: {
		label: 	__('Use Option2?', 'myplugin'),
		help:	__('Detailed description for option2.', 'myplugin'),
	},
};

const selectData = {
	id: 'font_size',
	label: 	__('Font Size', 'myplugin'),
	help:	__('Choose which page slug will be considered as a gallery', 'myplugin'),
	options: [
		{ value: 'small', label: __('Small font size', 'myplugin') },
		{ value: 'normal', label: __('Normal font size', 'myplugin') },
		{ value: 'large', label: __('Large font size', 'myplugin') },
	],
	defaultValue: 'normal',
}

const EditMyplugin = ({
		title,
		options,
		updateOptions,
}) => {

	return (
        <PanelBody title={ title }>
            { toggleOption(optionsData, options, updateOptions) }
            { selectOption(options[selectData.id], selectData, updateOptions) }
        </PanelBody>
	);
};

renderPage('myplugin', {
    edit: EditMyplugin,
});
```
This example will work provided that the `prefix` key is defined in the `config` method as `myplugin`.

#### Sidebar info

The "__Plugin info__" section displays information about the plugin version and its author. Additional information can be added there. To do this, you need to override the `extend_info` method in which to return an array, each element of the array describes a information string: `label` and `value`. If you also specify the `depends` key, then when you change the value of this option, additional information will be re-requested from the server via AJAX (this is needed when some information depends on the options configuration). Also, if value is `null`, then the information string will be skipped when displayed:
```php
protected function extend_info() {
    return [
        'images'		=> [
                'label'		=> __('Images', 'myplugin'),
                'value'		=> count($this->get_attachments()),
        ],
        'galleries' 	=> empty($this->galleries) ? null : [
                'label'		=> __('Galleries', 'myplugin'),
                'value'		=> count($this->galleries),
        ],
        'memory'		=> [
                'label'		=> __('Cached Data', 'myplugin'),
                'value'		=> $this->get_cached_memory(),
                'depends' 	=> ['galleries', 'disable_cache'],
        ],
    ];
}
```

#### Sidebar actions

You can define some actions that will be executed from the `options` page via AJAX. To do this, you need to override the `js_data` method in which to return an array describing the actions that should be displayed in the sidebar. The `depends` key determines as usual whether the button is shown or not, depending on the value of the given option. If you specify the option name with an exclamation mark at the beginning, the button will be displayed when option value is `false` and will be hidden if `true`. If `depends` is `false` then the button will not be displayed:
```php
protected function js_data($is_frontend) {
    return  $is_frontend ? [] : [
        'actions' 		=> [
            [
                'label'		=> __('Update Galleries', 'myplugin'),
                'value'		=> 'myplugin_update_galleries',
                'icon'		=> 'admin-customizer',
                'color'		=> 'gold',
                'help'		=> __('Galleries will be updated for all images', 'myplugin'),
            ],
            [
                'label'		=> __('Convert Galleries', 'myplugin'),
                'value'		=> 'myplugin_convert_galleries',
                'color'		=> 'green',
                'depends'	=> $this->is_convertible() ? 'galleries' : false,
            ],
            [
                'label'		=> __('Clean All Cached Data', 'myplugin'),
                'value'		=> 'myplugin_reset_cached',
                'icon'		=> 'dismiss',
                'color'		=> 'magenta',
                'help'		=> __('Clear all cached data referenced to galleries', 'myplugin'),
                'depends'	=> '!disable_cache',
            ],
        ],
    ];
}
```

You must also define the response to AJAX requests for these actions. This is done by overriding the `ajax_more` method. You need to check the `$action` (action name) and perform the necessary actions. If this given `$action` is not processed, then `null` must be returned from this method. To form data for the response from the action, you can use the helper method `create_notice`:
```php
public function ajax_more($action, $value) {
    if($action === 'myplugin_reset_cached') return $this->reset_cached();
    else if($action === 'myplugin_convert_galleries') return $this->convert_galleries();
    else if($action === 'myplugin_update_galleries') return $this->update();
    else return null;
}

public function reset_cached() {
    $this->delete_cached('attachments');
    $this->delete_cached('galleries');
    return $this->create_notice('success', __('All cached data were cleared.', 'myplugin'));
}
```

#### Panels

It is recommended to use the built-in panel control mechanism to create groups of options or sections to display settings and data. To do this, you need to use the `ZukitPanel` component instead of the `Panel` component that is included in Gutenberg. You also need to pass the `panels` object to the `renderPage` function when creating the page. The object should contain the panel title, default value and panel dependency on plugin/theme option (optional). If the dependency is specified, the panel will be automatically hidden if the option value is `false`. Using the panel mechanism will allow you to hide and show panels with toggles in the sidebar and also store their state in the database:
```js
// WordPress dependencies

const { __ } = wp.i18n;
const { RangeControl, ToggleControl } = wp.components;

// Zukit dependencies

const { renderPage } = wp.zukit.render;
const { ZukitPanel } = wp.zukit.components;

const panelsData = {
	section1: {
		value: true,
		label: __('Section One', 'myplugin'),
		// This will hide this panel when option is false
		depends: 'option2',
	},
	section2: {
		value: true,
		label: __('Small but important Section', 'myplugin'),
	},
};

const EditMyplugin = ({
		options,
		updateOptions,
}) => {

	return (
        <>
            <ZukitPanel id="section1" initialOpen={ false }>
                <RangeControl
                    label={ __('Tree Animation Speed, ms', 'myplugin') }
                    value={ options.anim_speed }
                    onChange={ value => updateOptions({ anim_speed: value }) }
                    step={ 100 }
                    min={ 200 }
                    max={ 600 }
                />
            </ZukitPanel>
            <ZukitPanel id="section2">
                <ToggleControl
                    label={ __('Something small', 'myplugin') }
                    checked={ !!options.small }
                    onChange={ () => updateOptions({ small: !options.small }) }
                />
            </ZukitPanel>
        </>
	);
};

renderPage('myplugin', {
	edit: EditMyplugin,
	panels: panelsData,
});
```

#### Option Hooks

Sometimes required to do something when some option(s) is changed. To do this, you need to use
special `hooks` on updating options. The hook registration function `setUpdateHook` is available as one of the param in your component. Register a hook when necessary (for example, via `useEffect`) and it will be called when the value of the required option is changed:
```js
// WordPress dependencies

const { useState, useEffect, useCallback } = wp.element;

// Zukit dependencies

const { ZukitPanel, SelectItem } = wp.zukit.components;

const MypluginSection = ({
    options,
    updateOptions,
    ajaxAction,
    setUpdateHook,
}) => {

    const [icons, setIcons] = useState(null);

    const onToggle = useCallback(() => {
        if(icons === null) {
            ajaxAction('myplugin_get_icons', data => {
                const iconset = get(data, 'icons', []);
                if(iconset.length) setIcons(iconset);
            });
        }
    }, [ajaxAction, icons]);

    // reset icons set when 'icons' or 'more_icons' option is updated
    useEffect(() => {
        setUpdateHook(['icons', 'more_icons'], () => {
            setIcons(null);
        });
    }, [setIcons, setUpdateHook]);

	return (
        <ZukitPanel id="icons" initialOpen={ false } onToggle={ onToggle }>
            <SelectItem
                columns={ 3 }
                label={ __('Select Icon', 'myplugin') }
                options={ icons }
                selectedItem={ options.icon }
                onClick={ value => updateOptions({ icon: value }) }
                transformValue={ value => (<div className={ `dashicons ${value}` }></div>) }
            />
        </ZukitPanel>
	);
};

export default MypluginSection;
```

#### Tables

> &#x2757; Description required


------------------------------------------------------

### Structure of "Zukit"

- Folder __dist__ contains _production_ versions of js and css files;
- Folder __snippets__ contains a collection of various functions that I have accumulated during my work with WordPress. They are combined into one class for ease of use;
- Folder __traits__ contains traits that are included in the class `zukit_Plugin`. Used to group functionality in a fine-grained and consistent way;
- Folder __src__ contains _source_ versions of js and css files.

<!--
коды для emoji unicode
https://apps.timwhitlock.info/emoji/tables/unicode

```diff
- red
+ green
! orange
# gray
```
-->

<!-- See [Dmitry Rudakov Coding](https://dmitryrudakov.com/coding/) for complete docs and demos.
-->
