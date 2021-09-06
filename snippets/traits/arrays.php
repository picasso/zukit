<?php
trait zusnippets_Arrays {

	// Some array helpers -----------------------------------------------------]

	// to determine whether an array has some 'string' keys (associative array)
	public function is_assoc_array($array) {
		return count(array_filter(array_keys($array ?? []), 'is_string')) > 0;
	}

	public function array_md5($array) {
		// https://stackoverflow.com/questions/2254220/php-best-way-to-md5-multi-dimensional-array
	    // since we're inside a function (which uses a copied array, not
	    // a referenced array), you shouldn't need to copy the array
	    array_multisort($array);
	    return md5(json_encode($array ?? []));
	}

	public function array_prefix($array, $prefix, $suffix = '', $use_keys = false) {
		return array_map(
				function($v) use($prefix, $suffix) { return $prefix.$v.$suffix; },
				$use_keys ? array_keys($array ?? []) : $array ?? []
		);
	}

	public function array_prefix_keys($array, $prefix, $suffix = '') {
		return array_combine(
			$this->array_prefix($array, $prefix, $suffix, true),
			$array ?? []
		);
	}

	public function array_without_null($array) {
		return array_filter($array ?? [], function($val) { return !is_null($val); });
	}

	public function array_without_keys($array, $keys) {
		return array_diff_key($array ?? [], array_flip($keys));
	}

	public function array_pick_keys($array, $keys) {
		return array_intersect_key($array ?? [], array_flip($keys));
	}

	public function array_with_defaults($array, $defaults, $only_default_keys = true, $clean = true) {
		$array = $only_default_keys ? $this->array_pick_keys($array, array_keys($defaults)) : $array ?? [];
		return array_merge($defaults, $clean ? $this->array_without_null($array) : $array);
	}

	public function array_flatten($array) {
		$flatten = [];
		foreach($array ?? [] as $value) {
			if(is_array($value)) $flatten = array_merge($flatten, $this->array_flatten($value));
			else $flatten[] = $value;
		}
		return $flatten;
	}

	public function array_zip_merge(...$arrays) {
		$output = array_map(null, ...$arrays);
		return array_values(array_filter($this->array_flatten($output)));
	}
    // 	$output = [];
    // 	// the loop incrementer takes each array out of the loop as it gets emptied by 'array_shift'
    // 	for($args = $arrays; count($args); $args = array_merge([], $args)) { // array_merge() to make copy of array $args = array_filter($args)
    // 		// '&$arg' allows 'array_shift' to change the original
    // 		foreach($args as &$arg) {
    // 			$output[] = array_shift($arg);
    // 		}
    // 	}
    // 	return  array_filter($output);
    // }
}
