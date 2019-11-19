/*****************************************************************************/
/*jshint esversion: 6 */
// jshint trailingcomma: false
// jshint undef:true
// jshint unused:true
/* jshint node:true */
/*****************************************************************************/

const fs        = require('fs');
//const async     = require('async');
const assert    = require('assert-plus');
//var MongoClient = require('mongodb').MongoClient;

/*****************************************************************************/

const fname = "./avg_lengths.txt";
const NUM_BASES = 1000;

/*****************************************************************************/

fs.readFile(fname, {encoding: 'utf8', flag: 'r'}, function (err, data) {
	//console.log(data);
	var lines = data.split('\n');
	//console.log(lines);
	var i;
	var contents = [];
	for (i = 0; i < NUM_BASES; i++) {
		contents.push({'i': i, 'top': null, 'bot': null});
	}
	for (i = 0; i < lines.length; i++) {
		var current_line = lines[i].split(' ');
		var current_base = parseInt(current_line[0]);
		var current_top  = parseFloat(current_line[1]);
		var current_bot  = parseFloat(current_line[2]);
		contents[current_base].top = current_top;
		contents[current_base].bot = current_bot;
	}
	// Loaded the values into memory

	var max_avg_top_length_not_losing = -1;
	var max_avg_top_length_not_losing_index = -1;
	var min_index = -1;
	var min_value = null;
	var is_winning = true;
	while (is_winning === true) {
		// Find the minimum among the bases that have survived
		// first initialization
		for (i = 0; i < NUM_BASES; i++) {
			if (contents[i].top !== null) {
				min_index = i;
				min_value = contents[i].top;
				break;
			}
		}
		// now compute the actual minimum
		assert.ok(min_index >= 0);
		for (i = min_index + 1; i < NUM_BASES; i++) {
			if ((contents[i].top !== null) && (contents[i].top < min_value)) {
				min_index = i;
				min_value = contents[i].top;
			}
		}
		// Now we know the minimum, so check if all copies of this value are winning
		//console.log("min index: " + min_index + " with min value: " + min_value);
		for (i = 0; i < NUM_BASES; i++) {
			if ((contents[i].top !== null) && (contents[i].top === min_value)) { 
				if (contents[i].top > contents[i].bot) {
					is_winning = false;
				}
				contents[i].top = null;
				contents[i].bot = null;
			}
		}
		if (is_winning === true) {
			// All the instances of this value were winning, so update the relevant variable
			max_avg_top_length_not_losing       = min_value;
			max_avg_top_length_not_losing_index = min_index;
		}
	}

	console.log("Base " + min_index + " has the largest avg path length (" + min_value + ") not losing to bottom");
});


/*****************************************************************************/
