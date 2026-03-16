<?php
/**
 * Plugin Name: SFP Tooltip
 * Description: Voegt een tooltip-knop toe aan de Gutenberg inline-toolbar. Geselecteerde tekst wordt gewrapped in <span class="tooltip" data-tooltip="...">. Laadt ook de frontend-JS voor de tooltip-weergave.
 * Version:     1.3.1
 * Author:      School for Professionals
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'SFP_TOOLTIP_VERSION', '1.3.1' );

// ── Auto-updater via GitHub Releases ─────────────────────────────────────────
require_once plugin_dir_path( __FILE__ ) . 'sfp-tooltip-updater.php';
new SFP_Tooltip_Updater( __FILE__, SFP_TOOLTIP_VERSION );

// ── WordPress toestaan om data-tooltip attribuut op span te bewaren ──────────
add_filter( 'wp_kses_allowed_html', function( $tags, $context ) {
    if ( $context === 'post' ) {
        if ( ! isset( $tags['span'] ) ) {
            $tags['span'] = [];
        }
        $tags['span']['class']        = true;
        $tags['span']['data-tooltip'] = true;
    }
    return $tags;
}, 10, 2 );

// ── Editor: toolbar-knop + editor-markering ──────────────────────────────────
add_action( 'enqueue_block_editor_assets', function () {
    wp_enqueue_script(
        'sfp-tooltip-format',
        plugin_dir_url( __FILE__ ) . 'tooltip-format.js',
        [ 'wp-rich-text', 'wp-block-editor', 'wp-element', 'wp-data', 'wp-components' ],
        SFP_TOOLTIP_VERSION,
        true
    );
    wp_enqueue_style(
        'sfp-tooltip-editor',
        plugin_dir_url( __FILE__ ) . 'editor-style.css',
        [],
        SFP_TOOLTIP_VERSION
    );
} );

// ── Frontend: tooltip-weergave JS + merkspecifieke CSS ───────────────────────
add_action( 'wp_enqueue_scripts', function () {
    wp_enqueue_script(
        'sfp-tooltip-frontend',
        plugin_dir_url( __FILE__ ) . 'tooltip-frontend.js',
        [],
        SFP_TOOLTIP_VERSION,
        true
    );
} );

add_action( 'wp_head', function () {
    $css = get_option( 'sfp_tooltip_css', '' );
    if ( ! empty( trim( $css ) ) ) {
        echo '<style id="sfp-tooltip-css">' . wp_strip_all_tags( $css ) . '</style>' . "\n";
    }
} );

// ── Settings-pagina ───────────────────────────────────────────────────────────
add_action( 'admin_menu', function () {
    add_options_page(
        'SFP Tooltip',
        'SFP Tooltip',
        'manage_options',
        'sfp-tooltip',
        'sfp_tooltip_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'sfp_tooltip', 'sfp_tooltip_css', [
        'sanitize_callback' => 'wp_strip_all_tags',
        'default'           => '',
    ] );
} );

// Instellingen-link in de pluginlijst
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
    $settings_link = '<a href="' . admin_url( 'options-general.php?page=sfp-tooltip' ) . '">Instellingen</a>';
    array_unshift( $links, $settings_link );
    return $links;
} );

function sfp_tooltip_settings_page() {
    ?>
    <div class="wrap">
        <h1>SFP Tooltip — Instellingen</h1>
        <p style="color:#666; margin-bottom: 20px;">Plak hier de merkspecifieke CSS voor de tooltip-weergave op de frontend. Deze stijl wordt in de <code>&lt;head&gt;</code> van elke pagina geladen.</p>
        <form method="post" action="options.php">
            <?php settings_fields( 'sfp_tooltip' ); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="sfp_tooltip_css">Tooltip CSS</label></th>
                    <td>
                        <textarea
                            id="sfp_tooltip_css"
                            name="sfp_tooltip_css"
                            rows="20"
                            style="width:100%; font-family:monospace; font-size:13px;"
                        ><?php echo esc_textarea( get_option( 'sfp_tooltip_css', '' ) ); ?></textarea>
                    </td>
                </tr>
            </table>
            <?php submit_button( 'Opslaan' ); ?>
        </form>
    </div>
    <?php
}
