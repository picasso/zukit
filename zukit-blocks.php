<?php

require_once('traits/block-attributes.php');
require_once('traits/block-metakeys.php');

// Basic Blocks Class ---------------------------------------------------------]

class zukit_Blocks extends zukit_Addon {

	protected $attributes = [];
	protected $metakeys = [];

	private $blocks_available = false;
	// static $colors_file = 'zu-admin-color-js';

	// Add functions for blocks with attributes
	use zukit_BlockAttributes;

	// Add meta keys for blocks
	use zukit_BlockMeta;

	protected function construct_more() {
		$this->blocks_available = function_exists('register_block_type');

		if($this->blocks_available) {
			// add_action('init', [$this, 'register_blocks'], 99);

			// add_action('enqueue_block_editor_assets', [$this, 'localization']);
			// add_action('wp_enqueue_scripts', [$this, 'frontend_scripts']);
			// add_action('the_post', [$this, 'frontend_scripts']);
		}
	}

	protected function config_defaults() {
		return [
			'dynamic'		=> false,
			'metakeys'		=> false,
			'no_excerpt'	=> false,
			'namespace'		=> $this->prefix_it('blocks', '/'),
			'handle'		=> $this->prefix_it('blocks'),
		];
	}

	public function init() {
		if($this->blocks_available) {
			$this->register_blocks();
			$this->block_assets();
			$this->editor_assets();
		}
	}

	public function register_blocks() {

		// return early if not available
		if(!$this->blocks_available) return;

		$handle = $this->get('handle');
		$blocks = $this->get('namespace');

		foreach((is_array($blocks) ? $blocks : [$blocks]) as $block) {
			register_block_type(
				$block,
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

	protected function js_params($is_frontend) {
		return [
			'register_only' => true,
			'add_prefix'	=> false,
			'deps'			=> $is_frontend ? [] : ['wp-edit-post'],
			'data'			=> $this->js_data($is_frontend),
		];
	}
	protected function css_params($is_frontend) {
		return [
			'register_only' => true,
			'add_prefix'	=> false,
			'deps'			=> $is_frontend ? [] : ['wp-edit-post'],
		];
	}
	protected function js_data($is_frontend) {}

	public function editor_assets() {

		if(is_admin()) {
			$this->register_style_and_script(false);

			// $this->parent->register_script($this->get('handle'), [
			// 	'wp-blocks',
			// 	'wp-i18n',
			// 	'wp-element',
			// 	'wp-plugins',
			// 	'wp-components',
			// 	'wp-edit-post'
			// ]);
		}
	}

	public function block_assets() {
		// $this->register_script(zu_Blocks::$handle. '-frontend', ['jquery']);

		// $this->register_style_and_script(true);
	}

	public function frontend_scripts() {

		if(!is_admin()) {
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
	_dbug($handle, $js_params, $css_params);
		call_user_func_array(
			[$this, $is_frontend ? 'enqueue_style' : 'admin_enqueue_style'],
			[$handle, $css_params]
		);
		call_user_func_array(
			[$this, $is_frontend ? 'enqueue_script' : 'admin_enqueue_script'],
			[$handle, $js_params]
		);
	}

	private function get_admin_colors() {

		$colors = [];
		$filepath = $this->parent->get_filepath(true, zu_Blocks::$colors_file);
		if(file_exists($filepath)) {
			$content = file_get_contents($filepath);
			if($content === false) return $colors;
			foreach(explode('}', $content) as $line) {
				$name = preg_match('/.js_([^\{]+)/', $line, $matches) ? $matches[1] : 'error';
				$color = preg_match('/color\:(.+)/', $line, $matches) ? $matches[1] : 'red';
				$colors[$name] = $color;
			}
		}
		return $colors;
	}
}
