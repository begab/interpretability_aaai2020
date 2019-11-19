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
const fname_top = "network_stats_top.txt";
const fname_bot = "network_stats_bot.txt";

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

			var my_text_top = "";
			var my_text_bot = "";
			var top_smaller = {
				'min': 0,
				'max': 0,
				'avg': 0,
				'median': 0
			};
			var bot_smaller = {
				'min': 0,
				'max': 0,
				'avg': 0,
				'median': 0
			};
			var top_bot_ties = {
				'min': 0,
				'max': 0,
				'avg': 0,
				'median': 0
			};
			for (i = 0; i < NUM_BASES; i++) {
				//process.stdout.write("\ri: " + i);
				if (results.base_info[i].content !== null) {
					// We have information about this base
					assert.ok(i === results.base_info[i].base);
					assert.ok(results.base_info[i].content.length === 2);
					assert.ok(results.base_info[i].content[0][0].kind === "bot_words");
					assert.ok(results.base_info[i].content[1][0].kind === "top_words");
					var stats_bot = calculate_network_statistics(results.base_info[i].content[0]);
					var stats_top = calculate_network_statistics(results.base_info[i].content[1]);
					
					//console.log('results below:');
					//console.log(JSON.stringify(stats_bot));
					//console.log(JSON.stringify(stats_top));
					//console.log('end of results');

					// take care of min 
					if (stats_bot.min < stats_top.min) 			bot_smaller.min += 1;
					else if (stats_bot.min === stats_top.min) 	top_bot_ties.min += 1;
					else {
						assert.ok(stats_bot.min > stats_top.min);
						top_smaller.min += 1;
					}

					// take care of max
					if (stats_bot.max < stats_top.max) 			bot_smaller.max += 1;
					else if (stats_bot.max === stats_top.max) 	top_bot_ties.max += 1;
					else {
						assert.ok(stats_bot.max > stats_top.max);
						top_smaller.max += 1;
					}

					// take care of median
					if (stats_bot.median < stats_top.median) 		bot_smaller.median += 1;
					else if (stats_bot.median === stats_top.median) top_bot_ties.median += 1;
					else {
						assert.ok(stats_bot.median > stats_top.median);
						top_smaller.median += 1;
					}

					// take care of average
					if (stats_bot.sum < stats_top.sum) 			bot_smaller.avg += 1;
					else if (stats_bot.sum === stats_top.sum) 	top_bot_ties.avg += 1;
					else {
						assert.ok(stats_bot.sum > stats_top.sum, 'stats_bot.sum: ' + stats_bot.sum + ', stats_top.sum: ' + stats_top.sum );
						top_smaller.avg += 1;
					}

					my_text_bot += "" + i + " " + stats_bot.min + " " + stats_bot.median + " " + (stats_bot.avg).toFixed(1) + " " + stats_bot.max + "\n";
					my_text_top += "" + i + " " + stats_top.min + " " + stats_top.median + " " + (stats_top.avg).toFixed(1) + " " + stats_top.max + "\n";
				}
			}
			//process.stdout.write("\r * DONE!\n");

			fs.writeFile(fname_bot, my_text_bot, 'utf8', function (err3) {
				assert.ok(err3 === null);
				console.log('Created a file with statistics for bottom called ' + fname_bot);

				fs.writeFile(fname_top, my_text_top, 'utf8', function (err4) {
					assert.ok(err4 === null);
					console.log('Created a file with statistics for top called ' + fname_top);

					console.log("Top    smaller: " + JSON.stringify(top_smaller));
					console.log("Bottom smaller: " + JSON.stringify(bot_smaller));
					console.log("Ties          : " + JSON.stringify(top_bot_ties));

					callback(null);
				});
			});
		});
	});
}

/*****************************************************************************/

function sortNumber(a, b) {
  return a - b;
}

function calculate_network_statistics (some_sols) {
	var i;
	var min, max, avg, median, sum, current_number;
	var temp = [];
	assert.ok(some_sols.length === 45);
	sum = 0;
	for (i = 0; i < some_sols.length; i++) {
		current_number = parseInt(some_sols[i].num_concepts_raised);
		if (Number.isNaN(current_number)) {
			current_number = 1;
		}
		//console.log('i = ' + i + ', current_number: ' + current_number);
		sum += current_number;
		temp.push(current_number);
	}
	temp.sort(sortNumber);
	//console.log(temp);
	min = temp[0];
	max = temp[temp.length - 1];
	median = temp[Math.ceil(temp.length / 2) - 1]; // subtracting 1 because we start indexing from 0
	avg = sum / some_sols.length;

	return {'min': min, 'max': max, 'median': median, 'avg': avg, 'sum': sum};
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
			assert.ok(storage.base_info[the_base].base === the_base, 'the_base: ' + the_base);
			storage.base_info[the_base].content = JSON.parse(data_file);

			read_and_store_file_contents(rest_files, storage, function (deeper_error) {
				callback(deeper_error);
			});
		});
	}
}

/*****************************************************************************/
