<?php
trait zusnippets_Extend {

	private $ex_methods = [];
	private $soft_exception = true;

    // Dynamically Extend snippets with new methods ---------------------------]

	public function method_exists($name) {
		return method_exists($this, $name) || array_key_exists($name, $this->ex_methods);
	}

	public function register_method($name, $instance) {
		$this->ex_methods[$name] = [$instance, $name];
	}

	public function __call($method, $args) {
		if(!array_key_exists($method, $this->ex_methods)) {
			$this->logc('?Snippets method not found!', [
				'method'		=> $method,
				'args'			=> $args,
				'ex_methods'	=> $this->ex_methods,
			]);
			if($this->soft_exception === false) throw new BadMethodCallException();
			return null;
		}
		return call_user_func_array($this->ex_methods[$method], $args);
	}

	private function maybe_call($method, ...$args) {
		return $this->method_exists($method) ? call_user_func_array($this->ex_methods[$method], $args) : null;
	}
}
