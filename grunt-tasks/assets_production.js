module.exports = function(grunt) {
   grunt.registerTask('build',
   [
      'cssmin:plugin',
      'uglify:plugin'
   ]);
};
