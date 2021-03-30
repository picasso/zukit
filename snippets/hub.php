<?php
include_once('traits/classes.php');
include_once('traits/content.php');
include_once('traits/date.php');
include_once('traits/inline.php');
include_once('traits/lang.php');
include_once('traits/loader.php');
include_once('traits/minify.php');
include_once('traits/slugs.php');
include_once('traits/thumbnails.php');
include_once('traits/useful.php');

class zukit_Snippets extends zukit_SingletonLogging {

	use zusnippets_Classes,
		zusnippets_Content,
		zusnippets_Date,
		zusnippets_InlineStyle,
		zusnippets_Lang,
		zusnippets_Loader,
		zusnippets_Minify,
		zusnippets_Slugs,
		zusnippets_Thumbnails,
		zusnippets_Useful;

	protected function construct_more() {
		$this->prefix = 'zu_snippets';
        $this->version = '1.1.6';
		$this->init_advanced_style();
	}
}

// Common Interface to helpers ------------------------------------------------]

if(!function_exists('zu_snippets')) {
	function zu_snippets() {
		return zukit_Snippets::instance();
	}
}

// A special version of the 'sprintf' function that removes the extra spaces
// from the format string resulting from the 'human-readable' HTML template

if(!function_exists('zu_sprintf')) {
	function zu_sprintf($format, ...$params) {
		// remove multiple space inside tags
		if(preg_match_all('/(<[^>]+?>)/', $format, $matches)) {
			  foreach($matches[1] as $tag) {
			      $tag_compressed = preg_replace('/\s+/', ' ', $tag);
			      $format = str_replace($tag, $tag_compressed, $format);
			  }
		  }
		// remove empty space between tags
		$format = preg_replace('/>\s+</', '><', $format);
		// remove empty space after format directive and before opening tag
		$format = preg_replace('/\$s\s+</', '$s<', $format);
		// remove empty space after closing tag and before format directive
		$format = preg_replace('/>\s+\%/', '>%', $format);

		array_unshift($params, $format);
		return call_user_func_array('sprintf', $params);
	}

	function zu_printf(...$params) {
		$output = call_user_func_array('zu_sprintf', $params);
		print($output);
	}
}


if(!function_exists('_zlg')) {
    function _zlg(...$params) {
        if(count($params) === 2 && is_string($params[1]) && substr($params[1], 0, 1) === '$') {
            zukit_Singleton::log_with_context($params[1], $params[0], 0);

        } else {
            zukit_Singleton::log_with_context(null, $params, 0);
        }
    }
}
