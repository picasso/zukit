<?php

trait zusnippets_Featured {

    private $random_attachment_id = null;

	public function get_featured_from_posts($posts) {
		$ids = [];
		if(empty($posts)) return $ids;

		foreach($posts as $post) {
			$post_id = $post instanceof WP_Post ? $post->ID : $post;
			$attachment_id = $this->get_attachment_id($post_id);
			if(!empty($attachment_id)) $ids[] = $attachment_id;
		}
		return $ids;
	}

	public function get_featured_attachment_id($post_id = null) {
		// if there is no featured_attachment - use it from $this->random_attachment_id
		// if $post_id = -1 then simply return 'random_attachment_id'
		if($post_id == -1) return $this->random_attachment_id;

		$attachment_id = get_post_thumbnail_id($post_id);
		$attachment_id = (empty($attachment_id) && !empty($this->random_attachment_id)) ? $this->random_attachment_id : $attachment_id;
		return $attachment_id;
	}

	public function set_random_featured_attachment_id($post_id = null, $gallery = null, $only_landscape = false) {
		$gallery = empty($gallery) ? $this->get_post_gallery($post_id) : $gallery;
		$ids = empty($gallery) ? [] : (isset($gallery['ids']) ? wp_parse_id_list($gallery['ids']) : $gallery);

		$this->random_attachment_id = null;

		if(!empty($ids) && is_array($ids)) {
			if($only_landscape) {
                // because if the ZuMedia plugin did not register the 'get_all_landscaped' method it will return null
				$landscaped = array_values(array_intersect($ids, $this->get_all_landscaped() ?? $ids));
				if(empty($landscaped)) $landscaped = $ids;
				$this->random_attachment_id = (int)$landscaped[rand(0, count($landscaped) - 1)];
			} else {
				$this->random_attachment_id = (int)$ids[rand(0, count($ids) - 1)];
			}
		}
		return $this->random_attachment_id;
	}

    // NOTE:  unfinished, потому что непонятно зачем тут [select]
    public function maybe_set_random_featured_image($custom_query_args = []) {
		global $wp_query;

		$ids = [];
		if(empty($custom_query_args) && isset($wp_query->queried_object))	{
			// maybe we have a regular featured image
			$attachment_id = get_post_thumbnail_id($wp_query->queried_object->ID);
			if(!empty($attachment_id)) return;

			$content = isset($wp_query->queried_object->post_content) ? trim($wp_query->queried_object->post_content) : '';
            $content = trim(str_replace('[/select]', '', $content)); 	// remove closing shortcode tag

            // we have only one [select*] shortcode inside
			if(preg_match('/^\[\s*select[^\]]*\]$/i', $content)) {
				$ids = do_shortcode(str_replace(']', ' ids_only=true]', $content));
				$ids = $this->get_featured_from_posts(wp_parse_id_list($ids));
			}

		} else if(is_array($custom_query_args) && !empty($custom_query_args)) {

			$default_args = [
		        'post_type' 		=> get_post_type(),
		        'posts_per_page' 	=> -1,
		        'fields'			=> 'ids',
		        'post_status'		=> 'publish',
		    ];
			$args = array_merge($default_args, $custom_query_args);

			$custom_query = new WP_Query($args);
			$ids = $this->get_featured_from_posts($custom_query->posts);
		}

		if(!empty($ids)) {
			$this->set_random_featured_attachment_id(null, $ids);
		}
	}
}
