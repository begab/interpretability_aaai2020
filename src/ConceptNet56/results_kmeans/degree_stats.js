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

//const collection_to_query = 'conceptnet56';

/*****************************************************************************/

//const directory_with_results            = './each_base/';
const directory_with_degrees_on_results = './results_with_degrees/';
const NUM_BASES = 1000;

const fname_with_stats = './stats_from_degrees.txt';

/*****************************************************************************/

const theProperties_no_s = ['start_no_s', 'start_a', 'start_n', 'start_r', 'start_v', 'end_no_s', 'end_a', 'end_n', 'end_r', 'end_v'];

const theProperties = theProperties_no_s;
if (theProperties.length === 10) {
	console.log(' * Working with properties corresponding to the case of NO MANIPULATION OF SERIAL S *');
} else {
	console.log(' * Working with properties corresponding to the case of MANIPULATION OF SERIAL S *');
}

/*****************************************************************************/


my_worker(function (err) {
	if (err) throw err;
	console.log("DONE");
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

	fs.readdir(directory_with_degrees_on_results, function (err, files) {
		if (err) throw err;
		//console.log(files.length);
		//console.log(files);
		read_and_store_file_contents(files, results, function (err2) {
			if (err2) throw err2;
			//console.log(JSON.stringify(results.base_info[1].content));

			compute_stats_recursively (results, 0, "", function (err3, file_contents) {
				if (err3) throw err3;

				write_stats_to_file(file_contents, function (err4) {
					if (err4) throw err4;

					var lines = file_contents.split("\n");
					var data  = [];
					for (i = 0; i < lines.length - 1; i++) {
						data.push(JSON.parse(lines[i]));
					}
					//console.log(data);

					var top_max_less = 0;
					var bot_max_less = 0;
					var max_ties     = 0;
					var top_max_array = [];
					var bot_max_array = [];

					var top_avg_less = 0;
					var bot_avg_less = 0;
					var avg_ties     = 0;
					var top_var_less = 0;
					var bot_var_less = 0;
					var var_ties     = 0;
					var top_avg_array = [];
					var bot_avg_array = [];
					for (i = 0; i < data.length; i++) {
						top_avg_array.push(parseFloat(data[i].top.avg));
						bot_avg_array.push(parseFloat(data[i].bot.avg));

						top_max_array.push(parseFloat(data[i].top.max));
						bot_max_array.push(parseFloat(data[i].bot.max));

						if (parseFloat(data[i].top.avg) < parseFloat(data[i].bot.avg)) {
							top_avg_less += 1;
						} else if (parseFloat(data[i].top.avg) > parseFloat(data[i].bot.avg)) {
							bot_avg_less += 1;
						} else { 
							avg_ties += 1;
						}

						if (parseFloat(data[i].top.var) < parseFloat(data[i].bot.var)) {
							top_var_less += 1;
						} else if (parseFloat(data[i].top.var) > parseFloat(data[i].bot.var)) {
							bot_var_less += 1;
						} else { 
							var_ties += 1;
						}

						if (parseFloat(data[i].top.max) < parseFloat(data[i].bot.max)) {
							top_max_less += 1;
						} else if (parseFloat(data[i].top.max) > parseFloat(data[i].bot.max)) {
							bot_max_less += 1;
						} else { 
							max_ties += 1;
						}
					}
					console.log("top avg less: " + top_avg_less + ", bot avg less: " + bot_avg_less + ", ties avg: " + avg_ties);
					console.log("top var less: " + top_var_less + ", bot var less: " + bot_var_less + ", ties var: " + var_ties);
					console.log("top max less: " + top_max_less + ", bot max less: " + bot_max_less + ", ties max: " + max_ties);

					var the_stats_avg_top = calculate_stats_for_given_sequence(top_avg_array);
					var the_stats_avg_bot = calculate_stats_for_given_sequence(bot_avg_array);

					console.log(the_stats_avg_top);
					console.log(the_stats_avg_bot);
					//console.log(top_avg_array);

					callback(null);
				});
			});			
		});
	});
}

/*****************************************************************************/

function calculate_stats_for_given_sequence (seq) {
	assert.ok(seq.length > 1);
	var i; 
	var sum = 0;
	var sum_of_squares = 0;
	for (i = 0; i < seq.length; i++) {
		sum += seq[i];
		sum_of_squares += seq[i] * seq[i];
	}
	var avg = sum / (1.0 * seq.length);
	var the_var = 0.0;
	if (seq.length > 1) {
		the_var = sum_of_squares / (seq.length - 1) - avg * avg; 
	}

	var response = {
		'mean': (avg).toFixed(1),
		'var' : (the_var).toFixed(3)
	};
	return response;
}

/*****************************************************************************/

function write_stats_to_file (file_contents, callback) {
	fs.writeFile(fname_with_stats, file_contents, 'utf8', function (write_error) {
		if (write_error) throw write_error;
		callback(null);
	});
}

/*****************************************************************************/

function compute_stats_recursively (results, base_index, generated_data, callback) {
	if (base_index === NUM_BASES) {
		callback(null, generated_data);
	} else {
		if (results.base_info[base_index].content !== null) {
			var current_base_results  = calculate_stats_for_specific_base(results, base_index);
			generated_data           += JSON.stringify(current_base_results, null, 0) + "\n";
		}
		compute_stats_recursively (results, base_index+1, generated_data, function (deeper_error, data) {
			if (deeper_error) throw deeper_error;
			callback(null, data);
		});
	}
}

/*****************************************************************************/

function calculate_stats_for_specific_base (results, base_index) {
	var i, j, sum, sum_of_squares, degrees_bot, degrees_top, size;
	var bot_elems = 0, top_elems = 0;
	var bot_avg_deg, top_avg_deg;
	var bot_variance, top_variance;
	var max_bot, max_top;

	/*
	 * First iterate over the bottom pairs
	 */
	sum = 0;
	sum_of_squares = 0;
	max_bot = 0;
	for (i = 0; i < results.base_info[base_index].content[0].length; i++) {
		degrees_bot = results.base_info[base_index].content[0][i].sol.degrees;
		size        = degrees_bot.length;
		for (j = 1; j < size - 1; j++) {
			// we ignore the first and last concept in the sequence
			// we only care about connecting concepts
			sum            += degrees_bot[j];
			sum_of_squares += degrees_bot[j] * degrees_bot[j];
			bot_elems      += 1;
			if (degrees_bot[j] > max_bot) {
				max_bot = degrees_bot[j];
			}
		}
	}
	//console.log(bot_elems);
	if (bot_elems > 0) {
		bot_avg_deg  = sum / (1.0 * bot_elems);
		if (bot_elems === 1) 
			bot_variance = 0.0;
		else
			bot_variance = sum_of_squares / (bot_elems - 1) - bot_avg_deg * bot_avg_deg;
	} else {
		bot_avg_deg  = 0.0; // all were paths of length 1 or less
		bot_variance = 0.0;
	}

	
	/*
	 * Now iterate over the top pairs
	 */
	sum = 0;
	sum_of_squares = 0;
	max_top = 0;
	for (i = 0; i < results.base_info[base_index].content[1].length; i++) {
		degrees_top = results.base_info[base_index].content[1][i].sol.degrees;
		size        = degrees_top.length;
		for (j = 1; j < size - 1; j++) {
			// we ignore the first and last concept in the sequence
			// we only care about connecting concepts
			sum            += degrees_top[j];
			sum_of_squares += degrees_top[j] * degrees_top[j];
			top_elems      += 1;
			if (degrees_top[j] > max_top) {
				max_top = degrees_top[j];
			}
		}
	}
	//console.log(top_elems);
	if (top_elems > 0) {
		top_avg_deg  = sum / (1.0 * top_elems);
		if (top_elems === 1) {
			top_variance = 0.0;
		} else {
			top_variance = sum_of_squares / (top_elems - 1) - top_avg_deg * top_avg_deg;
		}
	} else {
		top_avg_deg  = 0.0; // all were paths of length 1 or less
		top_variance = 0.0;
	}

	var answer = {
		'base': base_index,
		'top': {
			'avg': (top_avg_deg).toFixed(1),
			'var': (top_variance).toFixed(1),
			'max': (max_top).toFixed(1)
		},
		'bot': {
			'avg': (bot_avg_deg).toFixed(1),
			'var': (bot_variance).toFixed(1),
			'max': (max_bot).toFixed(1)
		},
		'ratio': {
			'avg': (bot_avg_deg / (1.0 * top_avg_deg)).toFixed(3),
			'var' : (bot_variance / (1.0 * top_variance)).toFixed(3)
		}
	};
	//console.log(answer);

	return JSON.parse(JSON.stringify(answer));
}

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function read_and_store_file_contents (list_of_files, storage, callback) {
	var current_file;
	var rest_files;

	if (list_of_files.length === 0) {
		callback(null);
	} else {
		current_file = list_of_files[0];
		rest_files   = list_of_files.slice(1);

		fs.readFile(directory_with_degrees_on_results + current_file, {encoding: 'utf8', flag: 'r'}, function (err_file, data_file) {
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

function get_time_elapsed_as_string (hrquantity) {
	var the_minutes, hours, rem_secs;

	var the_msecs = Math.round(hrquantity[1] / 1000000);
	var the_secs  = hrquantity[0];

	if (the_secs < 1) {
		if (the_msecs >= 1) return '' + the_msecs + ' msecs';
		else 				return '' + Number(hrquantity[1]).toFixed(1) + ' nanosecs';
	}
	else {
		if (the_msecs >= 500) {
			the_secs++; // round up to the next second if necessary
		}

		if (the_secs < 60) {
			return '' + the_secs + ' secs';
		}
		else {
			the_minutes = Math.trunc(the_secs / 60);
			if (the_minutes < 60) {
				rem_secs = the_secs - the_minutes * 60;
				return '' + the_minutes + ' minutes ' + rem_secs + ' secs';
			} else {
				hours       = Math.trunc(the_secs / 3600);
				rem_secs    = the_secs - hours * 3600;
				the_minutes = Math.trunc( rem_secs / 60 );
				rem_secs    = rem_secs - the_minutes * 60;
				return '' + hours + ' hour(s) ' + the_minutes + ' minutes ' + rem_secs + ' secs';
			}
		}
	}
}

/*****************************************************************************/
