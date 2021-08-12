<?php
trait zusnippets_Inline {

    private $inline_style = [];
	private $admin_style = [];
    private $inline_script = [];
	private $admin_script = [];

	private $fonts = [];
    // set 'false' for debuging
    private $minify_fonts = true;

    private function init_inline_style_scripts() {
        if(is_admin()) {
            add_action('admin_footer', [$this, 'maybe_add_inline_style']);
            add_action('admin_footer', [$this, 'maybe_add_inline_script']);
        } else {
            add_action('wp_footer', [$this, 'maybe_add_inline_style']);
            add_action('wp_footer', [$this, 'maybe_add_inline_script']);
        }
    }

    // Inline styles to the footer --------------------------------------------]

	public function add_inline_style($name, $style, $css_file = null, $minify = true, $is_admin = false) {
        if($css_file && file_exists($css_file)) {
    		$style = file_get_contents($css_file);
        }
        // if there is no selector or empty $style then do nothing
		if(!empty($name) && !empty(trim($style))) {
            if($is_admin) $this->admin_style[] = ['name' => $name, 'style' => $style, 'minify' => $minify];
			else $this->inline_style[] = ['name' => $name, 'style' => $style, 'minify' => $minify];
		}
	}

	public function add_admin_inline_style($name, $style, $css_file = null, $minify = true) {
        $this->add_inline_style($name, $style, $css_file, $minify, true);
	}

	public function add_inline_fonts_style($font_list, $dir, $uri) {
		if(is_array($font_list)) $this->fonts['list'] = $font_list;
		if(!empty($dir)) $this->fonts['dir'] = $dir;
		if(!empty($uri)) $this->fonts['uri'] = $uri;

		$this->fonts = array_merge([
            'list'  => [],
            'dir'   => '',
            'uri'   => ''
        ], $this->fonts);
	}

	public function add_inline_style_from_file($css_file) {
		$this->add_inline_style('_responsive', null, $css_file);
	}

    // Inline script to the footer --------------------------------------------]

	public function add_inline_script($script_code, $js_file = null, $minify = true, $is_admin = false) {
        if($js_file && file_exists($js_file)) {
            $script_code = file_get_contents($js_file);
        }
        // if there is no code then do nothing
        if(!empty($script_code)) {
            if($is_admin) $this->admin_script[] = ['script' => $script_code, 'minify' => $minify];
			else $this->inline_script[] = ['script' => $script_code, 'minify' => $minify];
		}
	}

	public function add_admin_inline_script($script_code, $js_file = null, $minify = true) {
        $this->add_inline_script($script_code, $js_file, $minify, true);
	}

    // Print inline styles & scripts ------------------------------------------]

	public function maybe_add_inline_style() {

		$inline_style = '';
        if(is_admin()) {
    		foreach($this->admin_style as $style_data) {
    			// if '_responsive' then insert CSS without processing
    			if(stripos($style_data['name'], '_responsive') !== false) $style = $style_data['style'];
    			else $style = sprintf('%1$s { %2$s}', $style_data['name'], $style_data['style']);
                $inline_style .= $style_data['minify'] ? $this->minify_css($style) : $style;
    		}
        } else {

    		foreach($this->inline_style as $style_data) {
    			// if '_responsive' then insert CSS without processing
    			if(stripos($style_data['name'], '_responsive') !== false) $style = $style_data['style'];
    			else $style = sprintf('%1$s { %2$s}', $style_data['name'], $style_data['style']);
                $inline_style .= $style_data['minify'] ? $this->minify_css($style) : $style;
    		}

    		if(!empty($this->fonts)) {
                $fonts_style = '';
    			foreach($this->fonts['list'] as $page => $file) {
    				if(is_page($page)) {
    					$filename = $this->fonts['dir'].$file;
    					if(file_exists($filename)) {
    						$fonts_style .= preg_replace('/%%path%%/i', $this->fonts['uri'], file_get_contents($filename));
    					}
    				}
    			}
                $inline_style .= $this->minify_fonts ? $this->minify_css($fonts_style) : $fonts_style;
    		}
        }

    	if(!empty(trim($inline_style))) {
    		printf('<style type="text/css" id="zu-inline-style">%1$s</style>', $inline_style);
    	}
    }

    public function maybe_add_inline_script() {
		$scripts = [];
        if(is_admin()) {
    		foreach($this->admin_script as $data) {
    			$scripts[] = sprintf("%s\n", $data['minify'] ? $this->minify_js($data['script']) : $data['script']);
    		}
        } else {
    		foreach($this->inline_script as $data) {
                $scripts[] = sprintf("%s\n", $data['minify'] ? $this->minify_js($data['script']) : $data['script']);
    		}
        }
    	if(!empty($scripts)) {
            $scripts = sprintf('document.addEventListener("DOMContentLoaded", function() {%s})', implode('', $scripts));
    		printf('<script type="text/javascript" id="zu-inline-script">%1$s</script>', $scripts);
    	}
    }
}
