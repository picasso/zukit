<?php

require_once('traits/block-attributes.php');
require_once('traits/block-metakeys.php');

// Basic Blocks Class ---------------------------------------------------------]

class zukit_Blocks extends zukit_Addon {

	protected $attributes = [];
	protected $metakeys = [];

	private $blocks_available = false;

	// We can only have one 'zukit-blocks' script loaded and therefore
    // store its status in a static property so that we can avoid repeated 'enqueue' calls.
    private static $zukit_loaded = false;

	private static $zukit_handle = 'zukit-blocks';

	private static $colors_filename = 'zukit-colors';

	// Add functions for blocks with attributes
	use zukit_BlockAttributes;

	// Add meta keys for blocks
	use zukit_BlockMeta;

	protected function construct_more() {
		$this->blocks_available = function_exists('register_block_type');

		if($this->blocks_available) {
			// add_action('init', [$this, 'register_blocks'], 99);
			add_action('enqueue_block_editor_assets', [$this, 'editor_assets']);
			add_action('enqueue_block_assets', [$this, 'block_assets']);
			// add_action('wp_enqueue_scripts', [$this, 'frontend_scripts']);
		}
	}

	protected function config_defaults() {
		return [
			// should load zukit blocks JS & CSS (admin mode only)
			'load_zukit'	=> true,
			// should load plugin/theme CSS (admin mode only)
			'load_css'		=> true,
			// should load plugin/theme JS (admin mode only)
			'load_js'		=> false,

			'dynamic'		=> false,
			'metakeys'		=> false,
			'no_excerpt'	=> false,
			'namespace'		=> $this->get('prefix', true),
			'handle'		=> $this->prefix_it('blocks'),
			'blocks'		=> [],
		];
	}

	public function init() {
		if($this->blocks_available) {
			$this->register_blocks();
			// $this->editor_assets();
		}
	}

	public function register_blocks() {

		// return early if not available
		if(!$this->blocks_available) return;

		$handle = $this->get('handle');
		$namespace = $this->get('namespace');
		$blocks = $this->get('blocks');

		foreach((is_array($blocks) ? $blocks : [$blocks]) as $block) {
			$block_name = strpos($block, '/') !== false ? $block : $namespace.'/'.$block;
			register_block_type(
				$block_name,
				[
					'editor_script'	=> $handle,
					'editor_style'	=> $handle,
					'style'			=> $this->prefix_it($this->get('suffix', true)),
				]
			);
		}

		// add block attributes, generate 'render_callbak' and register these blocks
		if($this->is_config('dynamic') === true) $this->register_blocks_with_attributes();

		// register meta keys to make them be accessible for blocks via the REST API
		if($this->is_config('metakeys') === true) $this->register_metakeys();

		// add list of blocks which should be avoided during apply_filters('the_content'...)
		// because we need remove any Gutenberg block which use 'get_excerpt' before apply_filters('the_content'...)
		if($this->is_config('no_excerpt') === true) {
			$no_excerpt_blocks = $this->no_excerpt();
			if(!empty($no_excerpt_blocks)) {
				add_filter('zukit_no_excerpt_blocks', function($blocks) use($no_excerpt_blocks) {
					return array_merge($blocks, $no_excerpt_blocks);
				}, 10, 1);
			}
		}
	}

	// Scripts & Styles management --------------------------------------------]

	protected function should_load_css($is_frontend) { return true; }

	protected function js_params($is_frontend) {
		return [
			// 'register_only' => true,
			'add_prefix'	=> false,
			'deps'			=> $is_frontend ? [] : ['wp-edit-post'],
			'data'			=> $this->js_data($is_frontend),
		];
	}
	protected function css_params($is_frontend) {
		return [
			// 'register_only' => true,
			'add_prefix'	=> false,
			'deps'			=> $is_frontend ? [] : ['wp-edit-post'],
		];
	}
	protected function js_data($is_frontend) {}

	public function editor_assets() {
		$this->zukit_blocks_enqueue();
		$this->register_style_and_script(false);
	}

	public function block_assets() {
		if(is_admin()) {
			$this->plugin->force_frontend_enqueue(
				$this->get('load_css'),
				$this->get('load_js')
			);
		}

		// $this->register_style_and_script(true);
	}

	public function frontend_scripts() {

		if(!is_admin()) {
		}
	}

	public function zukit_blocks_enqueue() {
		if(self::$zukit_loaded === false && $this->is_config('load_zukit')) {
			// dependencies for Zukit Blocks script & styles
			$js_deps = ['wp-edit-post'];
			// 	'wp-blocks',
			// 	'wp-i18n',
			// 	'wp-element',
			// 	'wp-plugins',
			// 	'wp-components',
			// 	'wp-edit-post'

			$css_deps = ['wp-edit-post'];
			// params for 'zukit-blocks' script
			$zukit_params = [
				'absolute'		=> true,
				'add_prefix'	=> false,
				'data'			=> [
					'jsdata_name'	=> 'zukit_jsdata',
					'colors'		=> $this->get_colors(),
				],
				'deps'			=> $js_deps,
				'handle'		=> self::$zukit_handle,
			];
			$this->admin_enqueue_script(self::$zukit_handle, $zukit_params);
			$this->admin_enqueue_style(self::$zukit_handle, array_merge($zukit_params, ['deps'	=> $css_deps]));
			// Parameters: [$handle, $domain, $path]. WordPress will check for a file in that path
			// with the format ${domain}-${locale}-${handle}.json as the source of translations
        	wp_set_script_translations('zukit', 'zukit', $this->plugin->zukit_dirname('lang'));
			self::$zukit_loaded = true;
		}
	}

	private function register_style_and_script($is_frontend) {
		$handle = $this->get('handle');

		$css_params = $this->plugin->params_validated(
			$this->css_params($is_frontend),
			self::css_params($is_frontend)
		);
		$js_params = $this->plugin->params_validated(
			$this->js_params($is_frontend),
			self::js_params($is_frontend)
		);

		// add dependency to Zukit Blocks if required
		if($this->is_config('load_zukit')) {
			$css_params['deps'][] = self::$zukit_handle;
			$js_params['deps'][] = self::$zukit_handle;
		}

		if($this->should_load_css($is_frontend)) {
			call_user_func_array(
				[$this, $is_frontend ? 'enqueue_style' : 'admin_enqueue_style'],
				[$handle, $css_params]
			);
		}

		call_user_func_array(
			[$this, $is_frontend ? 'enqueue_script' : 'admin_enqueue_script'],
			[$handle, $js_params]
		);
	}

	private function get_colors() {
		$colors = [];
		$filepath = $this->plugin->get_zukit_filepath(true, self::$colors_filename, false);
		if(file_exists($filepath)) {
			$content = file_get_contents($filepath);
			if($content === false) return $colors;
			foreach(explode('}', $content) as $line) {
				if(empty(trim($line))) continue;
				$name = preg_match('/.js_([^\{]+)/', $line, $matches) ? $matches[1] : 'error';
				$color = preg_match('/color\:(.+)/', $line, $matches) ? $matches[1] : 'red';
				$short_name = str_replace('_color', '', $name);
				if(array_key_exists($short_name, $colors)) $this->log_error([
					'line'			=> $line,
	                'name'			=> $name,
	                'color'			=> $color,
	                'short_name'	=> $short_name,
					'colors'		=> $colors,
	            ], 'Duplicate name when creating Zukit Colors!');

				$colors[$short_name] = $color;
			}
		}
		return $colors;
	}
}
