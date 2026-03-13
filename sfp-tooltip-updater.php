<?php
/**
 * SFP Tooltip — GitHub Auto-updater
 * Controleert GitHub Releases op updates en maakt ze beschikbaar via het
 * standaard WordPress plugin-updatemechanisme.
 *
 * Gebruik: vervang GITHUB_USER en GITHUB_REPO als de repo anders heet.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class SFP_Tooltip_Updater {

    private $plugin_slug;
    private $plugin_file;
    private $plugin_version;
    private $github_user = 'stephan-sfp';          // ← jouw GitHub-gebruikersnaam
    private $github_repo = 'sfp-tooltip-plugin';   // ← naam van de repo

    public function __construct( $plugin_file, $plugin_version ) {
        $this->plugin_file    = $plugin_file;
        $this->plugin_slug    = plugin_basename( $plugin_file );
        $this->plugin_version = $plugin_version;

        add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'check_update' ] );
        add_filter( 'plugins_api',                           [ $this, 'plugin_info' ], 10, 3 );
        add_filter( 'upgrader_post_install',                 [ $this, 'after_install' ], 10, 3 );
    }

    private function get_latest_release() {
        $transient_key = 'sfp_tooltip_github_release';
        $cached        = get_transient( $transient_key );
        if ( $cached ) return $cached;

        $url      = "https://api.github.com/repos/{$this->github_user}/{$this->github_repo}/releases/latest";
        $response = wp_remote_get( $url, [
            'timeout' => 10,
            'headers' => [ 'Accept' => 'application/vnd.github.v3+json' ],
        ] );

        if ( is_wp_error( $response ) ) return false;

        $body = json_decode( wp_remote_retrieve_body( $response ) );
        if ( empty( $body->tag_name ) ) return false;

        // Verwijder 'v' prefix als aanwezig (v1.3.0 → 1.3.0)
        $body->version = ltrim( $body->tag_name, 'v' );

        // Zoek zipball in assets of gebruik de standaard GitHub zipball
        $body->zip_url = $body->zipball_url;
        foreach ( (array) $body->assets as $asset ) {
            if ( substr( $asset->name, -4 ) === '.zip' ) {
                $body->zip_url = $asset->browser_download_url;
                break;
            }
        }

        set_transient( $transient_key, $body, 12 * HOUR_IN_SECONDS );
        return $body;
    }

    public function check_update( $transient ) {
        if ( empty( $transient->checked ) ) return $transient;

        $release = $this->get_latest_release();
        if ( ! $release ) return $transient;

        if ( version_compare( $this->plugin_version, $release->version, '<' ) ) {
            $transient->response[ $this->plugin_slug ] = (object) [
                'slug'        => dirname( $this->plugin_slug ),
                'plugin'      => $this->plugin_slug,
                'new_version' => $release->version,
                'url'         => "https://github.com/{$this->github_user}/{$this->github_repo}",
                'package'     => $release->zip_url,
            ];
        }

        return $transient;
    }

    public function plugin_info( $result, $action, $args ) {
        if ( $action !== 'plugin_information' ) return $result;
        if ( ! isset( $args->slug ) || $args->slug !== dirname( $this->plugin_slug ) ) return $result;

        $release = $this->get_latest_release();
        if ( ! $release ) return $result;

        return (object) [
            'name'          => 'SFP Tooltip',
            'slug'          => dirname( $this->plugin_slug ),
            'version'       => $release->version,
            'author'        => 'School for Professionals',
            'homepage'      => "https://github.com/{$this->github_user}/{$this->github_repo}",
            'download_link' => $release->zip_url,
            'sections'      => [
                'description' => $release->body ?? '',
            ],
        ];
    }

    public function after_install( $response, $hook_extra, $result ) {
        global $wp_filesystem;

        // Zorg dat de map na installatie altijd 'sfp-tooltip' heet
        if ( isset( $hook_extra['plugin'] ) && $hook_extra['plugin'] === $this->plugin_slug ) {
            $plugin_dir = WP_PLUGIN_DIR . '/sfp-tooltip';
            $wp_filesystem->move( $result['destination'], $plugin_dir );
            $result['destination'] = $plugin_dir;
            activate_plugin( $this->plugin_slug );
        }

        return $result;
    }
}
