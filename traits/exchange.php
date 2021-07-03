<?php

// Plugin Exchange Trait ------------------------------------------------------]

trait zukit_Exchange {

	private $methods = [];
	private $defaults = [];

	private function register_exchange_defaults($default_values) {
		$this->defaults = array_merge($this->defaults, is_array($default_values) ? $default_values : [$default_values]);
	}

	private function method_exists($name) {
		return array_key_exists($name, $this->methods);
	}

	// if default value is '$1' then first element from $params(func arguments) will be returned
	// same for '$2', '$3' etc.
	private function get_default($name, $params) {
		$default_value = $this->defaults[$name] ?? null;
		if(is_string($default_value)) {
			// argument index begins with zero - therefore minus 1 
			$index = preg_match('/\$(\d+)/', $default_value, $matches) ? absint($matches[1] - 1) : false;
			if($index !== false) $default_value = $params[$index] ?? null;
		}
		return $default_value;
	}

	public function register_provider($name, $provider = null, $suffix = null) {
		$method_name = $suffix ? "{$name}_{$suffix}" : $name;
		$this->methods[$name] = [$provider ?: $this, $method_name];
	}

	public function call_provider($name, ...$params) {
		$default_value = $this->get_default($name, $params);
		// zu_log_if($name === 'try_cdn', $name, $this->method_exists($name), $default_value);
		if($this->method_exists($name)) {
			$func = $this->methods[$name];
			// zu_log_if($name === 'try_cdn', $func[1], is_callable($func), $params);
			$res = is_callable($func) ? call_user_func_array($func, $params) : $default_value;
			// zu_log_if($name === 'try_cdn', $res);
			return $res;
		}
		return $default_value;
	}
}

// Add-on Provider Trait ------------------------------------------------------]

trait zukit_Provider {

	protected function register_provider($name) {
		return $this->plugin->register_provider($name, $this, 'origin');
	}
	protected function register_provider_suffix($name, $suffix = null) {
		return $this->plugin->register_provider($name, $this, $suffix);
	}
	protected function call_provider($name, ...$params) {
		return $this->plugin->call_provider($name, ...$params);
	}
}
