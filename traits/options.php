<?php

// Plugin Options Trait -------------------------------------------------------]

trait zukit_Options {

	// Options management -----------------------------------------------------]
	// !! Should not use these functions in construct_more() !!
	//
	public function options() {
		$options = get_option($this->options_key);
		// Check whether we need to install an option, used during installation of plugin
		if($options === false || $this->get('debug_options')) $options = $this->reset_options(false);
		$this->options = $options;
		return $this->options;
	}

	public function update_options($options = null) {
		return update_option($this->options_key, $options ?? $this->options);
	}

	public function reset_options($withAddons = true) {
		$options = $this->get('options') ?? [];
		$this->update_options($options);
		$this->options = $options;
		if($withAddons) $this->reset_addons();
		return $this->options;
	}

	// If we remove from the options belonging to the add-on, then after the operation
	// we do not update the options - add-on will take care of this
	public function del_option($key, $addon_options = null) {
		$result = true;
		$options = is_null($addon_options) ? $this->options : $addon_options;
		if(array_key_exists($key, $options)) {
			unset($options[$key]);
			if(is_null($addon_options)) {
				$this->options = $options;
				$result = $this->update_options();
			}
		}
		return $result === false ? false : $options;
	}

	// If 'key' contains 'path' - then resolve it before update
	// When $this->path_autocreated is true then if a portion of path doesn't exist, it's created
	// If we set value for the options belonging to the add-on, then after the operation
	// we do not update the options - add-on will take care of this
	public function set_option($key, $value, $rewrite_array = false, $addon_options = null) {

		// $value cannot be undefined or null!
		if(!isset($value) || is_null($value)) return $options;

		$result = true;
		$options = is_null($addon_options) ? $this->options : $addon_options;
		if(!$rewrite_array && is_array($value)) $options[$key] = array_replace_recursive($options[$key] ?? [], $value);
		else {
			// sets a value in a nested array based on path (if presented)
			$pathParts = explode('.', $key);
			$pathCount = count($pathParts);

			if($pathCount === 1) {
				$options[$key] = $value;
			} else {
				$lastKey = $pathParts[$pathCount-1];
				$current = &$options;
				foreach($pathParts as $pathKey) {
					if($pathCount === 1) break;
					if(!is_array($current)) {
						if($this->path_autocreated) $current = [];
						else return false;
					}
					$current = &$current[$pathKey];
					$pathCount--;
				}
				if(!is_array($current)) {
					if($this->path_autocreated) $current = [];
					else return false;
				}
				$current[$lastKey] = $value;
			}
		}

		if(is_null($addon_options)) {
			$this->options = $options;
			$result = $this->update_options();
		}
		return $result === false ? false : $options;
	}

	// If 'key' contains 'path' - then resolve it before get
	public function get_option($key, $default = '', $addon_options = null) {
		$options = is_null($addon_options) ? $this->options : $addon_options;

		// gets a value in a nested array based on path (if presented)
		$pathParts = explode('.', $key);
		$pathCount = count($pathParts);
		$set = $options;
		if($pathCount > 1) {
			$key = $pathParts[$pathCount-1];
			foreach($pathParts as $pathKey) {
				if($pathCount === 1) break;
				if(!is_array($set)) return $default;
				$set = $set[$pathKey] ?? null;
				$pathCount--;
			}
		}

		if(!isset($set[$key])) return $default;

		// return and cast to default value type
		if(is_bool($default)) return filter_var($set[$key], FILTER_VALIDATE_BOOLEAN);
		if(is_int($default)) return intval($set[$key]);
		if(is_string($default))	return strval($set[$key]);

		return $set[$key];
	}

	public function is_option($key, $check_value = true, $addon_options = null) {
		$value = $this->get_option($key, $this->def_value($check_value), $addon_options);
		return $value === $check_value;
	}

	private function def_value($type) {
		// return default value for given type
		if(is_bool($type)) return false;
		if(is_int($type)) return 0;
		if(is_string($type)) return '';
		return null;
	}
}
