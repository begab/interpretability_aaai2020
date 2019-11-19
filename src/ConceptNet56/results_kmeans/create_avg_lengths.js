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

const directory_with_results = './each_base/';
const NUM_BASES = 1000;
const fname     = "avg_lengths.txt";

/*****************************************************************************/

my_worker(function (err) {
	if (err) throw err;
	//console.log("DONE");
});

/*****************************************************************************/

function my_worker(callback) {
	var i;
	var results   = {};
	results.hack  = "Something";
	results.base_info = [];
	for (i = 0; i < NUM_BASES; i++) {
		results.base_info.push({'base': i, 'content': null});
	}

	fs.readdir(directory_with_results, function (err, files) {
		if (err) throw err;
		//console.log(files.length);
		//console.log(files);
		read_and_store_file_contents(files, results, function (err2) {
			if (err2) throw err2;
			//console.log(JSON.stringify(results.base_info[1].content));

			var my_text  = "";
			var top_wins = 0;
			var bot_wins = 0;
			var top_bot_ties = 0;
			for (i = 0; i < NUM_BASES; i++) {
				if (results.base_info[i].content !== null) {
					// We have information about this base
					assert.ok(i === results.base_info[i].base);
					assert.ok(results.base_info[i].content.length === 2);
					assert.ok(results.base_info[i].content[0][0].kind === "bot_words");
					assert.ok(results.base_info[i].content[1][0].kind === "top_words");
					var sum_bot = calculate_sum_of_path_lengths(results.base_info[i].content[0]);
					var sum_top = calculate_sum_of_path_lengths(results.base_info[i].content[1]);
					
					if (sum_top < sum_bot) {
						top_wins += 1;
					} else if (sum_top === sum_bot) {
						top_bot_ties += 1;
					} else {
						bot_wins += 1;
					}

					my_text += "" + i + " " + (sum_top * 1.0/45.0).toFixed(3) + " " + (sum_bot * 1.0/45.0).toFixed(3) + "\n";
				}
			}

			fs.writeFile(fname, my_text, 'utf8', function (err3) {
				assert.ok(err3 === null);
				console.log('Created a file with the average path lengths');

				var total = top_wins + bot_wins + top_bot_ties;
				console.log("top wins: " + top_wins + " (" + (top_wins *100.0 / (1.0 * total)).toFixed(2) + "%)");
				console.log("bot wins: " + bot_wins + " (" + (bot_wins *100.0 / (1.0 * total)).toFixed(2) + "%)");
				console.log("ties    : " + top_bot_ties + " (" + (top_bot_ties *100.0 / (1.0 * total)).toFixed(2) + "%)");

				callback(err3);
			});
		});
	});
}

/*****************************************************************************/

function calculate_sum_of_path_lengths (some_sols) {
	var i;
	var sum = 0;
	assert.ok(some_sols.length === 45);

	for (i = 0; i < some_sols.length; i++) {
		sum += some_sols[i].sol.path.length - 1;
	}
	return sum;
}

/*****************************************************************************/

function read_and_store_file_contents (list_of_files, storage, callback) {
	var current_file;
	var rest_files;

	if (list_of_files.length === 0) {
		callback(null);
	} else {
		current_file = list_of_files[0];
		rest_files   = list_of_files.slice(1);

		fs.readFile(directory_with_results + current_file, {encoding: 'utf8', flag: 'r'}, function (err_file, data_file) {
			// Decompose the file name
			var the_base_str = current_file.substr(5, current_file.length - 10);
			var the_base     = parseInt(the_base_str);
			assert.ok(storage.base_info[the_base].base === the_base);
			storage.base_info[the_base].content = JSON.parse(data_file);

			read_and_store_file_contents(rest_files, storage, function (deeper_error) {
				callback(deeper_error);
			});
		});
	}
}

/*****************************************************************************/
