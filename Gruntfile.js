module.exports = function(grunt) {
    'use strict';

    process.env['mocha-json-spec-dest'] = './coverage/result.json';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';',
            },
            dist: {
                src: [
                    'src/alia.js',
                    'src/url.js',
                    'src/utils.js',
                    'src/components/*.js',
                    'src/providers/jquery.js',
                    'src/providers/window.js',
                    'src/providers/location.js',
                    'src/providers/localStorage.js',
                    'src/providers/route.js',
                    'src/providers/request.js'
                ],
                dest: 'dist/alia.js',
            },
        },
        jshint: {
            files: {
                src: ['src/*.js',
                    'src/providers/*.js',
                    'src/components/*.js'
                ],
                globals: {
                    $: true,
                    Spinner: true,
                    Markdown: true,
                    d3: true,
                    process: true,
                    _: true,
                    WebKitMutationObserver: true
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'dist/<%= pkg.name %>.js',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        mocha_phantomjs: {
            all: ['test/*.html']
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');

    // Default task(s).
    grunt.registerTask('test', ['mocha_phantomjs']);
    grunt.registerTask('default', ['concat', 'uglify', 'test']);
};