<?php
// Plugin Addon Class -----------------------------------------------------------------------------]

class zukit_Addon {

	protected $config;
	protected $plugin;
	protected $name;
	protected $options;
	protected $options_key;
	protected $dir;
	protected $uri;
	protected $version;

	private $nonce;

	public function register($plugin) {

		$this->plugin = $plugin ?? null;
		if (empty($this->plugin)) {
			_doing_it_wrong(__FUNCTION__, '"Addon" cannot be used without plugin!', $this->version);
		} else {
			$this->dir = $this->plugin->dir;
			$this->uri = $this->plugin->uri;
			$this->version = $this->plugin->version;

			$this->config = array_merge($this->config_defaults(), $this->config());
			$this->name = $this->get('name') ?? 'zuaddon';
			$this->nonce = $this->get_callable('nonce') ?? $this->name . '_ajax_nonce';

			$this->options_key = $this->name . '_options';
			$this->init_options();
			$this->construct_more_inner();
			$this->construct_more();
		}
	}

	// Configuration management -------------------------------------------------------------------]

	protected function config() {
		return [];
	}
	protected function config_defaults() {
		return [];
	}

	// 'construct_more' is only called after the add-on is registered by the plugin!
	protected function construct_more() {
	}
	// 'construct_more_inner' is needed for classes that will inherit from 'zukit_Addon'
	// but to keep 'construct_more' free for users of the framework
	protected function construct_more_inner() {
	}

	public function init() {
	}
	// 'init_inner' is needed for classes that will inherit from 'zukit_Addon'
	// but to keep 'init' free for users of the framework	
	public function init_inner() {
	}
	public function admin_init() {
	}

	public function enqueue() {
	}
	public function admin_enqueue($hook) {
	}
	public function clean() {
	}
	public function ajax($action, $value) {
		return null;
	}

	// Options management -------------------------------------------------------------------------]

	final public function init_options() {
		$options = $this->plugin->options();
		if (!isset($options[$this->options_key]) && !is_null($this->get('options'))) {
			$this->options = $this->get('options');
			$this->plugin->set_option($this->options_key, $this->options, true);
		} else {
			$this->options($options);
		}
	}

	final public function extend_parent_options($parent_options) {
		$options = $this->get('options');
		$parent_options[$this->options_key] = $options;
		return $parent_options;
	}

	final public function options($options = null) {
		if (!is_null($options)) $this->options = $options[$this->options_key] ?? [];
		return $this->options;
	}

	final protected function get_option($key, $default = null) {
		return $this->plugin->get_option($key, $default, $this->options);
	}

	final protected function is_option($key, $check_value = true) {
		return $this->plugin->is_option($key, $check_value, $this->options);
	}

	final protected function del_option($key) {
		$this->options = $this->plugin->del_option($key, $this->options);
		return $this->plugin->set_option($this->options_key, $this->options, true);
	}

	final protected function set_option($key, $value, $rewrite_array = false) {
		$this->options = $this->plugin->set_option($key, $value, $rewrite_array, $this->options);
		return $this->plugin->set_option($this->options_key, $this->options, true);
	}

	final protected function is_parent_option($key, $check_value = true) {
		return $this->plugin->is_option($key, $check_value);
	}

	final protected function get_parent_option($key, $default = null) {
		return $this->plugin->get_option($key, $default);
	}

	// Redirect to parent methods -----------------------------------------------------------------]

	protected function extend_parent_redirects() {
	}

	final public function __call($method, $args) {
		$available_methods = [
			'ajax_error',
			'ajax_nonce',
			'ajax_send',
			'array_with_defaults',
			'create_notice',
			'do_with_instances',
			'ends_with_slug',
			'enqueue_only',
			'get_file_version',
			'has_snippet',
			'is_error',
			'logd',
			'prefix_it',
			'register_only',
			'snippets',
			'_snippets',
			'sprintf_dir',
			'sprintf_uri',
		];
		if (!in_array($method, array_merge($available_methods, $this->extend_parent_redirects() ?? []))) {
			// if we have 'zukit_Exchange' trait - then transfer processing further
			if (method_exists($this, 'call_addon_provider')) {
				return $this->call_addon_provider($method, $args);
			}
			$this->logc('?Trying to call an unavailable parent method', [
				'method'		=> $method,
				'args'			=> $args,
				'available'		=> $available_methods,
			]);
			return null;
		}
		$func = [$this->plugin, $method];
		return is_callable($func) ? call_user_func_array($func, $args) : null;
	}

	final protected function enqueue_style($file, $params = []) {
		// enforce_defaults: $is_style, $is_frontend, $params
		$params_with_defaults = $this->plugin->enforce_defaults(true, true, $params);
		return $this->plugin->enqueue_style($this->filename($file, $params), $params_with_defaults);
	}
	final protected function enqueue_script($file, $params = []) {
		$params_with_defaults = $this->plugin->enforce_defaults(false, true, $params);
		return $this->plugin->enqueue_script($this->filename($file, $params), $params_with_defaults);
	}
	final protected function admin_enqueue_style($file, $params = []) {
		$params_with_defaults = $this->plugin->enforce_defaults(true, false, $params);
		return $this->plugin->admin_enqueue_style($this->filename($file, $params), $params_with_defaults);
	}
	final protected function admin_enqueue_script($file, $params = []) {
		$params_with_defaults = $this->plugin->enforce_defaults(false, false, $params);
		return $this->plugin->admin_enqueue_script($this->filename($file, $params), $params_with_defaults);
	}
	// we need an additional backtrace shift to compensate for the nested call
	final protected function log(...$params) {
		$this->plugin->debug_line_shift(1);
		$this->plugin->log(...$params);
		$this->plugin->debug_line_shift(0);
	}
	final protected function logc($context, ...$params) {
		$this->plugin->debug_line_shift(1);
		$this->plugin->logc($context, ...$params);
		$this->plugin->debug_line_shift(0);
	}

	// Common interface to parent methods with availability check ---------------------------------]

	// NOTE: only public functions and property can be called with this helper
	final protected function with_another($prop, $func, ...$params) {
		if (property_exists($this->plugin, $prop)) {
			$another = $this->plugin->{$prop};
			if (method_exists($another, $func)) return call_user_func_array([$another, $func], $params);
		}
		return null;
	}

	final protected function call_parent($func, ...$params) {
		if (method_exists($this->plugin, $func)) return call_user_func_array([$this->plugin, $func], $params);
		else return null;
	}

	// Helpers ------------------------------------------------------------------------------------]

	final protected function get($key, $from_plugin = false, $default_value = null) {
		return $this->plugin->get($key, $default_value, $from_plugin ? null : $this->config);
	}

	final protected function get_callable($key, $from_plugin = false, $default_value = null) {
		return $this->plugin->get_callable($key, $default_value, $from_plugin ? null : $this->config);
	}

	private function filename($file, $params) {
		$with_prefix = $params['add_prefix'] ?? true;
		return $with_prefix ? $this->prefix_it($file) : $file;
	}
}
