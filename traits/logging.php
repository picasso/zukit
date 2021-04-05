<?php
trait zukit_Logging {

	private $basic_trace_shift = 3;

	private $sline = '─';
	private $dline = '═';
	// To filter log messages to some classes only
    private $log_filter = [];

	// Basic error logging ----------------------------------------------------]

	public function log(...$params) {
        $this->log_with(0, null, ...$params);
    }

	// logging with context
	public function logc($context, ...$params) {
        $this->log_with(0, $context, ...$params);
    }

	// or debugging logging methods (to avoid recursion)
	public function logd(...$params) {
        $this->log_internal(...$params);
    }

	// if '$line_shift' is an array then suppose it contains data from 'get_log_data()'
	public function log_with($line_shift, $context, ...$params) {

		if($this->skip_log()) return;

		$data = is_array($line_shift) ? $line_shift : $this->get_log_data($params, $line_shift, $context);
		$log = PHP_EOL.$data['log_line'].PHP_EOL.str_repeat($this->dline, strlen($data['log_line'])).($data['context'] ?? '');
		foreach($data['args'] as $index => $var) {
			if($var['name'] !== '?') $log .= $this->var_label($index, $var['name']);
			// use 'var_export' instead of 'print_r' since the latter does not display 'false' values
			$log .= PHP_EOL.var_export($var['value'], true).PHP_EOL;
		}
        $this->file_log($log);
    }

	public function get_log_data($params, $line_shift = 0, $context = null) {
		$data = [];
		$data['trace'] = $this->log_trace($line_shift);
		$data['log_line'] = $this->log_label($data['trace'], static::class);
		$data['context'] = $this->context_label($context);
		$data['args'] = [];
		$args_shift = empty($data['context']) ? 0 : 1;
		foreach($params as $key => $val) {
			$data['args'][$key] = [
				'name'	=> $data['trace']['args'][$key + $args_shift] ?? '?',
				'value'	=> $val,
			];
		}
		return $data;
    }

	public function get_log_label($var, $type = 'context') {
		if($type === 'context') return $this->context_label($var);
		else if($type === 'var') return $this->var_label($var['index'] ?? 0, $var['name'] ?? '?');
		else if($type === 'log') return $this->log_label($var['class'] ?? static::class, $var['trace'] ?? []);
		return '';
	}

	public function log_only($class = null) {
        if($class === false) $this->log_filter = [];
        else if($class === null) $this->log_filter[] = static::class;
        else $this->log_filter[] = $class;
    }

	// this method can be overridden to change the way of logging
	protected function file_log($log) {
		error_log($log);
	}

	private function skip_log() {
		return !empty($this->log_filter) && in_array(static::class, $this->log_filter);
	}

	private function log_label($trace, $called_class = null) {
        return sprintf(
            'DEBUG:%6$s IN %5$s%4$s%3$s() [%1$s:%2$s]',
            $trace['file'] ?? '?',
            $trace['line'] ?? '?',
            $trace['func'] ?? '?',
            $trace['type'] ?? '',
            $trace['class'] ?? '',
            empty($called_class) ? '' : sprintf(' {CLASS %1$s}', $called_class),
        );
    }
	// ╔─────────────────────╗
	// │ * * * Context * * * │
	// ╚─────────────────────╝
	private function context_label($context) {
		if(empty($context)) return null;
		$context = sprintf('│ * * * %s * * * │', $context);
		$line = str_repeat($this->sline, mb_strlen($context) - 2);
		return PHP_EOL.sprintf('╔%s╗', $line).PHP_EOL.$context.PHP_EOL.sprintf('╚%s╝', $line).PHP_EOL;
    }
	//
	//  [0] $my_var_name
	// └────────────────┘
	private function var_label($index, $vname) {
		$name = sprintf(' %2$s', $index, $vname); // ' [%1$s] %2$s'
		$line = sprintf('└%s┘', str_repeat($this->sline, strlen($name) - 1));
		return PHP_EOL.$name.PHP_EOL.$line;
    }

    private function log_trace($line_shift = 0) {
        $trace = array_map(function($val) {
			unset($val['object']);
			return $val;
		}, debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS));

        // NOTE: to research backtrace structure
        // $this->logd($trace);

        $line = $this->basic_trace_shift + $line_shift;
		$args = $this->call_args($trace[$line]['file'], $trace[$line]['line'], $trace[$line]['function']);

		return [
			'file'	=> explode('wp-content', $trace[$line]['file'])[1] ?? '?',
			'line'	=> $trace[$line]['line'],
			'func'	=> $trace[$line + 1]['function'],
			'type'	=> $trace[$line + 1]['type'] ?? '',
			'class'	=> $trace[$line + 1]['class'] ?? '',
			'args'	=> $args,
		];
    }

	private function call_args($file, $line, $func) {
		$lines = file($file);
		$row = $lines[$line - 1];
		// $this->logd($file);
		// $this->logd($line);
		// $this->logd($row);
		preg_match("/$func\(([^;|\n]+);/m", $row, $matches);
		return array_map('trim', explode(',', preg_replace('/\)$/m', '', $matches[1] ?? '?')));
		// $this->logd($names);
		// return $names;
	}

	private function log_internal($info , $val = '$undefined', $use_export = true) {
		if($val === '$undefined') {
			$val = $info;
			$info = '';
		}
		$marker = sprintf('[* {%s} internal debugging *]', static::class);
		$value = $use_export ? var_export($val, true) : print_r($val, true);
		$log = PHP_EOL.$marker.PHP_EOL.'┌'.str_repeat('~', strlen($marker) - 1).PHP_EOL;
		$log .= sprintf(' %s = %s', $info, preg_replace('/\n$/', '', $value));
		$log .= PHP_EOL.str_repeat('~', strlen($marker)).'┘'.PHP_EOL;
		$this->file_log($log);
	}
}
