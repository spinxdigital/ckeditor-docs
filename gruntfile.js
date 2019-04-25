/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

'use strict';

const Umberto = require( 'umberto' );
const webpackConfigs = {
	rect: require( './react/webpack.config.js' ),
	angular: require( './angular/webpack.config.js' )
};

module.exports = function( grunt ) {
	const packageVersion = grunt.file.readJSON( 'package.json' ).version;

	require( 'load-grunt-tasks' )( grunt );
	grunt.loadTasks( 'dev/tasks' );

	grunt.registerTask( 'api', [ 'jsduck:api' ] );
	grunt.registerTask( 'umberto', function() {
		const done = this.async();

		const skipApi = grunt.option( 'skipApi' );
		const skipValidation = grunt.option( 'skipValidation' );
		const dev = grunt.option( 'dev' );
		const clean = grunt.option( 'clean' );

		return Umberto.buildSingleProject( {
			skipApi,
			skipValidation,
			dev,
			clean
		} )
			.then( () => { done() } )
			.catch( err => {
				grunt.log.error( `Building Documentation failed: ${ err }` );
				done();
			} );
	} );

	grunt.registerTask( 'prepare-examples', function() {
		const buildSdk = require( './scripts/buildsdk' );

		const done = this.async();
		return buildSdk
			.then( () => {
				done();
			} )
			.catch( err => {
				if ( err ) {
					process.exitCode = 1;
					grunt.log.error( `Building Documentation failed: ${ err }` );
				}
			} );
	} );

	grunt.registerTask( 'fix-scayt-docs', function() {
		const done = this.async();
		const scaytMap = grunt.file.readJSON( 'scayturls.json' );
		var file = grunt.file.read( 'docs/api/data/CKEDITOR.config.json' );

		for ( const key in scaytMap ) {
			file = file.replace( new RegExp( '@@' + key , 'g' ), scaytMap[ key ] );
		}

		grunt.file.write( 'docs/api/data/CKEDITOR.config.json', file );

		done();
	} );

	//Register task to enable/disable --force flag, because angular has circullar dependecies, which can't be fixed on our side.
	grunt.registerTask( 'force-on',
		'set option force to true',
		function() {
			if ( !grunt.option( 'force' ) ) {
				grunt.config.set( 'usetheforce_set', true );
				grunt.option( 'force', true );
			}
		} );
	grunt.registerTask( 'force-off',
		'set option force to false',
		function() {
			if ( grunt.config.get( 'usetheforce_set' ) ) {
				grunt.option( 'force', false );
			}
		} );

	grunt.registerTask( 'build-integrations', [ 'force-on', 'webpack:angular', 'webpack:react', 'force-off' ] );
	grunt.registerTask( 'docs', [ 'api', 'fix-scayt-docs', 'prepare-examples','build-integrations', 'umberto' ] );
	grunt.registerTask( 'docs-serve', [ 'api', 'fix-scayt-docs', 'prepare-examples', 'build-integrations', 'umberto', 'connect' ] );

	grunt.initConfig( {
		path: grunt.option( 'path' ) || getCKEditorPath(),

		jsduck: {
			api: {
				src: [
					'<%= path %>/core',
					'<%= path %>/plugins',
					'<%= path %>/adapters',
					'<%= path %>/ckeditor.js',

					'repos/ckeditor-plugin-scayt',
					'repos/ckeditor-plugin-wsc'
				],

				cmd: 'ckeditor-jsduck',

				options: {
					tags: 'source/customs.rb',
					warnings: [ '-nodoc', '-image_unused' ],
					output: 'docs/api/data',
					export: 'full',
					external: 'Blob,File,FileReader,DocumentFragment',
					exclude: '<%= path %>/plugins/codesnippet/lib',
					'ignore-html': 'source'
				}
			}
		},

		docs: {
			options: {
				skipApi: false,
				skipValidation: false,
				dev: false,
				clean: true
			}
		},

		'docs-serve': {
			options: {
				skipApi: false,
				skipValidation: false,
				dev: false,
				clean: true
			}
		},

		connect: {
			server: {
				options: {
					port: 9001,
					base: 'build/docs',
					keepalive: true,
					open: 'http://localhost:9001/ckeditor4/' + packageVersion + '/guide/dev_installation.html'
				}
			}
		},

		webpack: {
			react: webpackConfigs.react,
			angular: webpackConfigs.angular
		}
	} );

	// SEO is on by default, unless disabled via command–line `--seo false`.
	// This option is set here because JSDuck does not simply accept `seo: false` in config.
	if ( grunt.option( 'seo' ) !== false ) {
		grunt.config( 'jsduck.docs.options.seo', true );
	}

	function getCKEditorPath() {
		grunt.log.writeln( 'CKEditor Documentation Builder v' + packageVersion + '.' );

		var ckeditorPath = 'repos/ckeditor-presets/ckeditor';

		if ( process.env.CKEDITOR_DEV ) {
			grunt.log.writeln( '[i] Using CKEditor directory from CKEDITOR_DEV env variable.' );

			ckeditorPath = process.env.CKEDITOR_DEV;
		} else {
			grunt.log.writeln( '[i] CKEDITOR_DEV env variable not set. Looking for', '../ckeditor-dev...'[ 'cyan' ] );

			if ( grunt.file.exists( '../ckeditor-dev/ckeditor.js' ) ) {
				grunt.log.writeln( '[i] Directory', '../ckeditor-dev'[ 'cyan' ], 'found!' );
				ckeditorPath = '../ckeditor-dev';
			} else {
				grunt.log.writeln( '[i] CKEditor directory not found.' );
			}
		}

		grunt.log.writeln( '[i] Using', ckeditorPath[ 'cyan' ], 'as source directory.' );

		return ckeditorPath;
	}
};
