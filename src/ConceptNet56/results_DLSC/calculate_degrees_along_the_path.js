/*****************************************************************************/
/*jshint esversion: 6 */
// jshint trailingcomma: false
// jshint undef:true
// jshint unused:true
/* jshint node:true */
/*****************************************************************************/

const fs        = require('fs');
const async     = require('async');
const assert    = require('assert-plus');
var MongoClient = require('mongodb').MongoClient;

/*****************************************************************************/

const collection_to_query = 'conceptnet56';

/*****************************************************************************/

const directory_with_results            = './each_base/';
const directory_with_degrees_on_results = './results_with_degrees/';
const NUM_BASES = 1000;

/*****************************************************************************/

const theProperties_no_s = ['start_no_s', 'start_a', 'start_n', 'start_r', 'start_v', 'end_no_s', 'end_a', 'end_n', 'end_r', 'end_v'];

const theProperties = theProperties_no_s;
if (theProperties.length === 10) {
	console.log(' * Working with properties corresponding to the case of NO MANIPULATION OF SERIAL S *');
} else {
	console.log(' * Working with properties corresponding to the case of MANIPULATION OF SERIAL S *');
}

/*****************************************************************************/


MongoClient.connect("mongodb://localhost:27017/", { useNewUrlParser: true }, function(init_err, db) {
	if (init_err) throw init_err;
	var dbo = db.db("conceptnet");

	my_worker(dbo, function (err) {
		if (err) throw err;
		//console.log("DONE");

		db.close();
	});
});

/*****************************************************************************/

function my_worker(db_object, callback) {
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

			var process_start  = process.hrtime();
			append_degrees_to_results(db_object, results, 0, process_start, function (err3) {
				if (err3) throw err3;

				/*
				console.log("\nWe will now generate the files with the content");
				write_results_to_files (results, 0, function (err4) {
					if (err4) throw err4;
					console.log("\nEverything computed successfully. Now returning.");
					callback(null);
				});*/
				console.log("\nDone!");
				callback(null);
			});
		});
	});
}

/*****************************************************************************/

function append_degrees_to_results (db_object, results, base_index, time_started, callback) {
	if (base_index === NUM_BASES) {
		callback(null);
	} else {
		if (results.base_info[base_index].content !== null) {
			var now_time = process.hrtime(time_started);
			var duration = [];
			duration.push(now_time[0]);
			duration.push(now_time[1] / 1000000);
			process.stdout.write("\r -- fetching degrees for paths found in base " + base_index + "   (time until now: " + get_time_elapsed_as_string(duration) + ")           ");
			// For each concept in the solution path we want to compute the degrees.
			// So, create a list of the paths for bottom and top respectively
			// and then subsequently compute the degrees for each one of these paths.
			var paths_bot = [], paths_top = [];
			var current_path, i, j;

			// iterate over the bottom pairs
			for (i = 0; i < results.base_info[base_index].content[0].length; i++) {
				current_path = [];
				for (j = 0; j < results.base_info[base_index].content[0][i].sol.path.length; j++) {
					current_path.push(results.base_info[base_index].content[0][i].sol.path[j]);
				}
				paths_bot.push(JSON.parse(JSON.stringify(current_path)));
			}

			// iterate over the top pairs
			for (i = 0; i < results.base_info[base_index].content[1].length; i++) {
				current_path = [];
				for (j = 0; j < results.base_info[base_index].content[1][i].sol.path.length; j++) {
					current_path.push(results.base_info[base_index].content[1][i].sol.path[j]);
				}
				paths_top.push(JSON.parse(JSON.stringify(current_path)));
			}

			// now exhaust recursively the two lists with paths and append the degrees that we find in the end results.
			fetch_degrees_for_top_and_bottom (db_object, results.base_info[base_index].content, paths_bot, paths_top, function (err1) {
				if (err1) throw err1;

				// Write the results to the file
				write_results_for_this_base_to_file(results, base_index, function (err2) {
					if (err2) throw err2;

					// Continue to the next base
					append_degrees_to_results(db_object, results, base_index+1, time_started, function (err3) {
						if (err3) throw err3;
						callback(null);
					});
				});
			});
		} else {
			append_degrees_to_results(db_object, results, base_index+1, time_started, function (err4) {
				if (err4) throw err4;
				callback(null);
			});
		}
	}
}

/*****************************************************************************/

function write_results_for_this_base_to_file (results, base_index, callback) {
	var target_filename = directory_with_degrees_on_results + 'base_' + base_index + ".json";

	assert.ok(results.base_info[base_index].content !== null);
	fs.writeFile(target_filename, JSON.stringify(results.base_info[base_index].content), 'utf8', function (write_error) {
		if (write_error) throw write_error;
		//process.stdout.write("\r * Successfully wrote file for base " + base_index);
		callback(null);
	});
}

/*****************************************************************************/

function fetch_degrees_for_top_and_bottom (db_object, content, paths_bot, paths_top, callback) {
	var current_path, rem_paths;
	var i, current_concept, num_neighbors, critical_index;
	var parallelCalls = {};
	var there_is_a_path_to_compute = false;
	var path_index = -1;

	if (paths_bot.length > 0) {
		// There is more bottom paths that we need to deal with 
		current_path = paths_bot[0];
		rem_paths    = paths_bot.slice(1);
		path_index   = 0;
		there_is_a_path_to_compute = true;
	} else if (paths_top.length > 0) {
		current_path = paths_top[0];
		rem_paths    = paths_top.slice(1);
		path_index   = 1;
		there_is_a_path_to_compute = true;
	}

	if (there_is_a_path_to_compute) {
		for (i = 0; i < current_path.length; i++) {
			current_concept = current_path[i];
			parallelCalls[current_concept] = get_num_neighbors_extended_version.bind(null, db_object, current_concept);
		}

		async.parallel(parallelCalls, function (perr, pres) {
			assert.ok(perr === null);

			//console.log(pres);

			for (i = 0; i < content[path_index].length; i++) {
				if (content[path_index][i].sol.hasOwnProperty('degrees') === false) {
					// this is the index that we are looking for
					critical_index = i;
					break;
				}
			}

			content[path_index][critical_index].sol.degrees = [];
			for (i = 0; i < current_path.length; i++) {
				current_concept = current_path[i];
				num_neighbors   = pres[current_concept];
				content[path_index][critical_index].sol.degrees.push(num_neighbors);
			}

			if (path_index === 0) {
				fetch_degrees_for_top_and_bottom(db_object, content, rem_paths, paths_top, function (err1) {
					if (err1) throw err1;
					callback(null);
				});
			} else {
				assert.ok(path_index === 1);
				fetch_degrees_for_top_and_bottom(db_object, content, [], rem_paths, function (err1) {
					if (err1) throw err1;
					callback(null);
				});
			}
		});
	} else {
		// computed everything; return
		callback(null);
	}
}

/*****************************************************************************/

function get_num_neighbors_extended_version (db_object, concept, callback) {
	assert.ok(concept !== 's');

	assert.ok(theProperties.length === 10); // failsafe to know what we are doing

	/*
	 * Words that have arisen due to the microsoft graph never end in:
	 * '/a', '/r', '/v', '/n'
	 * but nevertheless we may want to activate such concepts from other iterations of spreading activation
	 */
	var current_concept = standardize_concept (concept);
	assert.ok(current_concept === concept);

	var parallelCalls = {
		'start_no_s'             : get_neighbors.bind(null, db_object, {'start': current_concept}),
		'start_a'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/a'}),
		'start_n'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/n'}),
		'start_r'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/r'}),
		'start_v'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/v'}),
/*
		'start_append_s_vanilla' : get_neighbors.bind(null, db_object, {'start': current_concept + 's'}),
		'start_append_s_a'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/a'}),
		'start_append_s_n'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/n'}),
		'start_append_s_r'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/r'}),
		'start_append_s_v'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/v'}),
*/
		'end_no_s'               : get_neighbors.bind(null, db_object, {'end': current_concept}),
		'end_a'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/a'}),
		'end_n'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/n'}),
		'end_r'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/r'}),
		'end_v'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/v'})
/*
		'end_append_s_vanilla'   : get_neighbors.bind(null, db_object, {'end': current_concept + 's'}),
		'end_append_s_a'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/a'}),
		'end_append_s_n'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/n'}),
		'end_append_s_r'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/r'}),
		'end_append_s_v'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/v'}),
*/
	};

	async.parallel(parallelCalls, function (perr, pres) {
		assert.ok(perr === null);

		// add everything up
		var sum = 0;
		sum += pres.start_no_s.length + pres.start_a.length + pres.start_r.length + pres.start_v.length + pres.start_n.length;
		sum += pres.end_no_s.length   + pres.end_a.length   + pres.end_r.length   + pres.end_v.length   + pres.end_n.length;

		callback(null, sum);
	});
}

/*****************************************************************************/

function get_neighbors (db_object, theQuery, callback) {
	//console.log('the query is: ' + JSON.stringify(theQuery) );
	db_object.collection(collection_to_query).find(theQuery).toArray(function (err, result) {
		assert.ok(err === null);
		return callback(null, result);
	});
}

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function standardize_concept (aConcept) {
	assert.ok(theProperties.length === 10); // failsafe

	return normalize_concept_ignore_serial_s(aConcept);
}

/*****************************************************************************/

function normalize_concept_ignore_serial_s (aConcept) {
	assert.ok(aConcept.length > 0, 'empty string did not pass: ' + aConcept);

	var temp_concept = "";
	if (aConcept[0] === "/") { temp_concept = aConcept; }
	else { /* prepend with /c/en */ temp_concept = "/c/en/" + aConcept; }

	var i, count_slashes = 0;
	for (i = 0; i < temp_concept.length; i++) {
		if (temp_concept[i] === '/')
			count_slashes++;
	}

	var temp_concept2 = "";
	if (count_slashes > 3) {
		// Only now it makes sense to remove a potential suffix such as `/a`, '/r', '/n', '/v'
		// exceptions:
		// -- '/a': no exceptions (should be ok ...)
		// -- '/r': no exceptions
		// -- '/n': no exceptions (c/n and s/n are weird but I leave them as they are)
		// -- '/v': no exceptions (leaving r/v)
		temp_concept2 = get_concept_without_suffix(temp_concept);
	} else {
		temp_concept2 = temp_concept;
	}

	return temp_concept2;
}

/*****************************************************************************/

function get_concept_without_suffix (aConcept) {
	if (aConcept.length < 2) 
		return aConcept;

	var size = aConcept.length;
	if (((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'a')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'n')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'r')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'v'))) {
		// ends in one of the above cases; remove that suffix
		var i;
		var simple_concept = "";
		for (i = 0; i < size - 2; i++)
			simple_concept += aConcept[i];
		return simple_concept;
	} else { 
		return aConcept;
	}
}

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function sortNumber(a, b) {
  return a - b;
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

function write_results_to_files(results, base_index, callback) {
	if (base_index === NUM_BASES) {
		callback(null);
	} else if (results.base_info[base_index].content === null) {
		write_results_to_files(results, base_index+1, function (err1) {
			if (err1) throw err1;
			callback(null);
		});		
	} else {
		var target_filename = directory_with_degrees_on_results + 'base_' + base_index + ".json";
		if (results.base_info[base_index].content !== null) {
			fs.writeFile(target_filename, JSON.stringify(results.base_info[base_index].content), 'utf8', function (write_error) {
				if (write_error) throw write_error;
				process.stdout.write("\r * Successfully wrote file for base " + base_index);

				write_results_to_files(results, base_index+1, function (err2) {
					if (err2) throw err2;
					callback(null);
				});
			});
		}
	}
}

/*****************************************************************************/
