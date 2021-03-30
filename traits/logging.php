<?php
trait zukit_Logging {

	private $basic_trace_shift = 2;

	// To filter log messages to some classes only
    private $log_filter = [];

	// Basic error logging ----------------------------------------------------]

	public function log(...$params) {
        $this->log_with(0, null, ...$params);
    }

	// logging with context
	public function logc($context, ...$params) {
        $this->log_with(0, $this->context_label($context), ...$params);
    }

	public function context_label($context) {
		$context = '* * * '.$context;
		return PHP_EOL.$context.PHP_EOL.str_repeat('=', mb_strlen($context));
    }

	public function log_only($class = null) {
        if($class === false) $this->log_filter = [];
        else if($class === null) $this->log_filter[] = static::class;
        else $this->log_filter[] = $class;
    }

	public function log_with($line_shift, $context, ...$params) {

		if($this->skip_log()) return;

		$trace = $this->log_trace($line_shift);
		$log_line = $this->log_label($trace, static::class);
		$log = PHP_EOL.$log_line.PHP_EOL.str_repeat('=', strlen($log_line)).($context ?? '');
		$args_shift = empty($context) ? 0 : 1;

		foreach($params as $key => $val) {
			$name = $trace['args'][$key + $args_shift] ?? '?';
			if($name !== '?') {
				$name = sprintf('[%1$s] %2$s', $key, $name);
				$log .= PHP_EOL.$name.PHP_EOL.str_repeat('⎼', strlen($name));
			}
			// use 'var_export' instead of 'print_r' since the latter does not display 'false' values
			$log .= PHP_EOL.var_export($val, true).PHP_EOL;
		}
        $this->file_log($log);
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
            $trace['file'],
            $trace['line'],
            $trace['func'],
            $trace['type'],
            $trace['class'],
            empty($called_class) ? '' : sprintf(' {CLASS %1$s}', $called_class),
        );
    }

    private function log_trace($line_shift = 0) {
        $trace = array_map(function($val) {
			unset($val['object']);
			return $val;
		}, debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS));

        // NOTE: to research backtrace structure
        // $this->log_debug($trace);

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
		// $this->log_debug($file);
		// $this->log_debug($line);
		// $this->log_debug($row);
		preg_match("/$func\(([^;|\n]+);/m", $row, $matches);
		return array_map('trim', explode(',', preg_replace('/\)$/m', '', $matches[1] ?? '?')));
		// $this->log_debug($names);
		// return $names;
	}

	private function log_debug($val) {
		$marker = '[internal debugging]';
		$value = print_r($val, true);
		$log = PHP_EOL.$marker.PHP_EOL.str_repeat('~', strlen($marker)).PHP_EOL;
		$log .= preg_replace('/\n$/', '', $value);
		$log .= PHP_EOL.str_repeat('~', strlen($marker)).PHP_EOL;
		error_log($log);
	}
}
