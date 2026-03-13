(function () {
    var registerFormatType    = wp.richText.registerFormatType;
    var toggleFormat          = wp.richText.toggleFormat;
    var removeFormat          = wp.richText.removeFormat;
    var getActiveFormat       = wp.richText.getActiveFormat;
    var RichTextToolbarButton = wp.blockEditor.RichTextToolbarButton;
    var Modal                 = wp.components.Modal;
    var Popover               = wp.components.Popover;
    var Button                = wp.components.Button;
    var createElement         = wp.element.createElement;
    var useState              = wp.element.useState;
    var useEffect             = wp.element.useEffect;
    var useRef                = wp.element.useRef;
    var Fragment              = wp.element.Fragment;

    var FORMAT_NAME = 'custom/tooltip';

    function htmlEncode( str ) {
        return str
            .replace( /&/g,  '&amp;'  )
            .replace( /</g,  '&lt;'   )
            .replace( />/g,  '&gt;'   )
            .replace( /"/g,  '&quot;' );
    }

    function htmlDecode( str ) {
        var txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }

    function autoLink( str ) {
        // Externe links
        str = str.replace(
            /(?<![="'])(https?:\/\/[^\s<>"']+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        // Ankerlinks: #sectie-naam
        str = str.replace(
            /(?<![="'a-zA-Z0-9])(#[a-zA-Z][a-zA-Z0-9_-]*)/g,
            '<a href="$1">$1</a>'
        );
        return str;
    }

    function cleanPastedHtml( html ) {
        var div = document.createElement('div');
        div.innerHTML = html;

        function processNode( node ) {
            if ( node.nodeType === Node.TEXT_NODE ) return node.textContent;
            if ( node.nodeName === 'STYLE' || node.nodeName === 'SCRIPT' ) return '';
            if ( node.nodeName === 'A' ) {
                var href = node.getAttribute('href') || '';
                if ( href && href.match(/^https?:\/\//) ) {
                    var attrStr = '';
                    for ( var i = 0; i < node.attributes.length; i++ ) {
                        var attr = node.attributes[i];
                        attrStr += ' ' + attr.name + '="' + attr.value.replace(/"/g, '&quot;') + '"';
                    }
                    var text = Array.from( node.childNodes ).map( processNode ).join('');
                    return '<a' + attrStr + '>' + text + '</a>';
                }
                return Array.from( node.childNodes ).map( processNode ).join('');
            }
            var block = ['P','DIV','BR','LI','H1','H2','H3','H4','H5','H6'];
            var inner = Array.from( node.childNodes ).map( processNode ).join('');
            if ( block.indexOf( node.nodeName ) !== -1 ) return inner + '\n';
            return inner;
        }

        return Array.from( div.childNodes ).map( processNode ).join('').trim();
    }

    var icon = createElement('svg', {
        xmlns:          'http://www.w3.org/2000/svg',
        viewBox:        '0 0 24 24',
        width:          '20',
        height:         '20',
        fill:           'none',
        stroke:         'currentColor',
        strokeWidth:    '2',
        strokeLinecap:  'round',
        strokeLinejoin: 'round',
    },
        createElement('path', { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' })
    );

    function TooltipButton( props ) {
        var isActive = props.isActive;
        var value    = props.value;
        var onChange = props.onChange;

        var _useState1       = useState( false );
        var isModalOpen      = _useState1[0];
        var setIsModalOpen   = _useState1[1];

        var _useState2       = useState( '' );
        var tooltipInput     = _useState2[0];
        var setTooltipInput  = _useState2[1];

        var _useState3       = useState( false );
        var isPopoverOpen    = _useState3[0];
        var setIsPopoverOpen = _useState3[1];

        var _useState4       = useState( null );
        var popoverAnchor    = _useState4[0];
        var setPopoverAnchor = _useState4[1];

        var textareaRef = useRef( null );

        var currentFormat = getActiveFormat( value, FORMAT_NAME );
        var storedValue   = currentFormat && currentFormat.attributes
            ? ( currentFormat.attributes['data-tooltip'] || '' )
            : '';
        var decodedValue  = htmlDecode( storedValue );

        // Toon popover wanneer cursor in tooltip staat
        useEffect( function() {
            if ( isActive && ! isModalOpen ) {
                // Anker = huidige selectie-rectangle
                var sel = window.getSelection();
                if ( sel && sel.rangeCount > 0 ) {
                    var range = sel.getRangeAt(0);
                    var rect  = range.getBoundingClientRect();
                    if ( rect.width > 0 || rect.height > 0 ) {
                        // Fake anchor-object dat Popover begrijpt
                        setPopoverAnchor({
                            getBoundingClientRect: function() { return rect; },
                            ownerDocument: document,
                        });
                        setIsPopoverOpen( true );
                    }
                }
            } else if ( ! isActive ) {
                setIsPopoverOpen( false );
            }
        }, [ isActive ] );

        function openModal() {
            setTooltipInput( decodedValue );
            setIsPopoverOpen( false );
            setIsModalOpen( true );
        }

        function closeModal() {
            setIsModalOpen( false );
        }

        function handleToolbarClick() {
            if ( isActive ) {
                if ( isPopoverOpen ) {
                    setIsPopoverOpen( false );
                } else {
                    openModal();
                }
            } else {
                setTooltipInput( '' );
                setIsModalOpen( true );
            }
        }

        useEffect( function() {
            var el = textareaRef.current;
            if ( ! el ) return;

            function handlePaste( e ) {
                var clipboardData = e.clipboardData || window.clipboardData;
                if ( ! clipboardData ) return;
                var html = clipboardData.getData('text/html');
                if ( html && html.indexOf('<a ') !== -1 ) {
                    e.preventDefault();
                    var cleaned = cleanPastedHtml( html );
                    var start   = el.selectionStart;
                    var end     = el.selectionEnd;
                    var next    = el.value.substring(0, start) + cleaned + el.value.substring(end);
                    var nativeSet = Object.getOwnPropertyDescriptor( window.HTMLTextAreaElement.prototype, 'value' ).set;
                    nativeSet.call( el, next );
                    el.dispatchEvent( new Event('input', { bubbles: true }) );
                    setTimeout(function() {
                        el.selectionStart = el.selectionEnd = start + cleaned.length;
                    }, 0);
                }
            }

            el.addEventListener('paste', handlePaste);
            return function() { el.removeEventListener('paste', handlePaste); };
        }, [ isModalOpen ] );

        function applyTooltip() {
            if ( tooltipInput.trim() === '' ) {
                onChange( removeFormat( value, FORMAT_NAME ) );
            } else {
                onChange(
                    toggleFormat( value, {
                        type: FORMAT_NAME,
                        attributes: {
                            'class':        'tooltip',
                            'data-tooltip': htmlEncode( tooltipInput.trim() ),
                        },
                    })
                );
            }
            closeModal();
        }

        function removeTooltip() {
            onChange( removeFormat( value, FORMAT_NAME ) );
            setIsPopoverOpen( false );
            closeModal();
        }

        var previewText = decodedValue.replace(/<[^>]+>/g, '');
        if ( previewText.length > 80 ) previewText = previewText.substring(0, 80) + '…';

        return createElement( Fragment, null,

            createElement( RichTextToolbarButton, {
                icon:     icon,
                title:    'Tooltip toevoegen',
                onClick:  handleToolbarClick,
                isActive: isActive,
            }),

            // Popover verankerd aan selectie-rectangle
            isActive && isPopoverOpen && popoverAnchor && createElement( Popover, {
                anchor:       popoverAnchor,
                position:     'bottom center',
                onClose:      function() { setIsPopoverOpen( false ); },
                focusOnMount: false,
            },
                createElement( 'div', {
                    style: {
                        padding:  '12px 14px',
                        minWidth: '240px',
                        maxWidth: '320px',
                    }
                },
                    createElement( 'p', {
                        style: {
                            fontSize:     '13px',
                            lineHeight:   '1.5',
                            color:        '#1e1e1e',
                            marginBottom: '10px',
                            wordBreak:    'break-word',
                        }
                    }, previewText ),
                    createElement( 'div', { style: { display: 'flex', gap: '8px' } },
                        createElement( Button, {
                            variant: 'primary',
                            onClick: openModal,
                            style:   { fontSize: '12px' },
                        }, 'Bewerken' ),
                        createElement( Button, {
                            variant:       'tertiary',
                            isDestructive: true,
                            onClick:       removeTooltip,
                            style:         { fontSize: '12px' },
                        }, 'Verwijderen' )
                    )
                )
            ),

            isModalOpen && createElement( Modal, {
                title:          isActive ? 'Tooltip bewerken' : 'Tooltip toevoegen',
                onRequestClose: closeModal,
                style:          { width: '540px' },
            },
                createElement( 'p', {
                    style: { marginBottom: '8px', fontSize: '12px', color: '#757575' }
                }, 'Typ of plak de tooltiptekst. Hyperlinks blijven automatisch bewaard.' ),

                createElement( 'textarea', {
                    ref:      textareaRef,
                    value:    tooltipInput,
                    onChange: function( e ) { setTooltipInput( e.target.value ); },
                    onInput:  function( e ) { setTooltipInput( e.target.value ); },
                    rows:     6,
                    autoFocus: true,
                    style: {
                        width:        '100%',
                        padding:      '10px 12px',
                        fontSize:     '14px',
                        lineHeight:   '1.6',
                        border:       '1px solid #949494',
                        borderRadius: '2px',
                        resize:       'vertical',
                        boxSizing:    'border-box',
                        fontFamily:   'inherit',
                        marginBottom: '12px',
                    },
                }),

                tooltipInput.trim() && createElement( 'div', null,
                    createElement( 'p', {
                        style: { fontSize: '11px', fontWeight: '600', color: '#757575', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }
                    }, 'Voorbeeld' ),
                    createElement( 'div', {
                        dangerouslySetInnerHTML: { __html: tooltipInput },
                        style: {
                            background:   '#f6f7f7',
                            border:       '1px solid #e0e0e0',
                            borderRadius: '2px',
                            padding:      '10px 12px',
                            fontSize:     '13px',
                            lineHeight:   '1.6',
                            color:        '#1e1e1e',
                            marginBottom: '16px',
                            wordBreak:    'break-word',
                        },
                    })
                ),

                createElement( 'div', {
                    style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }
                },
                    isActive && createElement( Button, {
                        variant:       'tertiary',
                        isDestructive: true,
                        onClick:       removeTooltip,
                    }, 'Verwijderen' ),
                    createElement( Button, {
                        variant: 'secondary',
                        onClick: closeModal,
                    }, 'Annuleren' ),
                    createElement( Button, {
                        variant: 'primary',
                        onClick: applyTooltip,
                    }, 'Toepassen' )
                )
            )
        );
    }

    registerFormatType( FORMAT_NAME, {
        title:     'Tooltip',
        tagName:   'span',
        className: 'tooltip',

        attributes: {
            'class':        'class',
            'data-tooltip': 'data-tooltip',
        },

        edit: function( props ) {
            return createElement( TooltipButton, props );
        },
    });
})();
